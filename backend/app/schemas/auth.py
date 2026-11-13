import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.membership import Role


class RegisterRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=160)
    organization_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=2, max_length=80)
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    display_name: str


class MembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    organization_id: uuid.UUID
    role: Role
    status: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    membership: MembershipResponse


class MeResponse(BaseModel):
    user: UserResponse
    membership: MembershipResponse


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    industry_key: str | None
    created_at: datetime

