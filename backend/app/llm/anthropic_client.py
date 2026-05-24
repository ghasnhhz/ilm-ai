"""Claude wrapper. Returns generated text plus token usage for later logging (Phase 9)."""

from dataclasses import dataclass

from app.core.config import settings

MAX_TOKENS = 1024


class AnthropicUnavailableError(RuntimeError):
    """Raised when ANTHROPIC_API_KEY is not configured."""


@dataclass
class ChatResult:
    text: str
    model: str
    input_tokens: int
    output_tokens: int


def generate(system: str, messages: list[dict]) -> ChatResult:
    if not settings.anthropic_api_key:
        raise AnthropicUnavailableError(
            "ANTHROPIC_API_KEY is not configured; the AI companion is unavailable."
        )

    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=messages,
    )
    text = "".join(block.text for block in resp.content if block.type == "text")
    return ChatResult(
        text=text,
        model=settings.anthropic_model,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
    )
