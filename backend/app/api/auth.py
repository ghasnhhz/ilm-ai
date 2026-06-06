from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.core.ratelimit import login_limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserGoal
from app.schemas.auth import (
    GoalUpdate,
    LoginRequest,
    OAuthBridgeRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.services import plan_agent

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


def _user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.goal = user.goals[0] if user.goals else None
    return out


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    exists = db.scalar(select(User).where(User.email == payload.email))
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
        provider="credentials",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _tokens_for(user)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest, request: Request, db: Session = Depends(get_db)
) -> TokenResponse:
    # Throttle per (client IP, email) to blunt password brute-forcing.
    client_ip = request.client.host if request.client else "unknown"
    if not login_limiter.allow(f"{client_ip}:{payload.email.lower()}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts — please wait a moment and try again.",
        )

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not user.hashed_password or not verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    return _tokens_for(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    data = decode_token(payload.refresh_token)
    if data is None or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.get(User, _parse_uuid(data.get("sub")))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return _tokens_for(user)


@router.post("/oauth", response_model=TokenResponse)
def oauth_bridge(
    payload: OAuthBridgeRequest,
    db: Session = Depends(get_db),
    x_auth_bridge_secret: str = Header(default=""),
) -> TokenResponse:
    if not settings.auth_bridge_secret or x_auth_bridge_secret != settings.auth_bridge_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bridge secret")

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        user = User(email=payload.email, name=payload.name, provider=payload.provider)
        db.add(user)
        db.commit()
        db.refresh(user)
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return _user_out(current_user)


@router.put("/goal", response_model=UserOut)
def set_goal(
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    goal = UserGoal(
        user_id=current_user.id,
        goal_text=payload.goal_text,
        target_date=payload.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(current_user)
    # A changed goal/target date makes any existing learning plan outdated.
    plan_agent.mark_stale(db, current_user.id)
    return _user_out(current_user)


def _parse_uuid(value):
    import uuid

    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None
