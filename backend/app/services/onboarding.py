import copy
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CompanyConfig, IndustryTemplate
from app.schemas.onboarding import CompanyProfileRequest

REQUIRED_CONFIG_KEYS = {"schema_version", "intents", "entities", "default_rules", "faqs", "menu", "assistant"}


def validate_template_config(config: dict) -> dict:
    if not REQUIRED_CONFIG_KEYS.issubset(config):
        raise ValueError("Template configuration is missing required sections")
    if not isinstance(config["intents"], list) or not config["intents"]:
        raise ValueError("Template intents must be a non-empty list")
    if not isinstance(config["faqs"], list):
        raise TypeError("Template FAQs must be a list")
    if not isinstance(config["menu"], dict) or not isinstance(config["assistant"], dict):
        raise TypeError("Template menu and assistant settings must be objects")
    return config


def get_active_templates(db: Session) -> list[IndustryTemplate]:
    return list(
        db.scalars(
            select(IndustryTemplate)
            .where(IndustryTemplate.is_active.is_(True))
            .order_by(IndustryTemplate.industry_key, IndustryTemplate.version.desc())
        )
    )


def get_template(db: Session, template_id: uuid.UUID) -> IndustryTemplate:
    template = db.get(IndustryTemplate, template_id)
    if not template or not template.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


def save_profile(db: Session, organization_id: uuid.UUID, profile: CompanyProfileRequest) -> dict:
    config = db.scalar(select(CompanyConfig).where(CompanyConfig.organization_id == organization_id))
    values = profile.model_dump()
    if config:
        config.company_profile_json = values
    else:
        organization = db.get(__import__("app.models", fromlist=["Organization"]).Organization, organization_id)
        if organization:
            organization.name = values["company_name"]
    db.commit()
    return values


def onboarding_status(db: Session, organization_id: uuid.UUID) -> dict:
    config = db.scalar(select(CompanyConfig).where(CompanyConfig.organization_id == organization_id))
    profile = config.company_profile_json if config else None
    current_version = config.template_version if config else None
    newer = False
    if config:
        newer = bool(
            db.scalar(
                select(func.count())
                .select_from(IndustryTemplate)
                .where(
                    IndustryTemplate.industry_key == "ecommerce",
                    IndustryTemplate.version > config.template_version,
                    IndustryTemplate.is_active.is_(True),
                )
            )
        )
    return {
        "completed": config is not None,
        "profile": profile,
        "current_template_version": current_version,
        "newer_template_available": newer,
    }


def complete_onboarding(
    db: Session, organization_id: uuid.UUID, template_id: uuid.UUID
) -> CompanyConfig:
    existing = db.scalar(select(CompanyConfig).where(CompanyConfig.organization_id == organization_id))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Onboarding is already complete")
    template = get_template(db, template_id)
    try:
        config = validate_template_config(template.config_json)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    row = CompanyConfig(
        organization_id=organization_id,
        template_id=template.id,
        template_version=template.version,
        config_snapshot_json=copy.deepcopy(config),
        company_profile_json={},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
