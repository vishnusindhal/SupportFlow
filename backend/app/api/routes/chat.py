import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context, require_roles
from app.db.session import get_db
from app.models import Conversation, ConversationFlow, Message
from app.schemas.chat import ChatResponse, ConversationCreate, MessageCreate, SourceReference
from app.schemas.flow import FlowConfig
from app.services.ai.graph import support_graph

router = APIRouter(prefix="/chat", tags=["chat"])
Db = Annotated[Session, Depends(get_db)]
UserContext = Annotated[AuthContext, Depends(get_current_context)]
Admin = Annotated[AuthContext, Depends(require_roles("owner", "admin"))]


def conversation_for(db: Session, conversation_id: uuid.UUID, context: AuthContext) -> Conversation:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.organization_id == context.organization.id,
        )
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def initial_state_for(db: Session, context: AuthContext) -> str:
    record = db.scalar(
        select(ConversationFlow)
        .where(ConversationFlow.organization_id == context.organization.id)
        .order_by(ConversationFlow.version.desc())
    )
    return FlowConfig.model_validate(record.flow_json).initial_state if record else "start"


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(request: ConversationCreate, context: UserContext, db: Db) -> dict:
    conversation = Conversation(
        organization_id=context.organization.id,
        channel=request.channel,
        current_state=initial_state_for(db, context),
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return {"id": conversation.id, "channel": conversation.channel, "status": conversation.status}


@router.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: uuid.UUID, context: UserContext, db: Db) -> list[dict]:
    conversation_for(db, conversation_id, context)
    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.organization_id == context.organization.id)
        .order_by(Message.created_at)
    ).all()
    return [{"id": message.id, "role": message.role, "content": message.content} for message in messages]


async def respond(conversation_id: uuid.UUID, request: MessageCreate, context: AuthContext, db: Session) -> ChatResponse:
    """Run one customer message through the LangGraph support workflow."""
    # Tenant ownership is checked here, before the workflow starts.
    conversation = conversation_for(db, conversation_id, context)
    state = await support_graph.ainvoke(
        {"message": request.content},
        config={"configurable": {"db": db, "context": context, "conversation": conversation}},
    )
    sources = [
        SourceReference(
            chunk_id=doc.metadata["chunk_id"],
            document_id=doc.metadata["document_id"],
            document_name=doc.metadata.get("source_filename", "document"),
            excerpt=doc.metadata.get("excerpt", doc.page_content),
            metadata={k: v for k, v in doc.metadata.items() if k != "excerpt"},
        )
        for doc in state.get("documents", [])
    ]
    action = state.get("matched_action")
    return ChatResponse(
        conversation_id=conversation_id,
        message_id=state["message_id"],
        answer=state["answer"],
        sources=sources,
        fallback=state["fallback"] or state["outcome"] in {"fallback", "provider_fallback", "no_answer"},
        escalation_offered=bool(
            state.get("flow_escalation")
            or (action and action.type in {"escalate", "require_approval"})
            or state["outcome"] == "human_review" and state.get("ticket_id") is not None
        ),
        intent=state["intent"],
        current_state=state["next_state"],
        action=state.get("action", "answer"),
        human_review_offered=state["human_review_offered"],
        ticket_id=state.get("ticket_id"),
        rule_name=state.get("matched_rule_name"),
    )


@router.post("/conversations/{conversation_id}/messages", response_model=ChatResponse)
async def send_message(conversation_id: uuid.UUID, request: MessageCreate, context: UserContext, db: Db):
    return await respond(conversation_id, request, context, db)


@router.post("/preview", response_model=ChatResponse)
async def preview(request: MessageCreate, context: Admin, db: Db):
    conversation = Conversation(
        organization_id=context.organization.id,
        channel="admin_preview",
        current_state=initial_state_for(db, context),
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return await respond(conversation.id, request, context, db)
