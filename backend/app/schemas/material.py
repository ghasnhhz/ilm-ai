import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CollectionUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CollectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


class PasteRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1)
    collection_id: uuid.UUID | None = None


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    file_type: str
    status: str
    error: str | None
    collection_id: uuid.UUID | None
    chunk_count: int = 0
    created_at: datetime


class ChunkPreview(BaseModel):
    chunk_index: int
    content: str
    token_count: int


class MaterialDetail(MaterialOut):
    chunks: list[ChunkPreview] = []
