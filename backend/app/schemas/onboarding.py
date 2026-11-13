import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TemplateSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    industry_key: str
    version: int
    display_name: str
    is_active: bool
    created_at: datetime


class TemplateResponse(TemplateSummary):
    config: dict[str, Any]


class CompanyProfileRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=160)
    support_email: str | None = Field(default=None, max_length=320)
    timezone: str = Field(default="UTC", min_length=1, max_length=64)


class OnboardingStatus(BaseModel):
    completed: bool
    profile: dict[str, Any] | None = None
    current_template_version: int | None = None
    newer_template_available: bool = False


class CompleteOnboardingRequest(BaseModel):
    template_id: uuid.UUID


class ConfigurationResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    template_id: uuid.UUID
    template_version: int
    company_profile: dict[str, Any]
    config: dict[str, Any]
    updated_at: datetime

