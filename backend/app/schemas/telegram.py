import uuid

from pydantic import BaseModel, Field


# --- Web (JWT-auth) ---

class LinkTokenOut(BaseModel):
    token: str
    deep_link: str


class ReminderInfo(BaseModel):
    hour: int
    minute: int


class ConnectionOut(BaseModel):
    linked: bool
    current_streak: int = 0
    longest_streak: int = 0
    reminder: ReminderInfo | None = None


class WebReminderRequest(BaseModel):
    """Set/clear the daily reminder from the web app (user comes from the JWT)."""

    hour: int | None = Field(default=None, ge=0, le=23)
    minute: int | None = Field(default=None, ge=0, le=59)


# --- Bot (shared-secret-auth) ---

class LinkRequest(BaseModel):
    token: str
    chat_id: int


class LinkResult(BaseModel):
    linked: bool
    name: str | None = None


class StatusOut(BaseModel):
    linked: bool
    current_streak: int = 0
    longest_streak: int = 0
    reminder: ReminderInfo | None = None


class BotQuizGenerateRequest(BaseModel):
    chat_id: int


class BotQuizQuestion(BaseModel):
    id: uuid.UUID
    prompt: str
    options: list[str] = []
    concept: str = ""


class BotQuizGenerateResponse(BaseModel):
    questions: list[BotQuizQuestion]


class BotQuizAnswerRequest(BaseModel):
    chat_id: int
    question_id: uuid.UUID
    answer: str = Field(min_length=1, max_length=10)


class BotQuizAnswerResponse(BaseModel):
    is_correct: bool
    explanation: str
    correct_answer: str
    streak: int | None = None


class BotFlashcardGenerateRequest(BaseModel):
    chat_id: int


class BotFlashcard(BaseModel):
    front: str
    back: str
    concept: str = ""


class BotFlashcardGenerateResponse(BaseModel):
    flashcards: list[BotFlashcard]


class ReminderRequest(BaseModel):
    chat_id: int
    hour: int | None = Field(default=None, ge=0, le=23)
    minute: int | None = Field(default=None, ge=0, le=59)


class DueReminder(BaseModel):
    chat_id: int
    streak: int
