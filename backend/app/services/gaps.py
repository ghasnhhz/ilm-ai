"""Knowledge gap detection.

Gaps are computed on the fly from the quiz tables so the report is always live —
it reflects every session the user has completed, with no stored snapshot to keep
in sync (brief feature #5: "not static — updates with every new session").

A concept is a **gap** when it has been answered incorrectly at least twice across
at least two distinct quiz sessions. A concept is **strong** when it has at least
two answers, is not a gap, and its accuracy is at least 80%. Concepts that fall in
between are still being learned and are left out of both lists to keep the report
focused.

`compute_gaps(db, user_id)` is the reusable entry point — the `/gaps` endpoint calls
it for the current user, and the Phase 6 learning-plan agent will call it directly as
its `get_knowledge_gaps(user_id)` tool.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.material import Material
from app.models.quiz import QuizAnswer, QuizQuestion

GAP_MIN_WRONG = 2
GAP_MIN_SESSIONS = 2
STRONG_MIN_ANSWERS = 2
STRONG_MIN_ACCURACY = 80


class _ConceptAgg:
    __slots__ = ("display", "total", "wrong", "sessions", "materials")

    def __init__(self, display: str) -> None:
        self.display = display
        self.total = 0
        self.wrong = 0
        self.sessions: set[uuid.UUID] = set()
        self.materials: set[uuid.UUID] = set()


def compute_gaps(db: Session, user_id: uuid.UUID) -> dict:
    rows = db.execute(
        select(QuizAnswer, QuizQuestion)
        .join(QuizQuestion, QuizAnswer.question_id == QuizQuestion.id)
        .where(QuizAnswer.user_id == user_id)
    ).all()

    by_concept: dict[str, _ConceptAgg] = {}
    for answer, question in rows:
        if not question.concept:
            continue
        key = question.concept.lower().strip()
        if not key:
            continue
        agg = by_concept.get(key)
        if agg is None:
            agg = _ConceptAgg(question.concept.strip())
            by_concept[key] = agg
        agg.total += 1
        if not answer.is_correct:
            agg.wrong += 1
        agg.sessions.add(question.session_id)
        if question.source_material_id is not None:
            agg.materials.add(question.source_material_id)

    strong: list[dict] = []
    gaps: list[dict] = []
    gap_material_ids: set[uuid.UUID] = set()

    for agg in by_concept.values():
        is_gap = agg.wrong >= GAP_MIN_WRONG and len(agg.sessions) >= GAP_MIN_SESSIONS
        if is_gap:
            gaps.append(
                {
                    "agg": agg,
                    "wrong_count": agg.wrong,
                    "sessions": len(agg.sessions),
                }
            )
            gap_material_ids |= agg.materials
            continue
        correct = agg.total - agg.wrong
        accuracy = round(correct / agg.total * 100) if agg.total else 0
        if agg.total >= STRONG_MIN_ANSWERS and accuracy >= STRONG_MIN_ACCURACY:
            strong.append(
                {
                    "concept": agg.display,
                    "total": agg.total,
                    "correct": correct,
                    "accuracy": accuracy,
                }
            )

    # Resolve material titles once for every material tied to a gap concept.
    titles: dict[uuid.UUID, str] = {}
    if gap_material_ids:
        for mid, title in db.execute(
            select(Material.id, Material.title).where(
                Material.id.in_(gap_material_ids),
                Material.user_id == user_id,
            )
        ).all():
            titles[mid] = title

    # Attach material titles to each gap and build the de-duplicated section list.
    sections: dict[uuid.UUID, dict] = {}
    gap_items: list[dict] = []
    for entry in sorted(gaps, key=lambda e: e["wrong_count"], reverse=True):
        agg: _ConceptAgg = entry["agg"]
        gap_titles = [titles[mid] for mid in agg.materials if mid in titles]
        gap_items.append(
            {
                "concept": agg.display,
                "wrong_count": entry["wrong_count"],
                "sessions": entry["sessions"],
                "materials": gap_titles,
            }
        )
        for mid in agg.materials:
            if mid not in titles:
                continue
            sec = sections.get(mid)
            if sec is None:
                sec = {"material_id": mid, "title": titles[mid], "concepts": []}
                sections[mid] = sec
            sec["concepts"].append(agg.display)

    return {
        "strong": strong,
        "gaps": gap_items,
        "suggested_sections": list(sections.values()),
    }
