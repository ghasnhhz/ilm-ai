import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    material_id: uuid.UUID
    material_title: str
    chunk_index: int
    snippet: str


class MessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    session_id: uuid.UUID | None = None
    collection_id: uuid.UUID | None = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    citations: list[Citation] | None = None
    created_at: datetime


class MessageResponse(BaseModel):
    session_id: uuid.UUID
    message: ChatMessageOut


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    created_at: datetime


class HistoryOut(BaseModel):
    session_id: uuid.UUID
    messages: list[ChatMessageOut]
