"""Request-scoped context for monitoring.

A single ``ContextVar`` carries the current request's endpoint path and user id so
the llm/ layer can attach them to ``llm_logs`` rows without changing any service
signatures. The HTTP middleware (see ``app.main``) sets the endpoint at the start of
each request; ``get_current_user`` fills in the user id once auth resolves.
"""

import uuid
from contextvars import ContextVar
from typing import TypedDict


class RequestContext(TypedDict):
    endpoint: str | None
    user_id: uuid.UUID | None


_ctx: ContextVar[RequestContext] = ContextVar(
    "request_context", default={"endpoint": None, "user_id": None}
)


def set_request_endpoint(endpoint: str | None) -> None:
    _ctx.set({"endpoint": endpoint, "user_id": None})


def set_request_user(user_id: uuid.UUID | None) -> None:
    current = _ctx.get()
    _ctx.set({"endpoint": current["endpoint"], "user_id": user_id})


def get_request_context() -> RequestContext:
    return _ctx.get()
