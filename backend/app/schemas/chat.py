import uuid
from typing import Literal

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    channel: Literal["admin_preview", "widget"] = "admin_preview"


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class SourceReference(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    excerpt: str
    metadata: dict


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    answer: str
    sources: list[SourceReference]
    fallback: bool
    escalation_offered: bool
    intent: str | None = None
    current_state: str = "start"
    action: str | None = None
    human_review_offered: bool = False
    ticket_id: uuid.UUID | None = None
    rule_name: str | None = None
