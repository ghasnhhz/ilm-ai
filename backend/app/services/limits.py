"""Tier checks, usage counting, and free-tier limit enforcement.

Absence of an active premium `Subscription` row means the user is on the free tier:
3 quizzes/day and 5 uploaded materials. Premium users bypass both. `activate_premium`
/ `deactivate` are the shared write paths used by both payment providers' webhooks.
"""

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.material import Material
from app.models.payment import Subscription
from app.models.quiz import QuizSession

FREE_QUIZZES_PER_DAY = 3
FREE_UPLOADS = 5


class LimitExceeded(Exception):
    """Raised when a free-tier user hits a usage cap. Mapped to HTTP 402."""


def _subscription(db: Session, user_id: uuid.UUID) -> Subscription | None:
    return db.scalar(select(Subscription).where(Subscription.user_id == user_id))


def is_premium(db: Session, user_id: uuid.UUID) -> bool:
    sub = _subscription(db, user_id)
    if sub is None or sub.tier != "premium" or sub.status != "active":
        return False
    if sub.current_period_end is not None:
        return sub.current_period_end > datetime.now(ZoneInfo("UTC"))
    return True


def _quizzes_today(db: Session, user_id: uuid.UUID) -> int:
    start = datetime.now(ZoneInfo(settings.reminder_timezone)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return (
        db.scalar(
            select(func.count())
            .select_from(QuizSession)
            .where(QuizSession.user_id == user_id, QuizSession.created_at >= start)
        )
        or 0
    )


def _upload_count(db: Session, user_id: uuid.UUID) -> int:
    return (
        db.scalar(
            select(func.count()).select_from(Material).where(Material.user_id == user_id)
        )
        or 0
    )


def get_usage(db: Session, user_id: uuid.UUID) -> dict:
    sub = _subscription(db, user_id)
    premium = is_premium(db, user_id)
    return {
        "tier": "premium" if premium else "free",
        "quizzes_today": _quizzes_today(db, user_id),
        "quizzes_limit": None if premium else FREE_QUIZZES_PER_DAY,
        "uploads": _upload_count(db, user_id),
        "uploads_limit": None if premium else FREE_UPLOADS,
        "price_label": settings.premium_price_label,
        "current_period_end": sub.current_period_end if premium and sub else None,
        "cancel_at_period_end": bool(sub.cancel_at_period_end) if premium and sub else False,
    }


def check_quiz_limit(db: Session, user_id: uuid.UUID) -> None:
    if is_premium(db, user_id):
        return
    if _quizzes_today(db, user_id) >= FREE_QUIZZES_PER_DAY:
        raise LimitExceeded(
            f"Free plan allows {FREE_QUIZZES_PER_DAY} quizzes per day. "
            "Upgrade to premium for unlimited practice."
        )


def check_upload_limit(db: Session, user_id: uuid.UUID) -> None:
    if is_premium(db, user_id):
        return
    if _upload_count(db, user_id) >= FREE_UPLOADS:
        raise LimitExceeded(
            f"Free plan allows {FREE_UPLOADS} uploads. "
            "Upgrade to premium for unlimited materials."
        )


def activate_premium(
    db: Session,
    user_id: uuid.UUID,
    provider: str,
    *,
    customer_id: str | None = None,
    subscription_id: str | None = None,
    period_end: datetime | None = None,
) -> Subscription:
    sub = _subscription(db, user_id)
    if sub is None:
        sub = Subscription(user_id=user_id)
        db.add(sub)
    sub.tier = "premium"
    sub.status = "active"
    sub.provider = provider
    if customer_id is not None:
        sub.provider_customer_id = customer_id
    if subscription_id is not None:
        sub.provider_subscription_id = subscription_id
    sub.current_period_end = period_end
    db.commit()
    db.refresh(sub)
    return sub


def deactivate(db: Session, user_id: uuid.UUID) -> None:
    sub = _subscription(db, user_id)
    if sub is None:
        return
    sub.tier = "free"
    sub.status = "canceled"
    sub.cancel_at_period_end = False
    db.commit()
