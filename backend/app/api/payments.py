import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.payment import PaymentEvent
from app.models.user import User
from app.schemas.payment import CheckoutOut, PaymentEventOut, UsageOut
from app.services import limits, payme_service, stripe_service
from app.services.stripe_service import StripeUnavailableError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


# --- Tier / usage (JWT) ------------------------------------------------------

@router.get("/usage", response_model=UsageOut)
def usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UsageOut:
    return UsageOut(**limits.get_usage(db, current_user.id))


@router.post("/cancel")
def cancel(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # Stripe subscribers cancel at period end (keep premium until it lapses); anyone
    # without a Stripe subscription (e.g. Payme) is downgraded immediately.
    try:
        scheduled = stripe_service.schedule_cancel(db, current_user.id)
    except StripeUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )
    if not scheduled:
        limits.deactivate(db, current_user.id)
    return {"ok": True}


@router.post("/resume")
def resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        stripe_service.resume(db, current_user.id)
    except StripeUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )
    return {"ok": True}


@router.get("/history", response_model=list[PaymentEventOut])
def history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PaymentEventOut]:
    rows = db.scalars(
        select(PaymentEvent)
        .where(PaymentEvent.user_id == current_user.id)
        .order_by(PaymentEvent.created_at.desc())
        .limit(20)
    ).all()
    return [PaymentEventOut.model_validate(r, from_attributes=True) for r in rows]


# --- Stripe ------------------------------------------------------------------

@router.post("/stripe/checkout", response_model=CheckoutOut)
def stripe_checkout(
    current_user: User = Depends(get_current_user),
) -> CheckoutOut:
    try:
        url = stripe_service.create_checkout_session(current_user.id, current_user.email)
    except StripeUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )
    return CheckoutOut(url=url)


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(default=""),
    db: Session = Depends(get_db),
) -> dict:
    payload = await request.body()
    try:
        return stripe_service.handle_webhook(db, payload, stripe_signature)
    except StripeUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )
    except Exception:
        # Bad signature / malformed payload → 400 so Stripe retries. Don't echo the raw
        # exception text back to the caller; log it for ourselves instead.
        logger.exception("Stripe webhook processing failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload"
        )


# --- Payme (JSON-RPC) --------------------------------------------------------

@router.post("/payme/webhook")
async def payme_webhook(
    request: Request,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> dict:
    body = await request.json()
    return payme_service.handle(db, authorization, body)
