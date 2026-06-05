"""Stripe Checkout + webhook handling.

Checkout creates a subscription session tagged with the user id; the webhook verifies
Stripe's signature and flips the user to premium (or back) via `limits`. Handling is
idempotent on the Stripe event id, recorded in `payment_events`.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payment import PaymentEvent
from app.services import limits


class StripeUnavailableError(RuntimeError):
    """Raised when Stripe keys are not configured."""


def create_checkout_session(user_id: uuid.UUID, email: str | None) -> str:
    if not settings.stripe_secret_key or not settings.stripe_price_id:
        raise StripeUnavailableError("Stripe is not configured.")

    import stripe

    stripe.api_key = settings.stripe_secret_key
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
        client_reference_id=str(user_id),
        metadata={"user_id": str(user_id)},
        customer_email=email,
        success_url=f"{settings.app_base_url}/billing?upgraded=1",
        cancel_url=f"{settings.app_base_url}/pricing?canceled=1",
    )
    return session.url


def _already_handled(db: Session, event_id: str) -> bool:
    return (
        db.scalar(
            select(PaymentEvent).where(
                PaymentEvent.provider == "stripe",
                PaymentEvent.external_id == event_id,
            )
        )
        is not None
    )


def _period_end(raw_end: int | None) -> datetime | None:
    if not raw_end:
        return None
    return datetime.fromtimestamp(raw_end, tz=timezone.utc)


def handle_webhook(db: Session, payload: bytes, signature: str) -> dict:
    if not settings.stripe_webhook_secret:
        raise StripeUnavailableError("Stripe webhook secret is not configured.")

    import stripe

    event = stripe.Webhook.construct_event(
        payload, signature, settings.stripe_webhook_secret
    )  # raises stripe.error.SignatureVerificationError on a bad signature

    event_id = event["id"]
    if _already_handled(db, event_id):
        return {"received": True, "duplicate": True}

    event_type = event["type"]
    obj = event["data"]["object"]
    user_id: uuid.UUID | None = None

    if event_type == "checkout.session.completed":
        ref = obj.get("client_reference_id") or obj.get("metadata", {}).get("user_id")
        if ref:
            user_id = uuid.UUID(ref)
            limits.activate_premium(
                db,
                user_id,
                "stripe",
                customer_id=obj.get("customer"),
                subscription_id=obj.get("subscription"),
            )
    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        if event_type == "customer.subscription.deleted" or obj.get("status") != "active":
            sub_id = obj.get("id")
            from app.models.payment import Subscription

            local = db.scalar(
                select(Subscription).where(
                    Subscription.provider_subscription_id == sub_id
                )
            )
            if local is not None:
                user_id = local.user_id
                limits.deactivate(db, user_id)

    db.add(
        PaymentEvent(
            user_id=user_id,
            provider="stripe",
            event_type=event_type,
            external_id=event_id,
            raw=event.to_dict() if hasattr(event, "to_dict") else dict(event),
            status="processed",
        )
    )
    db.commit()
    return {"received": True}
