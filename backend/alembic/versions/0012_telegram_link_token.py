"""create telegram_link_tokens

Revision ID: 0012_telegram_link_token
Revises: 0011_llm_log_text
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_telegram_link_token"
down_revision: Union[str, None] = "0011_llm_log_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telegram_link_tokens",
        sa.Column("token", sa.String(length=64), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_telegram_link_tokens_user_id",
        "telegram_link_tokens",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_telegram_link_tokens_user_id", table_name="telegram_link_tokens"
    )
    op.drop_table("telegram_link_tokens")
