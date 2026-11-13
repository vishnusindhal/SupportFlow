import uuid
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Membership, Organization, User
from app.models.membership import MembershipStatus, Role

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user: User
    organization: Organization
    membership: Membership


def get_current_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthContext:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
        organization_id = uuid.UUID(payload["org"])
    except (ValueError, jwt.InvalidTokenError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc
    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == organization_id,
            Membership.status == MembershipStatus.active,
        )
    )
    user = db.get(User, user_id)
    organization = db.get(Organization, organization_id)
    if not membership or not user or not organization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid membership")
    return AuthContext(user=user, organization=organization, membership=membership)


def require_roles(*roles: Role):
    def dependency(context: Annotated[AuthContext, Depends(get_current_context)]) -> AuthContext:
        if context.membership.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return context

    return dependency
