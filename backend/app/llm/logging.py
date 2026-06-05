"""Persist one ``llm_logs`` row per Claude / embedding call.

Called from inside the llm/ layer. Opens its own short-lived session (rather than
borrowing the request's) so it never interferes with the caller's transaction, and
swallows every error — monitoring must never break a user request.
"""

import logging

from app.core.context import get_request_context

logger = logging.getLogger(__name__)


def record_llm_call(
    kind: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
) -> None:
    try:
        from app.core.db import SessionLocal
        from app.models.llm_log import LLMLog

        ctx = get_request_context()
        db = SessionLocal()
        try:
            db.add(
                LLMLog(
                    user_id=ctx["user_id"],
                    kind=kind,
                    model=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    tokens=input_tokens + output_tokens,
                    latency_ms=latency_ms,
                    endpoint=ctx["endpoint"],
                )
            )
            db.commit()
        finally:
            db.close()
    except Exception:  # pragma: no cover - logging must never break the request
        logger.warning("failed to record llm call (kind=%s)", kind, exc_info=True)
