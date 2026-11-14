from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context, require_roles
from app.db.session import get_db
from app.models import ConversationFlow
from app.schemas.flow import FlowUpdate

router = APIRouter(prefix="/flows", tags=["flows"])
Db = Annotated[Session, Depends(get_db)]
UserContext = Annotated[AuthContext, Depends(get_current_context)]
Admin = Annotated[AuthContext, Depends(require_roles("owner", "admin"))]


def current_flow(db: Session, context: AuthContext) -> ConversationFlow | None:
    return db.scalar(
        select(ConversationFlow)
        .where(ConversationFlow.organization_id == context.organization.id)
        .order_by(ConversationFlow.version.desc())
    )


@router.get("/current")
def get_current_flow(context: UserContext, db: Db) -> dict:
    flow = current_flow(db, context)
    if not flow:
        return {"version": 1, "flow": None}
    return {"version": flow.version, "flow": flow.flow_json, "updated_at": flow.updated_at}


@router.put("/current")
def save_current_flow(request: FlowUpdate, context: Admin, db: Db) -> dict:
    previous = current_flow(db, context)
    version = (previous.version + 1) if previous else request.flow.version
    flow = ConversationFlow(
        organization_id=context.organization.id,
        version=version,
        flow_json=request.flow.model_dump(),
    )
    db.add(flow)
    db.commit()
    db.refresh(flow)
    return {"version": flow.version, "flow": flow.flow_json, "updated_at": flow.updated_at}
