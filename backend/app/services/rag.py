"""User-scoped retrieval over material chunks via pgvector cosine distance."""

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.llm.embeddings import embed_texts
from app.models.material import Material, MaterialChunk

TOP_K = 6


@dataclass
class RetrievedChunk:
    material_id: uuid.UUID
    material_title: str
    chunk_index: int
    content: str
    distance: float


def retrieve(
    db: Session,
    user_id: uuid.UUID,
    query: str,
    *,
    k: int = TOP_K,
    collection_id: uuid.UUID | None = None,
) -> list[RetrievedChunk]:
    query = query.strip()
    if not query:
        return []

    query_vec = embed_texts([query])[0]
    distance = MaterialChunk.embedding.cosine_distance(query_vec)

    stmt = (
        select(
            MaterialChunk.material_id,
            Material.title,
            MaterialChunk.chunk_index,
            MaterialChunk.content,
            distance.label("distance"),
        )
        .join(Material, Material.id == MaterialChunk.material_id)
        .where(MaterialChunk.user_id == user_id, Material.status == "ready")
        .order_by(distance)
        .limit(k)
    )
    if collection_id is not None:
        stmt = stmt.where(Material.collection_id == collection_id)

    return [
        RetrievedChunk(
            material_id=row.material_id,
            material_title=row.title,
            chunk_index=row.chunk_index,
            content=row.content,
            distance=float(row.distance),
        )
        for row in db.execute(stmt).all()
    ]
