"""Quiz generation and grading via Claude."""

import json
import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.llm import anthropic_client
from app.models.quiz import QuizAnswer, QuizQuestion, QuizSession
from app.services import rag

DIFFICULTY_LABELS = {
    "gentle": "basic recall — definitions and key facts only",
    "solid": "solid understanding — mechanisms and relationships between concepts",
    "expert": "expert level — application, analysis, and synthesis",
}

DIFFICULTY_QUERIES = {
    "gentle": "fundamental concepts definitions key terms",
    "solid": "key concepts mechanisms relationships processes",
    "expert": "advanced applications edge cases synthesis comparison",
}


def _extract_json(text: str) -> list[dict]:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON array in Claude response: {text[:300]}")
    return json.loads(text[start : end + 1])


def generate_quiz(
    db: Session,
    user_id: uuid.UUID,
    collection_id: uuid.UUID | None,
    difficulty: str,
    n_questions: int = 5,
) -> tuple[QuizSession, list[QuizQuestion]]:
    difficulty = difficulty.lower()
    if difficulty not in DIFFICULTY_LABELS:
        difficulty = "solid"

    chunks = rag.retrieve(
        db, user_id, DIFFICULTY_QUERIES[difficulty], k=15, collection_id=collection_id
    )
    if not chunks:
        raise ValueError(
            "No study materials found. Upload some materials and wait for them to finish processing."
        )

    context = "\n\n---\n\n".join(
        f"[{c.material_title}]\n{c.content}" for c in chunks[:10]
    )

    system = (
        "You are a precise quiz generator. "
        "Generate questions ONLY from the provided study material. "
        "Return ONLY a valid JSON array — no prose, no markdown fences, just the raw JSON array. "
        "Each element must have exactly these fields:\n"
        '  "type": "mc" or "short"\n'
        '  "prompt": the question text\n'
        '  "options": for mc, exactly 4 strings like ["A) ...", "B) ...", "C) ...", "D) ..."]; for short, []\n'
        '  "correct_answer": for mc, a single letter A/B/C/D; for short, the expected answer (concise)\n'
        '  "concept": 1-4 words naming the main concept tested\n'
        '  "explanation": 1-2 sentence explanation of the correct answer'
    )

    mc_count = max(1, n_questions // 2)
    short_count = n_questions - mc_count
    user_msg = (
        f"Study material:\n\n{context}\n\n"
        f"Generate exactly {n_questions} questions at {DIFFICULTY_LABELS[difficulty]} difficulty. "
        f"Include {mc_count} multiple-choice and {short_count} short-answer questions. "
        "Return only the JSON array."
    )

    result = anthropic_client.complete(
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=2048,
        kind="quiz_generate",
    )
    items = _extract_json(result.text)

    first_material_id = chunks[0].material_id if chunks else None

    session = QuizSession(
        user_id=user_id,
        collection_id=collection_id,
        difficulty=difficulty,
        total_q=len(items),
        score=0,
    )
    db.add(session)
    db.flush()

    questions: list[QuizQuestion] = []
    for item in items:
        q = QuizQuestion(
            session_id=session.id,
            question_type=item.get("type", "short"),
            prompt=item.get("prompt", ""),
            options=item.get("options", []) or [],
            correct_answer=str(item.get("correct_answer", "")),
            source_material_id=first_material_id,
            concept=item.get("concept", ""),
            explanation=item.get("explanation", ""),
        )
        db.add(q)
        questions.append(q)

    db.commit()
    db.refresh(session)
    for q in questions:
        db.refresh(q)

    return session, questions


@dataclass
class GradeResult:
    is_correct: bool
    explanation: str
    correct_answer: str


def mc_is_correct(user_answer: str, correct_answer: str) -> bool:
    """Compare a multiple-choice answer by its leading letter (A/B/C/D), case-insensitively.

    The frontend sends the chosen option's letter (derived from its index), and the
    stored ``correct_answer`` is a single letter, so grading keys off the first character.
    """
    return user_answer.strip().upper()[:1] == correct_answer.strip().upper()[:1]


def grade_answer(
    db: Session,
    user_id: uuid.UUID,
    question_id: uuid.UUID,
    user_answer: str,
) -> GradeResult:
    q = db.scalar(select(QuizQuestion).where(QuizQuestion.id == question_id))
    if q is None:
        raise ValueError("Question not found")

    if q.question_type == "mc":
        is_correct = mc_is_correct(user_answer, q.correct_answer)
        explanation = q.explanation or (
            "Correct!" if is_correct else f"The correct answer is {q.correct_answer}."
        )
    else:
        system = (
            "You are a strict but fair grader. "
            "Evaluate whether the student's answer is correct. "
            "Respond with a JSON object only: "
            '{"is_correct": true/false, "explanation": "one sentence feedback"}'
        )
        user_msg = (
            f"Question: {q.prompt}\n"
            f"Expected answer: {q.correct_answer}\n"
            f"Student answer: {user_answer}\n\n"
            "Grade and return JSON only."
        )
        result = anthropic_client.complete(
            system=system,
            messages=[{"role": "user", "content": user_msg}],
            max_tokens=256,
            kind="quiz_grade",
        )
        raw = result.text
        try:
            cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
            data = json.loads(cleaned)
            is_correct = bool(data.get("is_correct", False))
            explanation = data.get("explanation", "")
        except Exception:
            is_correct = False
            explanation = raw[:200]

    answer = QuizAnswer(
        question_id=question_id,
        user_id=user_id,
        user_answer=user_answer,
        is_correct=is_correct,
        explanation=explanation,
    )
    db.add(answer)

    session = db.scalar(select(QuizSession).where(QuizSession.id == q.session_id))
    if session and is_correct:
        session.score = (session.score or 0) + 1

    db.commit()
    db.refresh(answer)

    return GradeResult(
        is_correct=is_correct,
        explanation=explanation,
        correct_answer=q.correct_answer,
    )
