import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ticket import Ticket, TicketComment
from app.schemas.ticket import (
    TicketCommentCreate,
    TicketCommentResponse,
    TicketCreate,
    TicketResponse,
    TicketUpdate,
)


def serialize_ticket(ticket: Ticket) -> TicketResponse:
    return TicketResponse(
        id=str(ticket.id),
        organization_id=str(ticket.organization_id),
        conversation_id=str(ticket.conversation_id) if ticket.conversation_id else None,
        customer_email=ticket.customer_email,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        team=ticket.team,
        assigned_to_user_id=str(ticket.assigned_to_user_id) if ticket.assigned_to_user_id else None,
        metadata=ticket.metadata_json,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
    )


def serialize_comment(comment: TicketComment) -> TicketCommentResponse:
    return TicketCommentResponse(
        id=str(comment.id),
        ticket_id=str(comment.ticket_id),
        user_id=str(comment.user_id) if comment.user_id else None,
        content=comment.content,
        is_internal=comment.is_internal,
        created_at=comment.created_at,
    )


def get_tenant_ticket(db: Session, org_id: uuid.UUID, ticket_id: uuid.UUID) -> Ticket:
    ticket = db.scalar(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.organization_id == org_id,
        )
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def list_tenant_tickets(
    db: Session,
    org_id: uuid.UUID,
    status_filter: str | None = None,
    priority_filter: str | None = None,
    team_filter: str | None = None,
    assigned_user_id: uuid.UUID | None = None,
) -> list[Ticket]:
    query = select(Ticket).where(Ticket.organization_id == org_id)
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    if priority_filter:
        query = query.where(Ticket.priority == priority_filter)
    if team_filter:
        query = query.where(Ticket.team == team_filter)
    if assigned_user_id:
        query = query.where(Ticket.assigned_to_user_id == assigned_user_id)

    query = query.order_by(Ticket.created_at.desc())
    return list(db.scalars(query).all())


def create_ticket(db: Session, org_id: uuid.UUID, payload: TicketCreate) -> Ticket:
    ticket = Ticket(
        organization_id=org_id,
        conversation_id=payload.conversation_id,
        customer_email=payload.customer_email,
        title=payload.title,
        description=payload.description,
        status="open",
        priority=payload.priority,
        team=payload.team,
        metadata_json=payload.metadata,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def update_ticket(
    db: Session,
    org_id: uuid.UUID,
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
) -> Ticket:
    ticket = get_tenant_ticket(db, org_id, ticket_id)

    if payload.title is not None:
        ticket.title = payload.title
    if payload.description is not None:
        ticket.description = payload.description
    if payload.priority is not None:
        ticket.priority = payload.priority
    if payload.team is not None:
        ticket.team = payload.team
    if payload.assigned_to_user_id is not None:
        ticket.assigned_to_user_id = payload.assigned_to_user_id
    if payload.status is not None:
        ticket.status = payload.status
        if payload.status in {"resolved", "closed"} and not ticket.resolved_at:
            ticket.resolved_at = datetime.now(UTC)
        elif payload.status in {"open", "in_progress", "pending"}:
            ticket.resolved_at = None

    ticket.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(ticket)
    return ticket


def add_ticket_comment(
    db: Session,
    org_id: uuid.UUID,
    ticket_id: uuid.UUID,
    user_id: uuid.UUID | None,
    payload: TicketCommentCreate,
) -> TicketComment:
    # Ensure ticket exists for tenant
    get_tenant_ticket(db, org_id, ticket_id)

    comment = TicketComment(
        organization_id=org_id,
        ticket_id=ticket_id,
        user_id=user_id,
        content=payload.content,
        is_internal=payload.is_internal,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def list_ticket_comments(
    db: Session,
    org_id: uuid.UUID,
    ticket_id: uuid.UUID,
) -> list[TicketComment]:
    get_tenant_ticket(db, org_id, ticket_id)
    query = (
        select(TicketComment)
        .where(
            TicketComment.organization_id == org_id,
            TicketComment.ticket_id == ticket_id,
        )
        .order_by(TicketComment.created_at.asc())
    )
    return list(db.scalars(query).all())


def escalate_conversation_to_ticket(
    db: Session,
    org_id: uuid.UUID,
    conversation_id: uuid.UUID,
    title: str,
    reason: str,
    priority: str = "normal",
    team: str | None = None,
    metadata: dict | None = None,
) -> Ticket:
    """Creates a ticket from an escalated chat conversation if one is not already open."""
    existing = db.scalar(
        select(Ticket).where(
            Ticket.organization_id == org_id,
            Ticket.conversation_id == conversation_id,
            Ticket.status.in_(["open", "in_progress", "pending"]),
        )
    )
    if existing:
        return existing

    ticket = Ticket(
        organization_id=org_id,
        conversation_id=conversation_id,
        title=title,
        description=reason,
        status="open",
        priority=priority,
        team=team,
        metadata_json=metadata or {},
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
