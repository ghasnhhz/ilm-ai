"""Payme (Paycom) Merchant API — JSON-RPC webhook handler.

Implements the merchant protocol Payme calls during a payment:
CheckPerformTransaction → CreateTransaction → PerformTransaction, plus
CancelTransaction and CheckTransaction. Transaction state is tracked in
`payme_transactions`, keyed by the Paycom transaction id.

State: 1 created, 2 performed (paid), -1 canceled before perform, -2 canceled after.
"""

import base64
import time
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.payment import PaymentEvent, PaymeTransaction
from app.models.user import User
from app.services import limits

# Payme error codes
ERR_AUTH = -32504
ERR_METHOD = -32601
ERR_INVALID_AMOUNT = -31001
ERR_TXN_NOT_FOUND = -31003
ERR_CANT_PERFORM = -31008
ERR_ACCOUNT = -31050  # account.user_id invalid / not found
ERR_PENDING = -31099  # another transaction already active for this account


def _now_ms() -> int:
    return int(time.time() * 1000)


def _msg(text: str) -> dict:
    return {"ru": text, "uz": text, "en": text}


def _err(code: int, text: str, data: str | None = None) -> dict:
    error = {"code": code, "message": _msg(text)}
    if data is not None:
        error["data"] = data
    return {"error": error}


def check_auth(authorization: str) -> bool:
    if not authorization.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(authorization[6:]).decode("utf-8")
    except Exception:
        return False
    # Payme sends "Paycom:<merchant key>"
    _, _, key = decoded.partition(":")
    return bool(settings.payme_secret_key) and key == settings.payme_secret_key


def _expected_amount() -> int:
    return settings.premium_amount_uzs * 100  # tiyin


def _resolve_account(db: Session, params: dict) -> uuid.UUID | None:
    account = params.get("account") or {}
    raw = account.get("user_id")
    if not raw:
        return None
    try:
        user_id = uuid.UUID(str(raw))
    except (ValueError, TypeError):
        return None
    return user_id if db.get(User, user_id) is not None else None


def _validate(db: Session, params: dict) -> dict | uuid.UUID:
    user_id = _resolve_account(db, params)
    if user_id is None:
        return _err(ERR_ACCOUNT, "User not found", data="user_id")
    if params.get("amount") != _expected_amount():
        return _err(ERR_INVALID_AMOUNT, "Invalid amount")
    return user_id


def _check_perform(db: Session, params: dict) -> dict:
    result = _validate(db, params)
    if isinstance(result, dict):
        return result
    return {"result": {"allow": True}}


def _create(db: Session, params: dict) -> dict:
    paycom_id = params["id"]
    existing = db.scalar(
        select(PaymeTransaction).where(PaymeTransaction.paycom_id == paycom_id)
    )
    if existing is not None:
        if existing.state != 1:
            return _err(ERR_CANT_PERFORM, "Transaction is not in a creatable state")
        return {
            "result": {
                "create_time": existing.create_time,
                "transaction": str(existing.id),
                "state": existing.state,
            }
        }

    result = _validate(db, params)
    if isinstance(result, dict):
        return result
    user_id = result

    pending = db.scalar(
        select(PaymeTransaction).where(
            PaymeTransaction.user_id == user_id, PaymeTransaction.state == 1
        )
    )
    if pending is not None:
        return _err(ERR_PENDING, "Another transaction is already in progress")

    txn = PaymeTransaction(
        paycom_id=paycom_id,
        user_id=user_id,
        amount=params["amount"],
        state=1,
        create_time=params.get("time", _now_ms()),
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return {
        "result": {
            "create_time": txn.create_time,
            "transaction": str(txn.id),
            "state": txn.state,
        }
    }


def _get_txn(db: Session, params: dict) -> PaymeTransaction | None:
    return db.scalar(
        select(PaymeTransaction).where(PaymeTransaction.paycom_id == params["id"])
    )


def _perform(db: Session, params: dict) -> dict:
    txn = _get_txn(db, params)
    if txn is None:
        return _err(ERR_TXN_NOT_FOUND, "Transaction not found")
    if txn.state == 2:
        return {
            "result": {
                "transaction": str(txn.id),
                "perform_time": txn.perform_time,
                "state": txn.state,
            }
        }
    if txn.state != 1:
        return _err(ERR_CANT_PERFORM, "Transaction cannot be performed")

    txn.state = 2
    txn.perform_time = _now_ms()
    db.commit()
    limits.activate_premium(db, txn.user_id, "payme")
    return {
        "result": {
            "transaction": str(txn.id),
            "perform_time": txn.perform_time,
            "state": txn.state,
        }
    }


def _cancel(db: Session, params: dict) -> dict:
    txn = _get_txn(db, params)
    if txn is None:
        return _err(ERR_TXN_NOT_FOUND, "Transaction not found")

    if txn.state in (-1, -2):
        return {
            "result": {
                "transaction": str(txn.id),
                "cancel_time": txn.cancel_time,
                "state": txn.state,
            }
        }

    was_performed = txn.state == 2
    txn.state = -2 if was_performed else -1
    txn.cancel_time = _now_ms()
    txn.reason = params.get("reason")
    db.commit()
    if was_performed:
        limits.deactivate(db, txn.user_id)
    return {
        "result": {
            "transaction": str(txn.id),
            "cancel_time": txn.cancel_time,
            "state": txn.state,
        }
    }


def _check(db: Session, params: dict) -> dict:
    txn = _get_txn(db, params)
    if txn is None:
        return _err(ERR_TXN_NOT_FOUND, "Transaction not found")
    return {
        "result": {
            "create_time": txn.create_time,
            "perform_time": txn.perform_time,
            "cancel_time": txn.cancel_time,
            "transaction": str(txn.id),
            "state": txn.state,
            "reason": txn.reason,
        }
    }


_METHODS = {
    "CheckPerformTransaction": _check_perform,
    "CreateTransaction": _create,
    "PerformTransaction": _perform,
    "CancelTransaction": _cancel,
    "CheckTransaction": _check,
}


def handle(db: Session, authorization: str, body: dict) -> dict:
    """Dispatch a Payme JSON-RPC request. Returns the JSON-RPC response body."""
    req_id = body.get("id")
    if not check_auth(authorization):
        return {"id": req_id, **_err(ERR_AUTH, "Insufficient privileges")}

    method = body.get("method")
    handler = _METHODS.get(method)
    if handler is None:
        return {"id": req_id, **_err(ERR_METHOD, "Method not found")}

    params = body.get("params") or {}
    response = handler(db, params)

    db.add(
        PaymentEvent(
            provider="payme",
            event_type=method,
            external_id=str(params.get("id")) if params.get("id") else None,
            amount=params.get("amount"),
            currency="UZS",
            status="error" if "error" in response else "ok",
            raw=body,
        )
    )
    db.commit()
    return {"id": req_id, **response}
