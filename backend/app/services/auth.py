from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    hash_password,
    issue_refresh_token,
    verify_password,
)
from app.models import Membership, Organization, RefreshSession, User
from app.models.membership import MembershipStatus, Role
from app.schemas.auth import LoginRequest, RegisterRequest


def normalize_email(email: str) -> str:
    return email.strip().lower()


def register(db: Session, request: RegisterRequest) -> tuple[User, Organization, Membership, str]:
    email = normalize_email(str(request.email))
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    if db.scalar(select(Organization).where(Organization.slug == request.organization_slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug is already registered")
    organization = Organization(name=request.organization_name.strip(), slug=request.organization_slug)
    user = User(email=email, password_hash=hash_password(request.password), display_name=request.display_name.strip())
    organization.memberships.append(Membership(user=user, role=Role.owner, status=MembershipStatus.active))
    db.add(organization)
    db.flush()
    membership = organization.memberships[0]
    raw_refresh, refresh_hash = issue_refresh_token()
    db.add(
        RefreshSession(
            user_id=user.id,
            organization_id=organization.id,
            token_hash=refresh_hash,
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days),
        )
    )
    db.commit()
    return user, organization, membership, raw_refresh


def authenticate(db: Session, request: LoginRequest) -> tuple[User, Organization, Membership, str]:
    user = db.scalar(select(User).where(User.email == normalize_email(str(request.email))))
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    membership = db.scalar(
        select(Membership).where(Membership.user_id == user.id, Membership.status == MembershipStatus.active)
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active organization membership")
    organization = db.get(Organization, membership.organization_id)
    raw_refresh, refresh_hash = issue_refresh_token()
    db.add(
        RefreshSession(
            user_id=user.id,
            organization_id=membership.organization_id,
            token_hash=refresh_hash,
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days),
        )
    )
    db.commit()
    return user, organization, membership, raw_refresh


def access_response(user: User, organization: Organization, membership: Membership) -> dict:
    return {
        "access_token": create_access_token(user.id, organization.id),
        "user": user,
        "membership": membership,
    }
