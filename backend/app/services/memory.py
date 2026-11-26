"""Short-term conversation memory and human-review handoff helpers.

Memory is deterministic: the backend decides which earlier turns are used and
how a follow-up question is expanded for retrieval. The model only receives the
recent transcript as context for resolving references such as "it" or "that".
"""

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Message

HISTORY_TURNS = 6
HISTORY_CHARS = 500
TOPIC_CHARS = 300

FOLLOW_UP_TERMS = {
    "it", "its", "it's", "that", "this", "they", "them", "their", "those", "these",
    "there", "he", "she", "him", "his", "her", "also", "more", "else", "same",
    "another", "other", "one", "ones",
}
FOLLOW_UP_PREFIXES = ("what about", "how about", "and ", "also ", "tell me more", "more about")
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


def is_follow_up(text: str) -> bool:
    normalized = _normalize(text)
    words = re.findall(r"[a-z']+", normalized)
    if not words:
        return False
    if normalized.startswith(FOLLOW_UP_PREFIXES):
        return True
    if len(words) <= 4:
        return True
    return any(word in FOLLOW_UP_TERMS for word in words)


def search_query_for(text: str, last_topic: str | None) -> str:
    """Expand a follow-up question with the previous topic for retrieval."""
    if last_topic and is_follow_up(text):
        return f"{last_topic} {text}"
    return text


def is_affirmative(text: str) -> bool:
    return _normalize(text) in AFFIRMATIVE


def is_negative(text: str) -> bool:
    return _normalize(text) in NEGATIVE


def truncate_topic(text: str) -> str:
    return " ".join(text.split())[:TOPIC_CHARS]
