"""add prompt/response text to llm_logs

Revision ID: 0011_llm_log_text
Revises: 0010_perf_indexes
Create Date: 2026-06-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_llm_log_text"
down_revision: Union[str, None] = "0010_perf_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("llm_logs", sa.Column("prompt", sa.Text(), nullable=True))
    op.add_column("llm_logs", sa.Column("response", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("llm_logs", "response")
    op.drop_column("llm_logs", "prompt")
