import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.quiz import QuizAnswer, QuizQuestion, QuizSession
from app.models.user import User
from app.schemas.quiz import (
    AnswerDetail,
    QuizAnswerOut,
    QuizAnswerRequest,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestionOut,
    QuizResultsOut,
    QuizSessionOut,
    QuizStatsOut,
)
from app.services import quiz as quiz_service

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate", response_model=QuizGenerateResponse)
def generate(
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizGenerateResponse:
    try:
        session, questions = quiz_service.generate_quiz(
            db,
            current_user.id,
            payload.collection_id,
            payload.difficulty,
            payload.n_questions,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {e}",
        )
    return QuizGenerateResponse(
        session_id=session.id,
        questions=[QuizQuestionOut.model_validate(q) for q in questions],
    )


@router.post("/answer", response_model=QuizAnswerOut)
def answer_question(
    payload: QuizAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizAnswerOut:
    try:
        result = quiz_service.grade_answer(
            db,
            current_user.id,
            payload.question_id,
            payload.user_answer,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return QuizAnswerOut(
        is_correct=result.is_correct,
        explanation=result.explanation,
        correct_answer=result.correct_answer,
    )


@router.get("/results/{session_id}", response_model=QuizResultsOut)
def get_results(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizResultsOut:
    session = db.scalar(
        select(QuizSession).where(
            QuizSession.id == session_id,
            QuizSession.user_id == current_user.id,
        )
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    questions = db.scalars(
        select(QuizQuestion)
        .where(QuizQuestion.session_id == session_id)
        .order_by(QuizQuestion.created_at)
    ).all()

    answered_q_ids = set(
        db.scalars(
            select(QuizAnswer.question_id).where(QuizAnswer.user_id == current_user.id)
        ).all()
    )

    answer_details: list[AnswerDetail] = []
    for q in questions:
        if q.id in answered_q_ids:
            ans = db.scalar(
                select(QuizAnswer)
                .where(
                    QuizAnswer.question_id == q.id,
                    QuizAnswer.user_id == current_user.id,
                )
                .order_by(QuizAnswer.created_at.desc())
            )
        else:
            ans = None

        answer_details.append(
            AnswerDetail(
                question_id=q.id,
                prompt=q.prompt,
                correct_answer=q.correct_answer,
                user_answer=ans.user_answer if ans else None,
                is_correct=ans.is_correct if ans else None,
                explanation=(ans.explanation if ans else q.explanation) or "",
                concept=q.concept or "",
            )
        )

    return QuizResultsOut(
        session_id=session.id,
        score=session.score,
        total=session.total_q,
        difficulty=session.difficulty,
        answers=answer_details,
    )


@router.get("/sessions", response_model=list[QuizSessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[QuizSessionOut]:
    rows = db.scalars(
        select(QuizSession)
        .where(QuizSession.user_id == current_user.id)
        .order_by(QuizSession.created_at.desc())
    ).all()
    return [QuizSessionOut.model_validate(s) for s in rows]


@router.get("/stats", response_model=QuizStatsOut)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizStatsOut:
    sessions = db.scalars(
        select(QuizSession).where(QuizSession.user_id == current_user.id)
    ).all()

    sessions_completed = len(sessions)
    if sessions_completed == 0:
        return QuizStatsOut(sessions_completed=0, topics_covered=0, knowledge_score=0)

    session_ids = [s.id for s in sessions]
    questions = db.scalars(
        select(QuizQuestion).where(QuizQuestion.session_id.in_(session_ids))
    ).all()

    answered_q_ids = set(
        db.scalars(
            select(QuizAnswer.question_id).where(QuizAnswer.user_id == current_user.id)
        ).all()
    )

    concepts: set[str] = set()
    for q in questions:
        if q.id in answered_q_ids and q.concept:
            concepts.add(q.concept.lower().strip())

    total_q = sum(s.total_q for s in sessions)
    total_score = sum(s.score for s in sessions)
    knowledge_score = round((total_score / total_q * 100) if total_q > 0 else 0)

    return QuizStatsOut(
        sessions_completed=sessions_completed,
        topics_covered=len(concepts),
        knowledge_score=knowledge_score,
    )
