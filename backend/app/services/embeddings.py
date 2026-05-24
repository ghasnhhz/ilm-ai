"""Batch embedding of material chunks, aligned 1:1 with the input order."""

from app.llm.embeddings import embed_texts

BATCH_SIZE = 100


def embed_chunks(contents: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for start in range(0, len(contents), BATCH_SIZE):
        batch = contents[start : start + BATCH_SIZE]
        vectors.extend(embed_texts(batch))
    return vectors
