import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context
from app.db.session import get_db
from app.schemas.ticket import (
    TicketCommentCreate,
    TicketCommentResponse,
    TicketCreate,
    TicketResponse,
    TicketUpdate,
)
from app.services.tickets import (
    add_ticket_comment,
    create_ticket,
    get_tenant_ticket,
    list_tenant_tickets,
    list_ticket_comments,
    serialize_comment,
    serialize_ticket,
    update_ticket,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])
Db = Annotated[Session, Depends(get_db)]
UserContext = Annotated[AuthContext, Depends(get_current_context)]


@router.get("", response_model=list[TicketResponse])
def list_tickets(
    context: UserContext,
    db: Db,
    status: Annotated[str | None, Query()] = None,
    priority: Annotated[str | None, Query()] = None,
    team: Annotated[str | None, Query()] = None,
    assigned_to_user_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[TicketResponse]:
    tickets = list_tenant_tickets(
        db=db,
        org_id=context.organization.id,
        status_filter=status,
        priority_filter=priority,
        team_filter=team,
        assigned_user_id=assigned_to_user_id,
    )
    return [serialize_ticket(ticket) for ticket in tickets]


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket_route(
    payload: TicketCreate,
    context: UserContext,
    db: Db,
) -> TicketResponse:
    ticket = create_ticket(db=db, org_id=context.organization.id, payload=payload)
    return serialize_ticket(ticket)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_route(
    ticket_id: uuid.UUID,
    context: UserContext,
    db: Db,
) -> TicketResponse:
    ticket = get_tenant_ticket(db=db, org_id=context.organization.id, ticket_id=ticket_id)
    return serialize_ticket(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket_route(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    context: UserContext,
    db: Db,
) -> TicketResponse:
    ticket = update_ticket(db=db, org_id=context.organization.id, ticket_id=ticket_id, payload=payload)
    return serialize_ticket(ticket)


@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment_route(
    ticket_id: uuid.UUID,
    payload: TicketCommentCreate,
    context: UserContext,
    db: Db,
) -> TicketCommentResponse:
    comment = add_ticket_comment(
        db=db,
        org_id=context.organization.id,
        ticket_id=ticket_id,
        user_id=context.user.id,
        payload=payload,
    )
    return serialize_comment(comment)


@router.get("/{ticket_id}/comments", response_model=list[TicketCommentResponse])
def list_comments_route(
    ticket_id: uuid.UUID,
    context: UserContext,
    db: Db,
) -> list[TicketCommentResponse]:
    comments = list_ticket_comments(db=db, org_id=context.organization.id, ticket_id=ticket_id)
    return [serialize_comment(c) for c in comments]
