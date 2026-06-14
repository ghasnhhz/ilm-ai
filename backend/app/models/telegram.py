import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class TelegramLink(Base):
    """Links a Telegram chat to a user account, plus reminder + streak state.

    One row per user (and per chat). The bot is stateless — this row is the source
    of truth for who a chat belongs to, when to remind them, and their streak.
    """

    __tablename__ = "telegram_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    chat_id: Mapped[int] = mapped_column(
        BigInteger, unique=True, index=True, nullable=False
    )
    reminder_hour: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminder_minute: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TelegramLinkToken(Base):
    """Short-lived, single-use token the web app hands the user to link a chat.

    The token travels through Telegram's deep-link ``?start=`` parameter, which only
    permits ``A-Z a-z 0-9 _ -`` and at most 64 characters — so it must be a compact
    opaque string (``secrets.token_urlsafe``), never a JWT. The bot exchanges it for a
    real ``TelegramLink`` via ``POST /telegram/link``; the row is deleted on use.
    """

    __tablename__ = "telegram_link_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
