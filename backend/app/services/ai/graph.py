"""The SupportFlow agent workflow as a LangGraph state graph.

Deterministic nodes (intent detection, business rules, ticket creation) always
run before any model call. The model is used in exactly two nodes:
`condense_question` (rewrite a follow-up into a standalone question) and
`generate` (grounded answer with structured output). It never chooses tools,
actions, permissions or the tenant.

Runtime dependencies (database session, auth context, conversation) are passed
through `config["configurable"]`, so the state only holds plain data.
"""

import logging
import uuid
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any, TypedDict

from langchain_core.documents import Document
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from sqlalchemy import select

from app.models import (
    CompanyRule,
    ConversationFlow,
    LLMUsage,
    Message,
    RuleExecutionLog,
    Ticket,
)
from app.schemas.flow import FlowConfig
from app.schemas.rules import RuleAction
from app.services.ai.chains import SupportChains
from app.services.ai.llm import HashEmbeddings, get_chat_model, get_embeddings
from app.services.ai.retriever import TenantHybridRetriever
from app.services.flow import FlowDecision, decide, detect_global_intent, extract_entities
from app.services.memory import format_history, is_affirmative, is_negative, recent_history
from app.services.rules import evaluate_conditions
from app.services.tickets import escalate_conversation_to_ticket

ACTIVE_TICKET_STATUSES = ("open", "in_progress", "pending")
MAX_CITATIONS = 3
NOT_FOUND_ANSWER = "I could not find enough company information to answer that safely."
PROVIDER_DOWN_ANSWER = (
    "The AI provider is not available right now. I found relevant "
    "company information, but a support agent should answer this."
)
HUMAN_REVIEW_OFFER = (
    "Would you like me to create a human review request so a support agent "
    'can follow up? Reply "yes" or "no".'
)
ESCALATING_ACTIONS = {"escalate", "require_approval", "route_to_team"}
logger = logging.getLogger("supportflow.ai")


class SupportState(TypedDict, total=False):
    message: str
    started_at: datetime
    memory: dict
    history: list[tuple[str, str]]
    intent: str
    entities: dict
    next_state: str
    flow_handled: bool
    flow_answer: str | None
    flow_escalation: bool
    matched_rule_id: str | None
    matched_action: RuleAction | None
    rule_trace: list[dict]
    standalone_question: str
    documents: list[Document]
    answer: str
    outcome: str
    model: str
    prompt_tokens: int | None
    completion_tokens: int | None
    fallback: bool
    escalation: bool
    action: str
    human_review_offered: bool
    ticket_id: uuid.UUID | None
    message_id: uuid.UUID


@lru_cache
def get_support_chains() -> SupportChains | None:
    llm = get_chat_model()
    return SupportChains(llm) if llm else None


def _deps(config: RunnableConfig) -> tuple[Any, Any, Any]:
    configurable = config["configurable"]
    return configurable["db"], configurable["context"], configurable["conversation"]


def _ticket_reference(ticket: Ticket) -> str:
    return f"#{str(ticket.id)[:8].upper()}"


# ---------------------------------------------------------------- nodes


def load_context(state: SupportState, config: RunnableConfig) -> dict:
    db, context, conversation = _deps(config)
    rows = recent_history(db, context.organization.id, conversation.id)
    return {
        "started_at": datetime.now(UTC).replace(tzinfo=None),
        "memory": dict(conversation.context_json or {}),
        "history": [("human" if row.role == "user" else "ai", row.content) for row in rows],
        "next_state": conversation.current_state,
        "entities": {},
        "rule_trace": [],
        "documents": [],
        "fallback": False,
        "escalation": False,
        "human_review_offered": False,
        "ticket_id": None,
        "model": "none",
    }


def review_reply(state: SupportState, config: RunnableConfig) -> dict:
    """Answer a pending human-review offer with yes/no, without any model call."""
    db, context, conversation = _deps(config)
    memory = dict(state["memory"])
    pending = memory.pop("pending_human_review")
    if not is_affirmative(state["message"]):
        return {
            "memory": memory,
            "intent": "human_review_declined",
            "action": "human_review_declined",
            "outcome": "human_review",
            "answer": "No problem, I won't create a review request. Is there anything else I can help with?",
        }
    question = str(pending.get("question") or "Customer question")
    rows = recent_history(db, context.organization.id, conversation.id)
    ticket = escalate_conversation_to_ticket(
        db=db,
        org_id=context.organization.id,
        conversation_id=conversation.id,
        title=f"Human review: {question[:180]}",
        reason=(
            "The assistant could not answer this question and the customer asked "
            f"for human review.\n\nQuestion: {question}\n\nRecent conversation:\n{format_history(rows)}"
        ),
        metadata={
            "source": "chat_human_review",
            "question": question,
            "reason": pending.get("reason"),
            "entities": memory.get("entities", {}),
        },
    )
    return {
        "memory": memory,
        "intent": "human_review_accepted",
        "action": "human_review_created",
        "outcome": "human_review",
        "escalation": True,
        "ticket_id": ticket.id,
        "answer": (
            f"Done. I created a human review request (ticket {_ticket_reference(ticket)}). "
            "A support agent will follow up on your question."
        ),
    }


