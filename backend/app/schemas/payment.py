from datetime import datetime

from pydantic import BaseModel


class CheckoutOut(BaseModel):
    url: str


class UsageOut(BaseModel):
    tier: str
    quizzes_today: int
    quizzes_limit: int | None
    uploads: int
    uploads_limit: int | None
    price_label: str


class PaymentEventOut(BaseModel):
    provider: str
    event_type: str
    amount: int | None
    currency: str | None
    status: str | None
    created_at: datetime
