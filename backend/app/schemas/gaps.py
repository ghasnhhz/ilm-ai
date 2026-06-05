import uuid

from pydantic import BaseModel


class ConceptStat(BaseModel):
    concept: str
    total: int
    correct: int
    accuracy: int  # percentage 0-100


class GapItem(BaseModel):
    concept: str
    wrong_count: int
    sessions: int
    materials: list[str] = []


class SuggestedSection(BaseModel):
    material_id: uuid.UUID
    title: str
    concepts: list[str] = []


class GapsReport(BaseModel):
    strong: list[ConceptStat] = []
    gaps: list[GapItem] = []
    suggested_sections: list[SuggestedSection] = []
