import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.material import Collection, Material, MaterialChunk
from app.models.user import User
from app.schemas.material import ChunkPreview, MaterialDetail, MaterialOut, PasteRequest
from app.services import plan_agent, storage
from app.services.embeddings import embed_chunks
from app.services.ingest import SUPPORTED_TYPES, chunk_text, extract_text

router = APIRouter(prefix="/materials", tags=["materials"])

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}
PREVIEW_CHUNKS = 5
PREVIEW_CHARS = 300


def _parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid id")


def _validate_collection(db: Session, user: User, collection_id: uuid.UUID | None) -> None:
    if collection_id is None:
        return
    owned = db.scalar(
        select(Collection).where(
            Collection.id == collection_id, Collection.user_id == user.id
        )
    )
    if owned is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")


def _material_out(material: Material, chunk_count: int) -> MaterialOut:
    out = MaterialOut.model_validate(material)
    out.chunk_count = chunk_count
    return out


def _ingest(
    db: Session,
    *,
    user: User,
    title: str,
    file_type: str,
    raw: bytes,
    content_type: str,
    filename: str,
    collection_id: uuid.UUID | None,
) -> Material:
    """Store raw bytes, then extract→chunk→embed synchronously. status ends ready/failed."""
    material_id = uuid.uuid4()
    key = storage.build_key(user.id, material_id, filename)
    storage.put_object(key, raw, content_type)  # raises 500 if storage unconfigured

    material = Material(
        id=material_id,
        user_id=user.id,
        collection_id=collection_id,
        title=title,
        file_type=file_type,
        storage_key=key,
        status="processing",
    )
    db.add(material)

    try:
        text = extract_text(raw, file_type)
        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("No extractable text found in the document.")
        vectors = embed_chunks([c.content for c in chunks])
        for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
            db.add(
                MaterialChunk(
                    material_id=material.id,
                    user_id=user.id,
                    chunk_index=index,
                    content=chunk.content,
                    embedding=vector,
                    token_count=chunk.token_count,
                )
            )
        material.status = "ready"
    except Exception as exc:  # noqa: BLE001 - record failure on the material, don't 500
        db.rollback()
        db.add(material)
        material.status = "failed"
        material.error = str(exc)[:1000]

    db.commit()
    db.refresh(material)
    if material.status == "ready":
        plan_agent.mark_stale(db, user.id)
    return material


@router.post("/upload", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def upload_material(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    collection_id: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialOut:
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}'. Allowed: PDF, DOCX, TXT.",
        )

    coll_id = _parse_uuid(collection_id)
    _validate_collection(db, current_user, coll_id)

    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    material = _ingest(
        db,
        user=current_user,
        title=(title or filename).strip()[:500],
        file_type=ext,
        raw=raw,
        content_type=file.content_type or CONTENT_TYPES.get(ext, "application/octet-stream"),
        filename=filename,
        collection_id=coll_id,
    )
    return _material_out(material, len(material.chunks))


@router.post("/paste", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def paste_material(
    payload: PasteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialOut:
    _validate_collection(db, current_user, payload.collection_id)

    material = _ingest(
        db,
        user=current_user,
        title=payload.title.strip()[:500],
        file_type="txt",
        raw=payload.text.encode("utf-8"),
        content_type="text/plain",
        filename=f"{payload.title.strip()[:60] or 'pasted'}.txt",
        collection_id=payload.collection_id,
    )
    return _material_out(material, len(material.chunks))


@router.get("", response_model=list[MaterialOut])
def list_materials(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MaterialOut]:
    rows = db.execute(
        select(Material, func.count(MaterialChunk.id))
        .outerjoin(MaterialChunk, MaterialChunk.material_id == Material.id)
        .where(Material.user_id == current_user.id)
        .group_by(Material.id)
        .order_by(Material.created_at.desc())
    ).all()
    return [_material_out(material, count) for material, count in rows]


@router.get("/{material_id}", response_model=MaterialDetail)
def get_material(
    material_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialDetail:
    material = db.scalar(
        select(Material).where(
            Material.id == material_id, Material.user_id == current_user.id
        )
    )
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    base = _material_out(material, len(material.chunks))
    return MaterialDetail(
        **base.model_dump(),
        chunks=[
            ChunkPreview(
                chunk_index=c.chunk_index,
                content=c.content[:PREVIEW_CHARS],
                token_count=c.token_count,
            )
            for c in material.chunks[:PREVIEW_CHUNKS]
        ],
    )


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    material = db.scalar(
        select(Material).where(
            Material.id == material_id, Material.user_id == current_user.id
        )
    )
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    storage.delete_object(material.storage_key)
    db.delete(material)  # cascade removes chunks
    db.commit()
