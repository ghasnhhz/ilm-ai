"""create telegram_links

Revision ID: 0006_telegram
Revises: 0005_plan
Create Date: 2026-06-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_telegram"
down_revision: Union[str, None] = "0005_plan"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telegram_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("reminder_hour", sa.Integer(), nullable=True),
        sa.Column("reminder_minute", sa.Integer(), nullable=True),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_active_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_telegram_links_user_id", "telegram_links", ["user_id"], unique=True
    )
    op.create_index(
        "ix_telegram_links_chat_id", "telegram_links", ["chat_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_telegram_links_chat_id", table_name="telegram_links")
    op.drop_index("ix_telegram_links_user_id", table_name="telegram_links")
    op.drop_table("telegram_links")
