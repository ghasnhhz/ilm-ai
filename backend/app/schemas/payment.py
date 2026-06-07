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
    # When the current premium period ends (i.e. the next renewal date). None on
    # the free tier or until a subscription/invoice webhook fills it in.
    current_period_end: datetime | None = None
    # True when cancellation is scheduled: premium stays until current_period_end,
    # then it won't renew.
    cancel_at_period_end: bool = False


class PaymentEventOut(BaseModel):
    provider: str
    event_type: str
    amount: int | None
    currency: str | None
    status: str | None
    created_at: datetime
