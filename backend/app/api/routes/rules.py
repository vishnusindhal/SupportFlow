import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context, require_roles
from app.db.session import get_db
from app.models import CompanyRule
from app.schemas.rules import RuleEvaluation, RuleInput, RuleOptions, RuleResponse, RuleTestRequest
from app.services.flow import SUPPORTED_INTENTS
from app.services.rules import evaluate_conditions

router = APIRouter(prefix="/rules", tags=["rules"])
Db = Annotated[Session, Depends(get_db)]
UserContext = Annotated[AuthContext, Depends(get_current_context)]
Admin = Annotated[AuthContext, Depends(require_roles("owner", "admin"))]


def rule_response(rule: CompanyRule) -> RuleResponse:
    return RuleResponse(
        id=str(rule.id),
        organization_id=str(rule.organization_id),
        name=rule.name,
        conditions=rule.conditions_json,
        logic=rule.logic,
        action=rule.action_json,
        priority=rule.priority,
        enabled=rule.enabled,
    )


def tenant_rule(db: Session, rule_id: uuid.UUID, context: AuthContext) -> CompanyRule:
    rule = db.scalar(
        select(CompanyRule).where(
            CompanyRule.id == rule_id,
            CompanyRule.organization_id == context.organization.id,
        )
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


def evaluate_rule_set(
    rules: list[CompanyRule], context: dict
) -> tuple[RuleEvaluation, list[dict]]:
    trace: list[dict] = []
    for rule in rules:
        matched, conditions = evaluate_conditions(rule.conditions_json, rule.logic, context)
        trace.append({"rule_id": str(rule.id), "name": rule.name, "matched": matched, "conditions": conditions})
        if matched:
            return (
                RuleEvaluation(
                    matched=True,
                    rule_id=str(rule.id),
                    rule_name=rule.name,
                    action=rule.action_json,
                    trace=trace,
                ),
                trace,
            )
    return RuleEvaluation(matched=False, trace=trace), trace


@router.get("/options", response_model=RuleOptions)
def rule_options(context: UserContext) -> RuleOptions:
    """Fields and intents a chat rule can match, for the rules form."""
    return RuleOptions(
        fields=["intent", "message", "entities.order_id", "conversation.state"],
        intents=SUPPORTED_INTENTS,
    )


@router.get("", response_model=list[RuleResponse])
def list_rules(context: UserContext, db: Db) -> list[RuleResponse]:
    rules = db.scalars(
        select(CompanyRule)
        .where(CompanyRule.organization_id == context.organization.id)
        .order_by(CompanyRule.priority, CompanyRule.created_at)
    ).all()
    return [rule_response(rule) for rule in rules]


@router.post("", response_model=RuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(request: RuleInput, context: Admin, db: Db) -> RuleResponse:
    rule = CompanyRule(
        organization_id=context.organization.id,
        name=request.name,
        conditions_json=[condition.model_dump() for condition in request.conditions],
        logic=request.logic,
        action_json=request.action.model_dump(),
        priority=request.priority,
        enabled=request.enabled,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule_response(rule)


@router.patch("/{rule_id}", response_model=RuleResponse)
def update_rule(rule_id: uuid.UUID, request: RuleInput, context: Admin, db: Db) -> RuleResponse:
    rule = tenant_rule(db, rule_id, context)
    rule.name = request.name
    rule.conditions_json = [condition.model_dump() for condition in request.conditions]
    rule.logic = request.logic
    rule.action_json = request.action.model_dump()
    rule.priority = request.priority
    rule.enabled = request.enabled
    db.commit()
    db.refresh(rule)
    return rule_response(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def disable_rule(rule_id: uuid.UUID, context: Admin, db: Db) -> None:
    rule = tenant_rule(db, rule_id, context)
    rule.enabled = False
    db.commit()


@router.post("/test", response_model=RuleEvaluation)
def test_rules(request: RuleTestRequest, context: Admin, db: Db) -> RuleEvaluation:
    rules = db.scalars(
        select(CompanyRule)
        .where(CompanyRule.organization_id == context.organization.id, CompanyRule.enabled.is_(True))
        .order_by(CompanyRule.priority, CompanyRule.created_at)
    ).all()
    evaluation, _ = evaluate_rule_set(rules, request.context)
    return evaluation
