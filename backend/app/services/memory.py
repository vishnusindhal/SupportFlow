"""Short-term conversation memory and human-review handoff helpers.

The backend decides which earlier turns form the memory (the last few messages
of the tenant's conversation). The LangGraph workflow passes them to the
`condense_question` step, which rewrites follow-ups into standalone questions.
"""

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Message

HISTORY_TURNS = 6
HISTORY_CHARS = 500

AFFIRMATIVE = {
    "yes", "y", "yeah", "yep", "yup", "sure", "ok", "okay", "please", "yes please",
    "please do", "do it", "go ahead", "create it", "create ticket", "create a ticket",
    "yes create", "yes, please", "sure, please", "yes create it", "yes, create it",
}
NEGATIVE = {"no", "n", "nope", "nah", "no thanks", "no, thanks", "no thank you", "not now", "don't", "dont", "cancel"}


def recent_history(db: Session, organization_id: uuid.UUID, conversation_id: uuid.UUID) -> list[Message]:
    """Return the most recent messages, oldest first, scoped to the tenant."""
    rows = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.organization_id == organization_id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_TURNS)
    ).all()
    return list(reversed(rows))


def format_history(history: list[Message]) -> str:
    lines = []
    for message in history:
        speaker = "Customer" if message.role == "user" else "Assistant"
        content = " ".join(message.content.split())[:HISTORY_CHARS]
        lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def _normalize(text: str) -> str:
    return re.sub(r"[!.?\s]+$", "", " ".join(text.lower().split()))


def is_affirmative(text: str) -> bool:
    return _normalize(text) in AFFIRMATIVE


def is_negative(text: str) -> bool:
    return _normalize(text) in NEGATIVE