def detect_intent(state: SupportState, config: RunnableConfig) -> dict:
    db, context, conversation = _deps(config)
    memory = dict(state["memory"])
    # Any message other than yes/no dismisses a pending offer.
    memory.pop("pending_human_review", None)
    remembered = {k: v for k, v in (memory.get("entities") or {}).items() if isinstance(v, str)}
    record = db.scalar(
        select(ConversationFlow)
        .where(ConversationFlow.organization_id == context.organization.id)
        .order_by(ConversationFlow.version.desc())
    )
    flow = FlowConfig.model_validate(record.flow_json) if record else None
    decision = decide(flow, conversation.current_state, state["message"], remembered) if flow else None
    if decision is None and detect_global_intent(state["message"]) == "talk_to_agent":
        # Human handoff works even when the tenant has not configured a flow.
        decision = FlowDecision(
            intent="talk_to_agent",
            answer="I’ll connect you with a support agent.",
            entities={**remembered, **extract_entities(state["message"])},
            escalation=True,
            handled=True,
        )
    if decision is None:
        return {
            "memory": memory,
            "intent": "knowledge_question",
            "entities": {**remembered, **extract_entities(state["message"])},
            "flow_handled": False,
            "flow_escalation": False,
        }
    return {
        "memory": memory,
        "intent": decision.intent,
        "entities": decision.entities or {},
        "next_state": decision.next_state or conversation.current_state,
        "flow_handled": decision.handled,
        "flow_answer": decision.answer,
        "flow_escalation": decision.escalation,
    }


def evaluate_rules(state: SupportState, config: RunnableConfig) -> dict:
    db, context, conversation = _deps(config)
    rule_context = {
        "message": state["message"],
        "intent": state["intent"],
        "entities": state["entities"],
        "conversation": {"state": conversation.current_state},
    }
    rules = db.scalars(
        select(CompanyRule)
        .where(CompanyRule.organization_id == context.organization.id, CompanyRule.enabled.is_(True))
        .order_by(CompanyRule.priority, CompanyRule.created_at)
    ).all()
    trace = []
    for rule in rules:
        matched, conditions = evaluate_conditions(rule.conditions_json, rule.logic, rule_context)
        trace.append({"rule_id": str(rule.id), "name": rule.name, "matched": matched, "conditions": conditions})
        db.add(
            RuleExecutionLog(
                organization_id=context.organization.id,
                conversation_id=conversation.id,
                rule_id=rule.id,
                matched=matched,
                result_json={"conditions": conditions},
            )
        )
        if matched:
            return {
                "rule_trace": trace,
                "matched_rule_id": str(rule.id),
                "matched_action": RuleAction.model_validate(rule.action_json),
            }
    return {"rule_trace": trace, "matched_rule_id": None, "matched_action": None}


def rule_action(state: SupportState) -> dict:
    action = state["matched_action"]
    default_messages = {
        "escalate": "This request has been escalated to a support agent.",
        "require_approval": "This request requires human approval before it can continue.",
        "route_to_team": f"This request has been routed to the {action.team or 'support'} team.",
        "auto_respond": "Your request was handled by a company rule.",
        "set_priority": f"Your request priority was set to {action.priority or 'normal'}.",
    }
    return {
        "answer": action.message or default_messages[action.type],
        "outcome": "rule",
        "action": action.type,
        "escalation": action.type in ESCALATING_ACTIONS,
    }


def flow_reply(state: SupportState) -> dict:
    escalation = bool(state.get("flow_escalation"))
    return {
        "answer": state.get("flow_answer") or "Please choose an available option.",
        "outcome": "flow",
        "action": "escalate" if escalation else "flow",
        "escalation": escalation,
    }


