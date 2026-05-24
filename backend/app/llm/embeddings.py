"""Embedding provider: OpenAI text-embedding-3-small, with an opt-in dev fallback.

- Real key (`OPENAI_API_KEY`) -> batch call OpenAI.
- No key + `DEV_FAKE_EMBEDDINGS=true` -> deterministic local vectors (dev/offline only).
- No key + flag off -> raise, so the caller marks the material `failed` honestly.
"""

import hashlib
import math
import random

from app.core.config import settings


class EmbeddingUnavailableError(RuntimeError):
    """Raised when no embedding backend is configured."""


def _fake_embedding(text: str) -> list[float]:
    seed = int.from_bytes(hashlib.sha256(text.encode("utf-8")).digest()[:8], "big")
    rng = random.Random(seed)
    vec = [rng.uniform(-1.0, 1.0) for _ in range(settings.embedding_dim)]
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    if settings.openai_api_key:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.embeddings.create(model=settings.embedding_model, input=texts)
        return [item.embedding for item in resp.data]

    if settings.dev_fake_embeddings:
        return [_fake_embedding(t) for t in texts]

    raise EmbeddingUnavailableError(
        "No embedding backend configured: set OPENAI_API_KEY "
        "(or DEV_FAKE_EMBEDDINGS=true for offline development)."
    )
