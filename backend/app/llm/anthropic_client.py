"""LLM wrapper — the single chokepoint for chat completions.

Primary provider is **Groq** (OpenAI-compatible, very fast inference) called over
its REST API with httpx (no extra SDK dependency). **Anthropic Claude** is the
automatic fallback when no Groq key is configured. Every call is timed and its
token usage logged to ``llm_logs`` (Phase 9). The public surface — ``complete``,
``generate``, ``stream``, ``ChatResult``, ``AnthropicUnavailableError`` — is
unchanged so all callers (companion, quiz, plan) keep working untouched.
"""

import time
from collections.abc import Iterator
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.llm.logging import record_llm_call

MAX_TOKENS = 1024
# Lower temperature keeps a grounded, Socratic tutor from drifting off the sources.
TEMPERATURE = 0.4
_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# One reused HTTP client (connection pooling / keep-alive) instead of building a
# fresh client per request.
_http = httpx.Client(timeout=httpx.Timeout(60.0, connect=10.0))


class AnthropicUnavailableError(RuntimeError):
    """Raised when no LLM provider is configured (kept name for caller compatibility)."""


@dataclass
class ChatResult:
    text: str
    model: str
    input_tokens: int
    output_tokens: int


def _openai_messages(system: str, messages: list[dict]) -> list[dict]:
    """Groq/OpenAI take the system prompt as the first message, not a top-level field."""
    return [{"role": "system", "content": system}, *messages]


def _provider() -> str:
    if settings.groq_api_key:
        return "groq"
    if settings.anthropic_api_key:
        return "anthropic"
    raise AnthropicUnavailableError(
        "No LLM provider is configured (set GROQ_API_KEY or ANTHROPIC_API_KEY); "
        "the AI companion is unavailable."
    )


# --------------------------------------------------------------------------- #
# Groq                                                                          #
# --------------------------------------------------------------------------- #
def _groq_complete(system: str, messages: list[dict], max_tokens: int, kind: str) -> ChatResult:
    started = time.perf_counter()
    resp = _http.post(
        _GROQ_URL,
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": settings.groq_model,
            "messages": _openai_messages(system, messages),
            "max_tokens": max_tokens,
            "temperature": TEMPERATURE,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    latency_ms = int((time.perf_counter() - started) * 1000)

    text = data["choices"][0]["message"]["content"] or ""
    usage = data.get("usage", {})
    in_tok, out_tok = usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
    record_llm_call(
        kind=kind, model=settings.groq_model,
        input_tokens=in_tok, output_tokens=out_tok, latency_ms=latency_ms,
    )
    return ChatResult(text=text, model=settings.groq_model, input_tokens=in_tok, output_tokens=out_tok)


def _groq_stream(system: str, messages: list[dict], max_tokens: int, kind: str) -> Iterator[str]:
    import json

    started = time.perf_counter()
    in_tok = out_tok = 0
    with _http.stream(
        "POST",
        _GROQ_URL,
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": settings.groq_model,
            "messages": _openai_messages(system, messages),
            "max_tokens": max_tokens,
            "temperature": TEMPERATURE,
            "stream": True,
            "stream_options": {"include_usage": True},
        },
    ) as resp:
        resp.raise_for_status()
        for line in resp.iter_lines():
            if not line or not line.startswith("data: "):
                continue
            payload = line[len("data: ") :]
            if payload == "[DONE]":
                break
            chunk = json.loads(payload)
            if chunk.get("usage"):
                in_tok = chunk["usage"].get("prompt_tokens", in_tok)
                out_tok = chunk["usage"].get("completion_tokens", out_tok)
            choices = chunk.get("choices") or []
            if choices:
                delta = choices[0].get("delta", {}).get("content")
                if delta:
                    yield delta

    latency_ms = int((time.perf_counter() - started) * 1000)
    record_llm_call(
        kind=kind, model=settings.groq_model,
        input_tokens=in_tok, output_tokens=out_tok, latency_ms=latency_ms,
    )


# --------------------------------------------------------------------------- #
# Anthropic (fallback)                                                          #
# --------------------------------------------------------------------------- #
def _anthropic_complete(system: str, messages: list[dict], max_tokens: int, kind: str) -> ChatResult:
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    started = time.perf_counter()
    resp = client.messages.create(
        model=settings.anthropic_model, max_tokens=max_tokens, system=system, messages=messages,
    )
    latency_ms = int((time.perf_counter() - started) * 1000)
    text = "".join(block.text for block in resp.content if block.type == "text")
    record_llm_call(
        kind=kind, model=settings.anthropic_model,
        input_tokens=resp.usage.input_tokens, output_tokens=resp.usage.output_tokens,
        latency_ms=latency_ms,
    )
    return ChatResult(
        text=text, model=settings.anthropic_model,
        input_tokens=resp.usage.input_tokens, output_tokens=resp.usage.output_tokens,
    )


# --------------------------------------------------------------------------- #
# Public API                                                                    #
# --------------------------------------------------------------------------- #
def complete(
    system: str,
    messages: list[dict],
    max_tokens: int = MAX_TOKENS,
    kind: str = "chat",
) -> ChatResult:
    """Call the configured LLM once, record the call, and return text + usage."""
    if _provider() == "groq":
        return _groq_complete(system, messages, max_tokens, kind)
    return _anthropic_complete(system, messages, max_tokens, kind)


def generate(system: str, messages: list[dict]) -> ChatResult:
    """Companion-facing helper: a default-budget chat completion."""
    return complete(system, messages, max_tokens=MAX_TOKENS, kind="chat")


def stream(
    system: str,
    messages: list[dict],
    max_tokens: int = MAX_TOKENS,
    kind: str = "chat",
) -> Iterator[str]:
    """Yield response text deltas as they arrive (Groq only). Records usage at the end.

    Anthropic fallback has no streaming path here; callers should use ``complete``
    when Groq is not configured.
    """
    if _provider() != "groq":
        raise AnthropicUnavailableError("Streaming requires GROQ_API_KEY.")
    yield from _groq_stream(system, messages, max_tokens, kind)
