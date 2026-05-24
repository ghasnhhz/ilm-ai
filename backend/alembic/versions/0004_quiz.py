"""create quiz_sessions, quiz_questions, quiz_answers

Revision ID: 0004_quiz
Revises: 0003_chat
Create Date: 2026-05-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_quiz"
down_revision: Union[str, None] = "0003_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quiz_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("collection_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("difficulty", sa.String(length=20), nullable=False, server_default="solid"),
        sa.Column("total_q", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["collection_id"], ["collections.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_quiz_sessions_user_id", "quiz_sessions", ["user_id"])

    op.create_table(
        "quiz_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_type", sa.String(length=10), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.Column("correct_answer", sa.String(length=500), nullable=False),
        sa.Column("source_material_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("concept", sa.String(length=200), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["session_id"], ["quiz_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_material_id"], ["materials.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_quiz_questions_session_id", "quiz_questions", ["session_id"])

    op.create_table(
        "quiz_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_answer", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_quiz_answers_question_id", "quiz_answers", ["question_id"])
    op.create_index("ix_quiz_answers_user_id", "quiz_answers", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_quiz_answers_user_id", table_name="quiz_answers")
    op.drop_index("ix_quiz_answers_question_id", table_name="quiz_answers")
    op.drop_table("quiz_answers")
    op.drop_index("ix_quiz_questions_session_id", table_name="quiz_questions")
    op.drop_table("quiz_questions")
    op.drop_index("ix_quiz_sessions_user_id", table_name="quiz_sessions")
    op.drop_table("quiz_sessions")
