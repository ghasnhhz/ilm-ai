import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.material import Collection
from app.models.user import User
from app.schemas.material import CollectionCreate, CollectionOut, CollectionUpdate

router = APIRouter(prefix="/collections", tags=["collections"])


def _get_owned(db: Session, user: User, collection_id: uuid.UUID) -> Collection:
    coll = db.scalar(
        select(Collection).where(
            Collection.id == collection_id, Collection.user_id == user.id
        )
    )
    if coll is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    return coll


@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CollectionOut:
    coll = Collection(user_id=current_user.id, name=payload.name.strip())
    db.add(coll)
    db.commit()
    db.refresh(coll)
    return CollectionOut.model_validate(coll)


@router.get("", response_model=list[CollectionOut])
def list_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CollectionOut]:
    rows = db.scalars(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
    ).all()
    return [CollectionOut.model_validate(c) for c in rows]


@router.put("/{collection_id}", response_model=CollectionOut)
def rename_collection(
    collection_id: uuid.UUID,
    payload: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CollectionOut:
    coll = _get_owned(db, current_user, collection_id)
    coll.name = payload.name.strip()
    db.commit()
    db.refresh(coll)
    return CollectionOut.model_validate(coll)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    coll = _get_owned(db, current_user, collection_id)
    db.delete(coll)  # materials.collection_id -> NULL via ON DELETE SET NULL
    db.commit()
