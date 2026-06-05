import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class LearningPlan(Base):
    """A learner's day-by-day plan. One row per user (upserted on regeneration).

    `plan_json` holds the generated plan; `stale` is flipped to True whenever the
    inputs change (new upload, quiz completion, goal edit) so the UI can nudge the
    user to regenerate without spending tokens on every trigger.
    """

    __tablename__ = "learning_plans"

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
    plan_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    goal_text: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    stale: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
