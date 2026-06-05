"""Embedding provider: sentence-transformers (local, no API key required).

The model is downloaded once on first use and cached for the process lifetime.
DEV_FAKE_EMBEDDINGS=true skips the model entirely for ultra-fast offline tests.
"""

import hashlib
import math
import random
import time
from functools import lru_cache

from app.core.config import settings
from app.llm.logging import record_llm_call


class EmbeddingUnavailableError(RuntimeError):
    """Raised when the embedding backend fails to load."""


def _fake_embedding(text: str) -> list[float]:
    seed = int.from_bytes(hashlib.sha256(text.encode("utf-8")).digest()[:8], "big")
    rng = random.Random(seed)
    vec = [rng.uniform(-1.0, 1.0) for _ in range(settings.embedding_dim)]
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    if settings.dev_fake_embeddings:
        return [_fake_embedding(t) for t in texts]

    model = _get_model()
    started = time.perf_counter()
    vectors = model.encode(texts, normalize_embeddings=True).tolist()
    latency_ms = int((time.perf_counter() - started) * 1000)
    # Local model — no token cost; we log call count via input_tokens and latency.
    record_llm_call(
        kind="embedding",
        model=settings.embedding_model,
        input_tokens=len(texts),
        output_tokens=0,
        latency_ms=latency_ms,
    )
    return vectors
