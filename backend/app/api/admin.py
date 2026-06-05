"""Admin-only operational metrics.

Access is gated by a config email allow-list (``ADMIN_EMAILS``) rather than a role
column, so no schema change to ``users`` is needed. Day-bounded counts use the
configured ``reminder_timezone`` (Asia/Tashkent) so "today" matches the audience.
"""

from datetime import datetime, time
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.models.llm_log import LLMLog
from app.models.material import Material
from app.models.quiz import QuizSession
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if (current_user.email or "").lower() not in settings.admin_email_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


def _start_of_today_utc() -> datetime:
    tz = ZoneInfo(settings.reminder_timezone)
    local_midnight = datetime.combine(datetime.now(tz).date(), time.min, tzinfo=tz)
    return local_midnight.astimezone(ZoneInfo("UTC"))


@router.get("/metrics")
def get_metrics(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    start = _start_of_today_utc()

    dau = db.scalar(
        select(func.count(func.distinct(LLMLog.user_id))).where(
            LLMLog.created_at >= start, LLMLog.user_id.is_not(None)
        )
    )
    quiz_completions = db.scalar(
        select(func.count(QuizSession.id)).where(
            QuizSession.created_at >= start, QuizSession.total_q > 0
        )
    )
    uploads = db.scalar(
        select(func.count(Material.id)).where(Material.created_at >= start)
    )
    tokens_today = db.scalar(
        select(func.coalesce(func.sum(LLMLog.tokens), 0)).where(LLMLog.created_at >= start)
    )
    tokens_all = db.scalar(select(func.coalesce(func.sum(LLMLog.tokens), 0)))

    tokens_by_model = {
        model: int(total)
        for model, total in db.execute(
            select(LLMLog.model, func.coalesce(func.sum(LLMLog.tokens), 0)).group_by(
                LLMLog.model
            )
        ).all()
    }
    calls_by_kind = {
        kind: int(count)
        for kind, count in db.execute(
            select(LLMLog.kind, func.count(LLMLog.id)).group_by(LLMLog.kind)
        ).all()
    }

    return {
        "timezone": settings.reminder_timezone,
        "since": start.isoformat(),
        "dau": int(dau or 0),
        "quiz_completions": int(quiz_completions or 0),
        "uploads": int(uploads or 0),
        "total_tokens_today": int(tokens_today or 0),
        "total_tokens_all_time": int(tokens_all or 0),
        "tokens_by_model": tokens_by_model,
        "calls_by_kind": calls_by_kind,
    }
