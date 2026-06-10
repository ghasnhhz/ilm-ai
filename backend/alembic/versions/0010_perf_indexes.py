"""add created_at indexes on hot list/ordering paths

Revision ID: 0010_perf_indexes
Revises: 0009_sub_cancel
Create Date: 2026-06-11

These tables are listed/loaded with ORDER BY created_at (sessions lists, chat
history, materials list). Indexing created_at keeps those ordered scans cheap as
per-user history grows. See PERF_AUDIT.md (Priority 0).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0010_perf_indexes"
down_revision: Union[str, None] = "0009_sub_cancel"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = (
    ("ix_chat_sessions_created_at", "chat_sessions", "created_at"),
    ("ix_chat_messages_created_at", "chat_messages", "created_at"),
    ("ix_quiz_sessions_created_at", "quiz_sessions", "created_at"),
    ("ix_materials_created_at", "materials", "created_at"),
)


def upgrade() -> None:
    for name, table, column in _INDEXES:
        op.create_index(name, table, [column])


def downgrade() -> None:
    for name, table, _column in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
