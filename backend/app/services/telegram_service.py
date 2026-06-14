"""Telegram link, streak, and reminder logic.

The bot is stateless; everything that needs to persist (which chat belongs to which
user, reminder times, streaks) lives in `telegram_links` and is driven from here.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.telegram import TelegramLink, TelegramLinkToken
from app.models.user import User

# How long a generated link token stays valid before the user must request a new one.
LINK_TOKEN_TTL = timedelta(minutes=10)


class LinkError(ValueError):
    """Raised when a Telegram link token is missing, expired, or the wrong type."""


def create_link_token(db: Session, user_id: uuid.UUID) -> str:
    """Issue a fresh single-use link token, replacing any the user already holds.

    The token must survive Telegram's deep-link ``?start=`` parameter, which only
    allows ``A-Z a-z 0-9 _ -`` (max 64 chars), so it is an opaque ``token_urlsafe``
    string (32 chars, no ``.``) — never a JWT.
    """
    db.execute(delete(TelegramLinkToken).where(TelegramLinkToken.user_id == user_id))
    token = secrets.token_urlsafe(24)
    db.add(
        TelegramLinkToken(
            token=token,
            user_id=user_id,
            expires_at=datetime.now(timezone.utc) + LINK_TOKEN_TTL,
        )
    )
    db.commit()
    return token


def link_account(db: Session, token: str, chat_id: int) -> str:
    invalid = "This link is invalid or has expired. Generate a new one in the app."
    row = db.get(TelegramLinkToken, token)
    if row is None:
        raise LinkError(invalid)
    if row.expires_at < datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        raise LinkError(invalid)

    user_id = row.user_id
    # Single-use: drop the token so it can't be replayed. Persisted by the commit below.
    db.delete(row)

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


def set_reminder_for_user(
    db: Session, user_id: uuid.UUID, hour: int | None, minute: int | None
) -> None:
    """Set (or clear, when both are None) the daily reminder from the web app."""
    link = db.scalar(select(TelegramLink).where(TelegramLink.user_id == user_id))
    if link is None:
        raise LinkError("Connect Telegram first to set a daily reminder.")
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
