"""create learning_plans

Revision ID: 0005_plan
Revises: 0004_quiz
Create Date: 2026-06-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_plan"
down_revision: Union[str, None] = "0004_quiz"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learning_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_json", postgresql.JSONB(), nullable=False),
        sa.Column("goal_text", sa.String(length=2000), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_learning_plans_user_id", "learning_plans", ["user_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_learning_plans_user_id", table_name="learning_plans")
    op.drop_table("learning_plans")
