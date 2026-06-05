"""create subscriptions, payment_events, payme_transactions

Revision ID: 0007_payments
Revises: 0006_telegram
Create Date: 2026-06-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_payments"
down_revision: Union[str, None] = "0006_telegram"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default="free"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("provider", sa.String(length=20), nullable=True),
        sa.Column("provider_customer_id", sa.String(length=255), nullable=True),
        sa.Column("provider_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"], unique=True)

    op.create_table(
        "payment_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.BigInteger(), nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("raw", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_payment_events_external_id", "payment_events", ["external_id"])

    op.create_table(
        "payme_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("paycom_id", sa.String(length=255), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("state", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("create_time", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("perform_time", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("cancel_time", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("reason", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_payme_transactions_paycom_id", "payme_transactions", ["paycom_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_payme_transactions_paycom_id", table_name="payme_transactions")
    op.drop_table("payme_transactions")
    op.drop_index("ix_payment_events_external_id", table_name="payment_events")
    op.drop_table("payment_events")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")
