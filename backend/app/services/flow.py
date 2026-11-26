import re
from dataclasses import dataclass

from app.schemas.flow import FlowConfig


@dataclass(frozen=True)
class FlowDecision:
    intent: str
    answer: str | None = None
    next_state: str | None = None
    entities: dict[str, str] | None = None
    escalation: bool = False
    handled: bool = False


def extract_entities(text: str) -> dict[str, str]:
    match = re.search(
        r"(?:\border\s*(?:id)?\s*[:#-]?\s*)?(ORD[-\s]?\d{3,}|#\s*[A-Z0-9-]{4,})\b",
        text,
        re.IGNORECASE,
    )
    return {"order_id": match.group(1).upper()} if match else {}


def detect_global_intent(text: str) -> str | None:
    lowered = text.strip().lower()
    if lowered in {"restart", "start over", "reset"}:
        return "restart"
    if any(term in lowered for term in ("talk to a human", "talk to an agent", "support agent", "representative")):
        return "talk_to_agent"
    if lowered in {"help", "menu", "options"}:
        return "help"
    return None


def decide(
    flow: FlowConfig,
    current_state: str,
    text: str,
    known_entities: dict[str, str] | None = None,
) -> FlowDecision:
    # Entities remembered from earlier turns are used unless this message
    # supplies a new value (for example a different order ID).
    entities = {**(known_entities or {}), **extract_entities(text)}
    global_intent = detect_global_intent(text)
    if global_intent == "talk_to_agent":
        return FlowDecision(
            intent="talk_to_agent",
            answer="I’ll connect you with a support agent.",
            entities=entities,
            escalation=True,
            handled=True,
        )
    if global_intent == "restart":
        return FlowDecision(
            intent="restart",
            answer=flow.states[flow.initial_state].prompt,
            next_state=flow.initial_state,
            entities={},
            handled=True,
        )
    state = flow.states.get(current_state, flow.states[flow.initial_state])
    if global_intent == "help":
        options = ", ".join(f"{key}: {option.label}" for key, option in state.options.items())
        return FlowDecision(
            intent="help",
            answer=f"{state.prompt} Options: {options}",
            entities=entities,
            handled=True,
        )
    normalized = text.strip().lower()
    for key, option in state.options.items():
        if normalized == key.lower() or normalized == option.label.lower():
            next_prompt = flow.states[option.next_state].prompt
            return FlowDecision(
                intent="menu_selection",
                answer=next_prompt,
                next_state=option.next_state,
                entities=entities,
                handled=True,
            )
    if "order" in normalized and not entities:
        return FlowDecision(
            intent="order_status",
            answer="Please provide a valid order ID, for example ORD-1234.",
            entities=entities,
            handled=True,
        )
    if "order" in normalized and entities:
        return FlowDecision(
            intent="order_status",
            answer=f"I found order {entities['order_id']}. I’ll check the company knowledge for its status.",
            entities=entities,
        )
    return FlowDecision("knowledge_question", entities=entities)
