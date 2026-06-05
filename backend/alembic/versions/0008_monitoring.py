"""create llm_logs

Revision ID: 0008_monitoring
Revises: 0007_payments
Create Date: 2026-06-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_monitoring"
down_revision: Union[str, None] = "0007_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("endpoint", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_llm_logs_user_id", "llm_logs", ["user_id"])
    op.create_index("ix_llm_logs_kind", "llm_logs", ["kind"])
    op.create_index("ix_llm_logs_model", "llm_logs", ["model"])
    op.create_index("ix_llm_logs_endpoint", "llm_logs", ["endpoint"])
    op.create_index("ix_llm_logs_created_at", "llm_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_llm_logs_created_at", table_name="llm_logs")
    op.drop_index("ix_llm_logs_endpoint", table_name="llm_logs")
    op.drop_index("ix_llm_logs_model", table_name="llm_logs")
    op.drop_index("ix_llm_logs_kind", table_name="llm_logs")
    op.drop_index("ix_llm_logs_user_id", table_name="llm_logs")
    op.drop_table("llm_logs")
