from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.models.telegram import TelegramLink
from app.models.user import User
from app.schemas.telegram import (
    BotFlashcard,
    BotFlashcardGenerateRequest,
    BotFlashcardGenerateResponse,
    BotQuizAnswerRequest,
    BotQuizAnswerResponse,
    BotQuizGenerateRequest,
    BotQuizGenerateResponse,
    BotQuizQuestion,
    ConnectionOut,
    DueReminder,
    LinkRequest,
    LinkResult,
    LinkTokenOut,
    ReminderInfo,
    ReminderRequest,
    StatusOut,
    WebReminderRequest,
)
from app.services import flashcard as flashcard_service
from app.services import limits
from app.services import quiz as quiz_service
from app.services import telegram_service
from app.services.limits import LimitExceeded
from app.services.telegram_service import LinkError

router = APIRouter(prefix="/telegram", tags=["telegram"])


def require_bot_secret(x_telegram_secret: str = Header(default="")) -> None:
    if (
        not settings.telegram_bot_secret
        or x_telegram_secret != settings.telegram_bot_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bot secret"
        )


def _reminder_info(link) -> ReminderInfo | None:
    if link and link.reminder_hour is not None and link.reminder_minute is not None:
        return ReminderInfo(hour=link.reminder_hour, minute=link.reminder_minute)
    return None


# --- Web endpoints (JWT) -----------------------------------------------------

@router.post("/link-token", response_model=LinkTokenOut)
def link_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LinkTokenOut:
    token = telegram_service.create_link_token(db, current_user.id)
    username = settings.telegram_bot_username or "your_bot"
    return LinkTokenOut(token=token, deep_link=f"https://t.me/{username}?start={token}")


@router.get("/connection", response_model=ConnectionOut)
def connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConnectionOut:
    link = db.scalar(
        select(TelegramLink).where(TelegramLink.user_id == current_user.id)
    )
    if link is None:
        return ConnectionOut(linked=False)
    return ConnectionOut(
        linked=True,
        current_streak=link.current_streak,
        longest_streak=link.longest_streak,
        reminder=_reminder_info(link),
    )


@router.put("/reminder", response_model=ReminderInfo | None)
def set_reminder_web(
    payload: WebReminderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReminderInfo | None:
    # A time needs both fields; if either is missing, treat it as clearing.
    hour, minute = payload.hour, payload.minute
    if hour is None or minute is None:
        hour = minute = None
    try:
        telegram_service.set_reminder_for_user(db, current_user.id, hour, minute)
    except LinkError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if hour is None or minute is None:
        return None
    return ReminderInfo(hour=hour, minute=minute)


# --- Bot endpoints (shared secret) -------------------------------------------

@router.post("/link", response_model=LinkResult, dependencies=[Depends(require_bot_secret)])
def link(payload: LinkRequest, db: Session = Depends(get_db)) -> LinkResult:
    try:
        name = telegram_service.link_account(db, payload.token, payload.chat_id)
    except LinkError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return LinkResult(linked=True, name=name)


@router.get("/status", response_model=StatusOut, dependencies=[Depends(require_bot_secret)])
def status_for_chat(chat_id: int, db: Session = Depends(get_db)) -> StatusOut:
    link = telegram_service.get_link(db, chat_id)
    if link is None:
        return StatusOut(linked=False)
    return StatusOut(
        linked=True,
        current_streak=link.current_streak,
        longest_streak=link.longest_streak,
        reminder=_reminder_info(link),
    )


@router.post(
    "/quiz/generate",
    response_model=BotQuizGenerateResponse,
    dependencies=[Depends(require_bot_secret)],
)
def bot_quiz_generate(
    payload: BotQuizGenerateRequest, db: Session = Depends(get_db)
) -> BotQuizGenerateResponse:
    try:
        user_id = telegram_service.resolve_user_id(db, payload.chat_id)
    except LinkError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    try:
        limits.check_quiz_limit(db, user_id)
    except LimitExceeded as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e))
    try:
        _session, questions = quiz_service.generate_quiz(db, user_id, None, "solid", 5)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {e}",
        )
    # The bot only supports tappable multiple-choice questions.
    mc = [q for q in questions if q.question_type == "mc"]
    return BotQuizGenerateResponse(
        questions=[
            BotQuizQuestion(
                id=q.id, prompt=q.prompt, options=q.options or [], concept=q.concept or ""
            )
            for q in mc
        ]
    )


@router.post(
    "/quiz/answer",
    response_model=BotQuizAnswerResponse,
    dependencies=[Depends(require_bot_secret)],
)
def bot_quiz_answer(
    payload: BotQuizAnswerRequest, db: Session = Depends(get_db)
) -> BotQuizAnswerResponse:
    try:
        user_id = telegram_service.resolve_user_id(db, payload.chat_id)
    except LinkError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    try:
        result = quiz_service.grade_answer(db, user_id, payload.question_id, payload.answer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    streak = telegram_service.record_activity(db, user_id)
    return BotQuizAnswerResponse(
        is_correct=result.is_correct,
        explanation=result.explanation,
        correct_answer=result.correct_answer,
        streak=streak,
    )


@router.post(
    "/flashcards/generate",
    response_model=BotFlashcardGenerateResponse,
    dependencies=[Depends(require_bot_secret)],
)
def bot_flashcards_generate(
    payload: BotFlashcardGenerateRequest, db: Session = Depends(get_db)
) -> BotFlashcardGenerateResponse:
    try:
        user_id = telegram_service.resolve_user_id(db, payload.chat_id)
    except LinkError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    try:
        cards = flashcard_service.generate_flashcards(db, user_id, None, 8)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate flashcards: {e}",
        )
    return BotFlashcardGenerateResponse(
        flashcards=[
            BotFlashcard(front=c.front, back=c.back, concept=c.concept) for c in cards
        ]
    )


@router.post("/reminder", dependencies=[Depends(require_bot_secret)])
def set_reminder(payload: ReminderRequest, db: Session = Depends(get_db)) -> dict:
    try:
        telegram_service.set_reminder(db, payload.chat_id, payload.hour, payload.minute)
    except LinkError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return {"ok": True}


@router.get(
    "/reminders/due",
    response_model=list[DueReminder],
    dependencies=[Depends(require_bot_secret)],
)
def reminders_due(db: Session = Depends(get_db)) -> list[DueReminder]:
    return [DueReminder(**r) for r in telegram_service.due_reminders(db)]
