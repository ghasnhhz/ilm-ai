from datetime import date, datetime

from pydantic import BaseModel


class PlanDay(BaseModel):
    day: int
    date: str | None = None
    focus: str = ""
    materials: list[str] = []
    tasks: list[str] = []
    concepts: list[str] = []


class PlanContent(BaseModel):
    summary: str = ""
    days: list[PlanDay] = []


class LearningPlanOut(BaseModel):
    plan: PlanContent | None = None
    stale: bool = False
    goal_text: str | None = None
    target_date: date | None = None
    updated_at: datetime | None = None
