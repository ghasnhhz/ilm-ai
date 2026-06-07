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
        # Stamp the user id onto the *subscription* too, so subscription.* and
        # invoice.* webhooks (which don't carry the Checkout Session) can be
        # mapped back to a user without a customer-id lookup.
        subscription_data={"metadata": {"user_id": str(user_id)}},
        customer_email=email,
        success_url=f"{settings.app_base_url}/billing?upgraded=1",
        cancel_url=f"{settings.app_base_url}/pricing?canceled=1",
    )
    return session.url


def _set_cancel_at_period_end(db: Session, user_id: uuid.UUID, cancel: bool) -> bool:
    """Schedule (or undo) cancellation on the user's Stripe subscription. The user
    keeps premium until the period end. Returns False if the user has no Stripe
    subscription (e.g. a Payme subscriber), so callers can fall back."""
    from app.models.payment import Subscription

    sub = db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    if sub is None or sub.provider != "stripe" or not sub.provider_subscription_id:
        return False
    if not settings.stripe_secret_key:
        raise StripeUnavailableError("Stripe is not configured.")

    import stripe

    stripe.api_key = settings.stripe_secret_key
    stripe.Subscription.modify(
        sub.provider_subscription_id, cancel_at_period_end=cancel
    )
    sub.cancel_at_period_end = cancel
    db.commit()
    return True


def schedule_cancel(db: Session, user_id: uuid.UUID) -> bool:
    """Cancel at period end. Returns False if there's no Stripe subscription."""
    return _set_cancel_at_period_end(db, user_id, True)


def resume(db: Session, user_id: uuid.UUID) -> bool:
    """Undo a scheduled cancellation. Returns False if there's no Stripe subscription."""
    return _set_cancel_at_period_end(db, user_id, False)


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


def _user_from_metadata(obj: dict) -> uuid.UUID | None:
    """User id we stamped onto the Checkout Session / Subscription metadata."""
    ref = (obj.get("metadata") or {}).get("user_id")
    return uuid.UUID(ref) if ref else None


def _local_sub_by_provider_id(db: Session, sub_id: str | None) -> "Subscription | None":
    from app.models.payment import Subscription

    if not sub_id:
        return None
    return db.scalar(
        select(Subscription).where(Subscription.provider_subscription_id == sub_id)
    )


def _subscription_period_end(obj: dict) -> datetime | None:
    """Renewal date from a subscription object. Newer Stripe API versions expose it
    per-item (`items.data[].current_period_end`) rather than on the subscription, so
    fall back to the items if the top-level field is absent."""
    raw = obj.get("current_period_end")
    if not raw:
        for item in (obj.get("items") or {}).get("data") or []:
            raw = item.get("current_period_end")
            if raw:
                break
    return _period_end(raw)


def _invoice_period_end(obj: dict) -> datetime | None:
    """New period end from a paid invoice's line items (last line wins)."""
    for line in reversed((obj.get("lines") or {}).get("data") or []):
        end = (line.get("period") or {}).get("end")
        if end:
            return _period_end(end)
    return None


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
    amount: int | None = None
    currency: str | None = None

    if event_type == "checkout.session.completed":
        # Initial purchase. Activates immediately; subscription.created (below) then
        # fills in the renewal date. Kept as a belt-and-suspenders activation path.
        user_id = _user_from_metadata(obj) or (
            uuid.UUID(obj["client_reference_id"])
            if obj.get("client_reference_id")
            else None
        )
        if user_id:
            limits.activate_premium(
                db,
                user_id,
                "stripe",
                customer_id=obj.get("customer"),
                subscription_id=obj.get("subscription"),
            )

    elif event_type == "customer.subscription.created":
        user_id = _user_from_metadata(obj)
        if user_id:
            sub = limits.activate_premium(
                db,
                user_id,
                "stripe",
                customer_id=obj.get("customer"),
                subscription_id=obj.get("id"),
                period_end=_subscription_period_end(obj),
            )
            sub.cancel_at_period_end = bool(obj.get("cancel_at_period_end"))
            db.commit()

    elif event_type == "customer.subscription.updated":
        local = _local_sub_by_provider_id(db, obj.get("id"))
        user_id = _user_from_metadata(obj) or (local.user_id if local else None)
        if user_id:
            # `active` and `trialing` keep access; past_due / canceled / unpaid revoke it.
            if obj.get("status") in ("active", "trialing"):
                sub = limits.activate_premium(
                    db,
                    user_id,
                    "stripe",
                    customer_id=obj.get("customer"),
                    subscription_id=obj.get("id"),
                    period_end=_subscription_period_end(obj),
                )
                # Mirror Stripe's flag so a cancel/resume in their portal syncs to us.
                sub.cancel_at_period_end = bool(obj.get("cancel_at_period_end"))
                db.commit()
            else:
                limits.deactivate(db, user_id)

    elif event_type == "customer.subscription.deleted":
        local = _local_sub_by_provider_id(db, obj.get("id"))
        user_id = _user_from_metadata(obj) or (local.user_id if local else None)
        if user_id:
            limits.deactivate(db, user_id)

    elif event_type == "invoice.paid":
        # A successful charge — initial or renewal. Extend the access window.
        amount = obj.get("amount_paid")
        currency = obj.get("currency")
        local = _local_sub_by_provider_id(db, obj.get("subscription"))
        if local is not None:
            user_id = local.user_id
            limits.activate_premium(
                db,
                user_id,
                "stripe",
                customer_id=obj.get("customer"),
                subscription_id=obj.get("subscription"),
                # Don't null an existing end if this invoice has no usable period.
                period_end=_invoice_period_end(obj) or local.current_period_end,
            )

    elif event_type == "invoice.payment_failed":
        amount = obj.get("amount_due")
        currency = obj.get("currency")
        local = _local_sub_by_provider_id(db, obj.get("subscription"))
        if local is not None:
            user_id = local.user_id
            limits.deactivate(db, user_id)

    db.add(
        PaymentEvent(
            user_id=user_id,
            provider="stripe",
            event_type=event_type,
            external_id=event_id,
            amount=amount,
            currency=currency,
            raw=event.to_dict() if hasattr(event, "to_dict") else dict(event),
            status="processed",
        )
    )
    db.commit()
    return {"received": True}
