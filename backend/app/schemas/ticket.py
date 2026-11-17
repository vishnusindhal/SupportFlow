import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TicketStatus = Literal["open", "in_progress", "pending", "resolved", "closed"]
TicketPriority = Literal["low", "normal", "high", "urgent"]


class TicketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=10000)
    priority: TicketPriority = "normal"
    team: str | None = Field(default=None, max_length=80)
    conversation_id: uuid.UUID | None = None
    customer_email: str | None = Field(default=None, max_length=255)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TicketUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    team: str | None = Field(default=None, max_length=80)
    assigned_to_user_id: uuid.UUID | None = None


class TicketResponse(BaseModel):
    id: str
    organization_id: str
    conversation_id: str | None = None
    customer_email: str | None = None
    title: str
    description: str
    status: str
    priority: str
    team: str | None = None
    assigned_to_user_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None


class TicketCommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=5000)
    is_internal: bool = False


class TicketCommentResponse(BaseModel):
    id: str
    ticket_id: str
    user_id: str | None = None
    content: str
    is_internal: bool
    created_at: datetime
