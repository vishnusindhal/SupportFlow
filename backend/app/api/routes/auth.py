from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_context
from app.core.config import get_settings
from app.core.security import hash_refresh_token, issue_refresh_token
from app.db.session import get_db
from app.models import RefreshSession
from app.schemas.auth import AuthResponse, LoginRequest, MeResponse, RegisterRequest
from app.services.auth import access_response, authenticate, register

router = APIRouter(prefix="/auth", tags=["auth"])
REFRESH_COOKIE = "supportflow_refresh"


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_days * 86400,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_route(request: RegisterRequest, response: Response, db: Annotated[Session, Depends(get_db)]):
    user, organization, membership, refresh = register(db, request)
    set_refresh_cookie(response, refresh)
    return access_response(user, organization, membership)


@router.post("/login", response_model=AuthResponse)
def login_route(request: LoginRequest, response: Response, db: Annotated[Session, Depends(get_db)]):
    user, organization, membership, refresh = authenticate(db, request)
    set_refresh_cookie(response, refresh)
    return access_response(user, organization, membership)


@router.post("/refresh", response_model=AuthResponse)
def refresh_route(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == hash_refresh_token(refresh_token)))
    now = datetime.now(UTC)
    if not session or session.revoked_at or as_utc(session.expires_at) <= now:
        if session and not session.revoked_at:
            session.revoked_at = now
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    session.revoked_at = now
    raw_new, new_hash = issue_refresh_token()
    replacement = RefreshSession(
        user_id=session.user_id,
        organization_id=session.organization_id,
        token_hash=new_hash,
        expires_at=now + timedelta(days=get_settings().refresh_token_days),
    )
    db.add(replacement)
    db.commit()
    context = db.scalar(select(RefreshSession).where(RefreshSession.id == replacement.id))
    from app.models import Membership, Organization, User
    user = db.get(User, context.user_id)
    organization = db.get(Organization, context.organization_id)
    membership = db.scalar(select(Membership).where(Membership.user_id == user.id, Membership.organization_id == organization.id))
    set_refresh_cookie(response, raw_new)
    return access_response(user, organization, membership)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_route(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
):
    if refresh_token:
        session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == hash_refresh_token(refresh_token)))
        if session and not session.revoked_at:
            session.revoked_at = datetime.now(UTC)
            db.commit()
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")


@router.get("/me", response_model=MeResponse)
def me_route(context: Annotated[AuthContext, Depends(get_current_context)]):
    return {"user": context.user, "membership": context.membership}