def escalate(state: SupportState, config: RunnableConfig) -> dict:
    db, context, conversation = _deps(config)
    action = state.get("matched_action")
    ticket = escalate_conversation_to_ticket(
        db=db,
        org_id=context.organization.id,
        conversation_id=conversation.id,
        title=f"Escalation: {state['intent'] or 'Customer Support Request'}",
        reason=f"Triggered by '{action.type if action else 'customer_request'}'. Message: {state['message']}",
        priority=action.priority if action and action.priority else "normal",
        team=action.team if action else None,
        metadata={"entities": state["entities"], "intent": state["intent"]},
    )
    return {"ticket_id": ticket.id}


async def condense_question(state: SupportState) -> dict:
    """Memory: rewrite a follow-up ("is it free?") into a standalone question."""
    question = state["message"]
    chains = get_support_chains()
    if not chains or not state["history"]:
        return {"standalone_question": question}
    try:
        rewritten = await chains.condense(question, state["history"])
    except Exception as exc:  # noqa: BLE001 - provider boundary, falls back safely
        logger.warning("condense_question failed, using original question: %r", exc)
        return {"standalone_question": question}
    # Guard against the model answering instead of rewriting.
    if len(rewritten) > max(300, 4 * len(question)):
        rewritten = question
    return {"standalone_question": rewritten}


async def retrieve(state: SupportState, config: RunnableConfig) -> dict:
    db, context, _conversation = _deps(config)
    query = state["standalone_question"]
    retriever = TenantHybridRetriever(
        db=db, organization_id=context.organization.id, embeddings=get_embeddings(), k=5, only_usable=True
    )
    try:
        documents = await retriever.ainvoke(query)
    except Exception as exc:  # noqa: BLE001 - provider boundary, falls back safely
        logger.warning("query embedding failed, using word search only: %r", exc)
        # Embedding API unavailable: fall back to word matching only.
        retriever.embeddings = HashEmbeddings()
        documents = await retriever.ainvoke(query)
    return {"documents": documents[:MAX_CITATIONS], "outcome": "fallback" if not documents else "retrieved"}


async def generate(state: SupportState, config: RunnableConfig) -> dict:
    _db, context, _conversation = _deps(config)
    chains = get_support_chains()
    if not chains:
        return {"outcome": "provider_fallback", "answer": PROVIDER_DOWN_ANSWER}
    documents = state["documents"]
    evidence = "\n\n".join(
        f"[Source {index}: {doc.metadata.get('source_filename', 'document')}"
        + (f", page {doc.metadata['page']}" if doc.metadata.get("page") else "")
        + f"] {doc.page_content}"
        for index, doc in enumerate(documents, start=1)
    )
    try:
        result = await chains.answer(
            company=context.organization.name,
            standalone_question=state["standalone_question"],
            evidence=evidence,
        )
    except Exception as exc:  # noqa: BLE001 - provider boundary, falls back safely
        logger.warning("generate failed, offering a human instead: %r", exc)
        return {"outcome": "provider_fallback", "answer": PROVIDER_DOWN_ANSWER}
    usage = {
        "model": result.model,
        "prompt_tokens": result.prompt_tokens,
        "completion_tokens": result.completion_tokens,
    }
    if not result.answer.answerable or not result.answer.answer.strip():
        return {**usage, "outcome": "no_answer", "answer": NOT_FOUND_ANSWER}
    used = [documents[i - 1] for i in result.answer.used_sources if 1 <= i <= len(documents)]
    return {
        **usage,
        "outcome": "success",
        "answer": result.answer.answer.strip(),
        "action": "answer",
        "documents": used or documents,
    }


def offer_human_review(state: SupportState, config: RunnableConfig) -> dict:
    db, context, conversation = _deps(config)
    answer = state.get("answer") or NOT_FOUND_ANSWER
    if state["outcome"] in {"fallback", "no_answer"}:
        answer = NOT_FOUND_ANSWER
    ticket = db.scalar(
        select(Ticket).where(
            Ticket.organization_id == context.organization.id,
            Ticket.conversation_id == conversation.id,
            Ticket.status.in_(ACTIVE_TICKET_STATUSES),
        )
    )
    update: dict = {"fallback": True, "action": "answer", "ticket_id": None}
    if ticket:
        update["answer"] = (
            f"{answer} Your human review request (ticket {_ticket_reference(ticket)}) is "
            "already open, and a support agent will follow up."
        )
        update["ticket_id"] = ticket.id
        return update
    memory = dict(state["memory"])
    memory["pending_human_review"] = {"question": state["message"][:1000], "reason": state["outcome"]}
    return {**update, "answer": f"{answer}\n\n{HUMAN_REVIEW_OFFER}", "memory": memory, "human_review_offered": True}


