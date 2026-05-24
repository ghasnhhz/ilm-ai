"""Embedding provider: sentence-transformers (local, no API key required).

The model is downloaded once on first use and cached for the process lifetime.
DEV_FAKE_EMBEDDINGS=true skips the model entirely for ultra-fast offline tests.
"""

import hashlib
import math
import random
from functools import lru_cache

from app.core.config import settings


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
    return model.encode(texts, normalize_embeddings=True).tolist()
