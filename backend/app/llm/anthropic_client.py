"""Claude wrapper. Single chokepoint for Claude calls: times each call, logs token
usage to ``llm_logs`` (Phase 9), and returns the generated text plus usage."""

import time
from dataclasses import dataclass

from app.core.config import settings
from app.llm.logging import record_llm_call

MAX_TOKENS = 1024


class AnthropicUnavailableError(RuntimeError):
    """Raised when ANTHROPIC_API_KEY is not configured."""


@dataclass
class ChatResult:
    text: str
    model: str
    input_tokens: int
    output_tokens: int


def complete(
    system: str,
    messages: list[dict],
    max_tokens: int = MAX_TOKENS,
    kind: str = "chat",
) -> ChatResult:
    """Call Claude once, record the call, and return text + token usage."""
    if not settings.anthropic_api_key:
        raise AnthropicUnavailableError(
            "ANTHROPIC_API_KEY is not configured; the AI companion is unavailable."
        )

    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    started = time.perf_counter()
    resp = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    latency_ms = int((time.perf_counter() - started) * 1000)

    text = "".join(block.text for block in resp.content if block.type == "text")
    record_llm_call(
        kind=kind,
        model=settings.anthropic_model,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
        latency_ms=latency_ms,
    )
    return ChatResult(
        text=text,
        model=settings.anthropic_model,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
    )


def generate(system: str, messages: list[dict]) -> ChatResult:
    """Companion-facing helper: a default-budget chat completion."""
    return complete(system, messages, max_tokens=MAX_TOKENS, kind="chat")
