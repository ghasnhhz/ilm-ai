import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class QuizGenerateRequest(BaseModel):
    collection_id: uuid.UUID | None = None
    difficulty: str = Field(default="solid", pattern="^(gentle|solid|expert)$")
    n_questions: int = Field(default=5, ge=3, le=10)


class QuizQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    question_type: str
    prompt: str
    options: list[str] = []
    concept: str = ""


class QuizGenerateResponse(BaseModel):
    session_id: uuid.UUID
    questions: list[QuizQuestionOut]


class QuizAnswerRequest(BaseModel):
    question_id: uuid.UUID
    user_answer: str = Field(min_length=1, max_length=2000)


class QuizAnswerOut(BaseModel):
    is_correct: bool
    explanation: str
    correct_answer: str


class AnswerDetail(BaseModel):
    question_id: uuid.UUID
    prompt: str
    correct_answer: str
    user_answer: str | None
    is_correct: bool | None
    explanation: str | None
    concept: str


class QuizResultsOut(BaseModel):
    session_id: uuid.UUID
    score: int
    total: int
    difficulty: str
    answers: list[AnswerDetail]


class QuizSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    difficulty: str
    total_q: int
    score: int
    created_at: datetime


class QuizStatsOut(BaseModel):
    sessions_completed: int
    topics_covered: int
    knowledge_score: int