def persist(state: SupportState, config: RunnableConfig) -> dict:
    db, context, conversation = _deps(config)
    org_id = context.organization.id
    sources = [
        {
            "chunk_id": doc.metadata["chunk_id"],
            "document_id": doc.metadata["document_id"],
            "document_name": doc.metadata.get("source_filename", "document"),
            "excerpt": doc.metadata.get("excerpt", doc.page_content),
            "metadata": {k: v for k, v in doc.metadata.items() if k != "excerpt"},
        }
        for doc in state.get("documents", [])
    ]
    intent = state["intent"]
    db.add(
        Message(
            organization_id=org_id,
            conversation_id=conversation.id,
            role="user",
            content=state["message"],
            intent=intent,
            entities=state["entities"],
            created_at=state["started_at"],
        )
    )
    assistant = Message(
        organization_id=org_id,
        conversation_id=conversation.id,
        role="assistant",
        content=state["answer"],
        intent=intent,
        entities=state["entities"],
        created_at=datetime.now(UTC).replace(tzinfo=None),
        metadata_json={
            "sources": sources,
            "fallback": state["fallback"],
            "matched_rule": state.get("matched_rule_id"),
            "rule_trace": state["rule_trace"],
            "standalone_question": state.get("standalone_question"),
            "human_review_offered": state["human_review_offered"],
            "ticket_id": str(state["ticket_id"]) if state.get("ticket_id") else None,
            "workflow": "langgraph",
        },
    )
    db.add(assistant)
    db.add(
        LLMUsage(
            organization_id=org_id,
            conversation_id=conversation.id,
            provider="internal" if state["outcome"] in {"flow", "rule", "human_review"} else "gemini",
            model=state["model"],
            prompt_tokens=state.get("prompt_tokens"),
            completion_tokens=state.get("completion_tokens"),
            latency_ms=int((datetime.now(UTC).replace(tzinfo=None) - state["started_at"]).total_seconds() * 1000),
            outcome=state["outcome"],
            retrieval_ids=[source["chunk_id"] for source in sources],
        )
    )
    conversation.current_state = state["next_state"]
    conversation.context_json = {**state["memory"], "last_intent": intent, "entities": state["entities"]}
    db.commit()
    db.refresh(assistant)
    return {"message_id": assistant.id}


# ---------------------------------------------------------------- routing


def route_start(state: SupportState) -> str:
    pending = state["memory"].get("pending_human_review")
    if pending and (is_affirmative(state["message"]) or is_negative(state["message"])):
        return "review_reply"
    return "detect_intent"


def route_after_rules(state: SupportState) -> str:
    if state.get("matched_action"):
        return "rule_action"
    if state.get("flow_handled"):
        return "flow_reply"
    return "condense_question"


def route_escalation(state: SupportState) -> str:
    return "escalate" if state.get("escalation") else "persist"


def route_after_retrieve(state: SupportState) -> str:
    return "generate" if state["documents"] else "offer_human_review"


def route_after_generate(state: SupportState) -> str:
    return "persist" if state["outcome"] == "success" else "offer_human_review"


def build_support_graph():
    builder = StateGraph(SupportState)
    builder.add_node("load_context", load_context)
    builder.add_node("review_reply", review_reply)
    builder.add_node("detect_intent", detect_intent)
    builder.add_node("evaluate_rules", evaluate_rules)
    builder.add_node("rule_action", rule_action)
    builder.add_node("flow_reply", flow_reply)
    builder.add_node("escalate", escalate)
    builder.add_node("condense_question", condense_question)
    builder.add_node("retrieve", retrieve)
    builder.add_node("generate", generate)
    builder.add_node("offer_human_review", offer_human_review)
    builder.add_node("persist", persist)

    builder.add_edge(START, "load_context")
    builder.add_conditional_edges("load_context", route_start, ["review_reply", "detect_intent"])
    builder.add_edge("review_reply", "persist")
    builder.add_edge("detect_intent", "evaluate_rules")
    builder.add_conditional_edges(
        "evaluate_rules", route_after_rules, ["rule_action", "flow_reply", "condense_question"]
    )
    builder.add_conditional_edges("rule_action", route_escalation, ["escalate", "persist"])
    builder.add_conditional_edges("flow_reply", route_escalation, ["escalate", "persist"])
    builder.add_edge("escalate", "persist")
    builder.add_edge("condense_question", "retrieve")
    builder.add_conditional_edges("retrieve", route_after_retrieve, ["generate", "offer_human_review"])
    builder.add_conditional_edges("generate", route_after_generate, ["persist", "offer_human_review"])
    builder.add_edge("offer_human_review", "persist")
    builder.add_edge("persist", END)
    return builder.compile()


support_graph = build_support_graph()
