"""Telegram link, streak, and reminder logic.

The bot is stateless; everything that needs to persist (which chat belongs to which
user, reminder times, streaks) lives in `telegram_links` and is driven from here.
"""

import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.models.telegram import TelegramLink
from app.models.user import User


class LinkError(ValueError):
    """Raised when a Telegram link token is missing, expired, or the wrong type."""


def link_account(db: Session, token: str, chat_id: int) -> str:
    data = decode_token(token)
    if data is None or data.get("type") != "telegram_link":
        raise LinkError("This link is invalid or has expired. Generate a new one in the app.")
    try:
        user_id = uuid.UUID(str(data.get("sub")))
    except (ValueError, TypeError):
        raise LinkError("This link is invalid. Generate a new one in the app.")

    user = db.get(User, user_id)
    if user is None:
        raise LinkError("Account not found.")

    # If this chat was linked to a different account, move it.
    existing_chat = db.scalar(select(TelegramLink).where(TelegramLink.chat_id == chat_id))
    if existing_chat is not None and existing_chat.user_id != user_id:
        db.delete(existing_chat)
        db.flush()

    link = db.scalar(select(TelegramLink).where(TelegramLink.user_id == user_id))
    if link is None:
        link = TelegramLink(user_id=user_id, chat_id=chat_id)
        db.add(link)
    else:
        link.chat_id = chat_id
    db.commit()
    return user.name or "learner"


def get_link(db: Session, chat_id: int) -> TelegramLink | None:
    return db.scalar(select(TelegramLink).where(TelegramLink.chat_id == chat_id))


def resolve_user_id(db: Session, chat_id: int) -> uuid.UUID:
    link = get_link(db, chat_id)
    if link is None:
        raise LinkError("This chat isn't linked yet. Open Ilm AI → Profile → Connect Telegram.")
    return link.user_id


def record_activity(db: Session, user_id: uuid.UUID) -> int | None:
    """Update the learning streak for a user. No-op (returns None) if not linked."""
    link = db.scalar(select(TelegramLink).where(TelegramLink.user_id == user_id))
    if link is None:
        return None

    today = datetime.now(ZoneInfo(settings.reminder_timezone)).date()
    last = link.last_active_date
    if last == today:
        return link.current_streak  # already counted today
    if last == today - timedelta(days=1):
        link.current_streak += 1
    else:
        link.current_streak = 1
    link.last_active_date = today
    link.longest_streak = max(link.longest_streak, link.current_streak)
    db.commit()
    return link.current_streak


def set_reminder(db: Session, chat_id: int, hour: int | None, minute: int | None) -> None:
    link = get_link(db, chat_id)
    if link is None:
        raise LinkError("This chat isn't linked yet.")
    link.reminder_hour = hour
    link.reminder_minute = minute
    db.commit()


def due_reminders(db: Session) -> list[dict]:
    """Return chats whose reminder time matches the current minute (in the configured tz)."""
    now = datetime.now(ZoneInfo(settings.reminder_timezone))
    rows = db.scalars(
        select(TelegramLink).where(
            TelegramLink.reminder_hour == now.hour,
            TelegramLink.reminder_minute == now.minute,
        )
    ).all()
    return [{"chat_id": r.chat_id, "streak": r.current_streak} for r in rows]
