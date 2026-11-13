import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context, require_roles
from app.db.session import get_db
from app.models.membership import Role
from app.schemas.onboarding import (
    CompanyProfileRequest,
    CompleteOnboardingRequest,
    ConfigurationResponse,
    OnboardingStatus,
    TemplateResponse,
    TemplateSummary,
)
from app.services.onboarding import (
    complete_onboarding,
    get_active_templates,
    get_template,
    onboarding_status,
    save_profile,
)

router = APIRouter(tags=["onboarding"])


def configuration_response(row) -> dict:
    return {
        "id": row.id,
        "organization_id": row.organization_id,
        "template_id": row.template_id,
        "template_version": row.template_version,
        "company_profile": row.company_profile_json,
        "config": row.config_snapshot_json,
        "updated_at": row.updated_at,
    }


@router.get("/templates", response_model=list[TemplateSummary])
def list_templates(db: Annotated[Session, Depends(get_db)]):
    return get_active_templates(db)


@router.get("/templates/{template_id}", response_model=TemplateResponse)
def template_detail(template_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]):
    template = get_template(db, template_id)
    return {**template.__dict__, "config": template.config_json}


@router.get("/onboarding/status", response_model=OnboardingStatus)
def onboarding_status_route(
    context: Annotated[AuthContext, Depends(get_current_context)],
    db: Annotated[Session, Depends(get_db)],
):
    return onboarding_status(db, context.organization.id)


@router.put("/onboarding/profile")
def profile_route(
    profile: CompanyProfileRequest,
    context: Annotated[AuthContext, Depends(require_roles(Role.owner, Role.admin))],
    db: Annotated[Session, Depends(get_db)],
):
    return {"profile": save_profile(db, context.organization.id, profile)}


@router.post("/onboarding/complete", response_model=ConfigurationResponse, status_code=201)
def complete_route(
    request: CompleteOnboardingRequest,
    context: Annotated[AuthContext, Depends(require_roles(Role.owner, Role.admin))],
    db: Annotated[Session, Depends(get_db)],
):
    return configuration_response(complete_onboarding(db, context.organization.id, request.template_id))


@router.get("/configuration/current", response_model=ConfigurationResponse)
def current_configuration(
    context: Annotated[AuthContext, Depends(get_current_context)],
    db: Annotated[Session, Depends(get_db)],
):
    from sqlalchemy import select

    from app.models import CompanyConfig

    row = db.scalar(select(CompanyConfig).where(CompanyConfig.organization_id == context.organization.id))
    if not row:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding is not complete")
    return configuration_response(row)
