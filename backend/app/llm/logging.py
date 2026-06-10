"""Persist one ``llm_logs`` row per Claude / Groq / embedding call.

Called from inside the llm/ layer. The DB insert is dispatched to a small
background thread pool so it never adds its (~1 remote round-trip) cost to the
user's request — a chat request makes two LLM calls, so a blocking insert would
add ~2.6s here. The request context is captured in the calling thread and passed
explicitly because ContextVars do not propagate to pool threads. Every error is
swallowed: monitoring must never break or slow a user request.
"""

import atexit
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

from app.core.context import get_request_context

logger = logging.getLogger(__name__)

# Cap stored prompt/response text so a long source-grounded chat can't bloat a row.
TEXT_CAP = 4000

# Tiny dedicated pool; logging is low-volume and must not starve request threads.
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="llm-log")
atexit.register(_executor.shutdown, wait=True)


def _truncate(text: str | None) -> str | None:
    if text is None:
        return None
    return text[:TEXT_CAP]


def _write(
    *,
    user_id: uuid.UUID | None,
    endpoint: str | None,
    kind: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
    prompt: str | None,
    response: str | None,
) -> None:
    try:
        from app.core.db import SessionLocal
        from app.models.llm_log import LLMLog

        db = SessionLocal()
        try:
            db.add(
                LLMLog(
                    user_id=user_id,
                    kind=kind,
                    model=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    tokens=input_tokens + output_tokens,
                    latency_ms=latency_ms,
                    endpoint=endpoint,
                    prompt=prompt,
                    response=response,
                )
            )
            db.commit()
        finally:
            db.close()
    except Exception:  # pragma: no cover - logging must never break the request
        logger.warning("failed to record llm call (kind=%s)", kind, exc_info=True)


def record_llm_call(
    kind: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
    prompt: str | None = None,
    response: str | None = None,
) -> None:
    # Capture request-scoped context now, in the caller's thread, then hand the
    # plain values off to a background thread to write without blocking. ``prompt``
    # and ``response`` default to None so non-text callers (e.g. embeddings) are
    # unaffected; both are truncated to TEXT_CAP before persisting.
    ctx = get_request_context()
    _executor.submit(
        _write,
        user_id=ctx["user_id"],
        endpoint=ctx["endpoint"],
        kind=kind,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        latency_ms=latency_ms,
        prompt=_truncate(prompt),
        response=_truncate(response),
    )
