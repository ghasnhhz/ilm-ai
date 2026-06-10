import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import SessionLocal, get_db
from app.models.material import Collection, Material, MaterialChunk
from app.models.user import User
from app.schemas.material import ChunkPreview, MaterialDetail, MaterialOut, PasteRequest
from app.services import limits, plan_agent, storage
from app.services.limits import LimitExceeded
from app.services.embeddings import embed_chunks
from app.services.ingest import ALL_SUPPORTED_TYPES, chunk_text, extract_text

router = APIRouter(prefix="/materials", tags=["materials"])

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "gif": "image/gif",
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


def _create_processing_material(
    db: Session,
    *,
    user: User,
    title: str,
    file_type: str,
    filename: str,
    collection_id: uuid.UUID | None,
) -> tuple[Material, str]:
    """Persist a 'processing' Material row immediately and return it with its storage
    key. The slow work (storage upload + extract→chunk→embed) runs in the background
    so the request returns at once. Returns (material, storage_key)."""
    material_id = uuid.uuid4()
    key = storage.build_key(user.id, material_id, filename)
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
    db.commit()
    return material, key


def _process_material(
    material_id: uuid.UUID,
    user_id: uuid.UUID,
    key: str,
    raw: bytes,
    content_type: str,
    file_type: str,
) -> None:
    """Background worker: do the slow storage + embedding work WITHOUT holding a DB
    connection (the remote pooler drops connections held open too long), then open a
    short-lived session just to persist chunks and flip the material status."""
    status_val = "ready"
    error: str | None = None
    rows: list = []
    try:
        storage.put_object(key, raw, content_type)
        text = extract_text(raw, file_type)
        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("No extractable text found in the document.")
        vectors = embed_chunks([c.content for c in chunks])
        rows = list(zip(chunks, vectors))
    except Exception as exc:  # noqa: BLE001 - record failure on the material, don't crash
        status_val, error = "failed", str(exc)[:1000]

    db = SessionLocal()
    try:
        material = db.get(Material, material_id)
        if material is None:
            return
        if status_val == "ready":
            for index, (chunk, vector) in enumerate(rows):
                db.add(
                    MaterialChunk(
                        material_id=material_id,
                        user_id=user_id,
                        chunk_index=index,
                        content=chunk.content,
                        embedding=vector,
                        token_count=chunk.token_count,
                    )
                )
            material.status = "ready"
        else:
            material.status = "failed"
            material.error = error
        db.commit()
        if material.status == "ready":
            plan_agent.mark_stale(db, user_id)
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def upload_material(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    collection_id: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialOut:
    try:
        limits.check_upload_limit(db, current_user.id)
    except LimitExceeded as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e))

    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALL_SUPPORTED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}'. Allowed: PDF, DOCX, TXT, or an image (PNG/JPG/WEBP).",
        )

    coll_id = _parse_uuid(collection_id)
    _validate_collection(db, current_user, coll_id)

    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    material, key = _create_processing_material(
        db,
        user=current_user,
        title=(title or filename).strip()[:500],
        file_type=ext,
        filename=filename,
        collection_id=coll_id,
    )
    background_tasks.add_task(
        _process_material,
        material.id,
        current_user.id,
        key,
        raw,
        file.content_type or CONTENT_TYPES.get(ext, "application/octet-stream"),
        ext,
    )
    # Returns immediately with status="processing"; the client polls GET /materials/{id}.
    return _material_out(material, 0)


@router.post("/paste", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def paste_material(
    payload: PasteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialOut:
    try:
        limits.check_upload_limit(db, current_user.id)
    except LimitExceeded as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e))

    _validate_collection(db, current_user, payload.collection_id)

    material, key = _create_processing_material(
        db,
        user=current_user,
        title=payload.title.strip()[:500],
        file_type="txt",
        filename=f"{payload.title.strip()[:60] or 'pasted'}.txt",
        collection_id=payload.collection_id,
    )
    background_tasks.add_task(
        _process_material,
        material.id,
        current_user.id,
        key,
        payload.text.encode("utf-8"),
        "text/plain",
        "txt",
    )
    return _material_out(material, 0)


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
