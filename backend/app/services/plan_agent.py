"""Learning-plan agent.

Composes three inputs into a day-by-day study plan in a fixed order:

- knowledge gaps      — what the learner keeps getting wrong (reuses gaps.py)
- topics              — the materials they've uploaded, by collection
- days-until-goal     — time left before their target date

These feed a single ``generate_plan`` LLM call that produces the structured plan
JSON. The sequence was previously orchestrated by a LangChain tool-calling agent
whose prompt forced this exact order; it now runs as a direct composition so the one
LLM call goes through the shared ``anthropic_client`` chokepoint (Groq primary,
Anthropic fallback) and no longer hard-requires a live Anthropic key.
"""

import json
import re
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.llm import anthropic_client
from app.models.material import Collection, Material
from app.models.plan import LearningPlan
from app.models.user import UserGoal
from app.services import gaps as gaps_service

PLAN_MAX_TOKENS = 4096


def _extract_json_object(text: str) -> dict:
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        text = match.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object in response: {text[:300]}")
    return json.loads(text[start : end + 1])


# --- Plain helpers (also usable directly outside the agent) -------------------

def topics_for(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        select(Collection.name, Material.title)
        .join(Material, Material.collection_id == Collection.id, isouter=True)
        .where(Collection.user_id == user_id)
    ).all()
    # Also include materials with no collection.
    loose = db.scalars(
        select(Material.title).where(
            Material.user_id == user_id, Material.collection_id.is_(None)
        )
    ).all()

    by_collection: dict[str, list[str]] = {}
    for name, title in rows:
        if title:
            by_collection.setdefault(name, []).append(title)
    result = [{"collection": k, "materials": v} for k, v in by_collection.items()]
    if loose:
        result.append({"collection": "Uncategorized", "materials": list(loose)})
    return result


def days_until_goal(db: Session, user_id: uuid.UUID) -> dict:
    goal = db.scalar(
        select(UserGoal)
        .where(UserGoal.user_id == user_id)
        .order_by(UserGoal.created_at.desc())
    )
    if goal is None:
        return {"has_goal": False, "days": None, "goal_text": None, "target_date": None}
    days = None
    if goal.target_date is not None:
        days = (goal.target_date - date.today()).days
    return {
        "has_goal": True,
        "days": days,
        "goal_text": goal.goal_text,
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
    }


def _generate_plan_json(topics: str, gaps: str, days: str) -> str:
    """Produce the structured day-by-day plan. Used by the generate_plan tool."""
    system = (
        "You are an expert learning coach. Build a realistic, day-by-day study plan "
        "from the learner's own uploaded materials, the concepts they struggle with, "
        "and the time available. Map SPECIFIC materials to specific days — never give "
        "generic advice. Prioritise the weak concepts. "
        "Return ONLY a valid JSON object — no prose, no markdown fences — with exactly:\n"
        '  "summary": a 1-2 sentence overview of the plan\n'
        '  "days": an array where each element has:\n'
        '     "day": integer starting at 1\n'
        '     "date": ISO date string or null\n'
        '     "focus": short title for the day\n'
        '     "materials": array of material titles to study that day (from the list)\n'
        '     "tasks": array of concrete task strings\n'
        '     "concepts": array of concept names covered'
    )
    user_msg = (
        f"Materials by collection:\n{topics}\n\n"
        f"Knowledge gaps (weak concepts, strengths):\n{gaps}\n\n"
        f"Time available:\n{days}\n\n"
        "Generate the plan. If a concrete number of days is available, fit the plan "
        "within it; otherwise produce a sensible ~7-day plan. Return only the JSON object."
    )
    result = anthropic_client.complete(
        system=system,
        messages=[{"role": "user", "content": user_msg}],
        max_tokens=PLAN_MAX_TOKENS,
        kind="plan",
    )
    return result.text


def _compose_plan(topics: list[dict], gaps: dict, goal_info: dict) -> dict:
    """Compose the plan from the three inputs the agent always gathered, in order.

    The previous LangChain tool-calling agent forced this exact sequence via its
    system prompt — gather knowledge gaps, topics, and days-until-goal, then call
    generate_plan with all three — so composing the helpers directly is behaviourally
    identical while routing the single LLM call through the Groq chokepoint
    (``anthropic_client.complete``) instead of hard-requiring a live Anthropic key.
    ``ensure_ascii=False`` keeps Russian/Uzbek material titles readable in the prompt.
    """
    raw = _generate_plan_json(
        json.dumps(topics, ensure_ascii=False),
        json.dumps(gaps, ensure_ascii=False),
        json.dumps(goal_info, ensure_ascii=False),
    )
    return _extract_json_object(raw)


def generate_learning_plan(db: Session, user_id: uuid.UUID) -> LearningPlan:
    topics = topics_for(db, user_id)
    if not topics:
        raise ValueError(
            "No materials found. Upload study materials before generating a plan."
        )

    gaps = gaps_service.compute_gaps(db, user_id)
    goal_info = days_until_goal(db, user_id)
    # _generate_plan_json -> anthropic_client.complete raises AnthropicUnavailableError
    # if neither Groq nor Anthropic is configured; the /plan endpoint maps that to 503.
    plan_json = _compose_plan(topics, gaps, goal_info)

    plan = db.scalar(select(LearningPlan).where(LearningPlan.user_id == user_id))
    if plan is None:
        plan = LearningPlan(user_id=user_id, plan_json=plan_json)
        db.add(plan)
    else:
        plan.plan_json = plan_json
    plan.stale = False
    plan.goal_text = goal_info.get("goal_text")
    if goal_info.get("target_date"):
        plan.target_date = date.fromisoformat(goal_info["target_date"])
    else:
        plan.target_date = None

    db.commit()
    db.refresh(plan)
    return plan


def mark_stale(db: Session, user_id: uuid.UUID) -> None:
    """Flag the user's stored plan as outdated, if they have one. No-op otherwise."""
    plan = db.scalar(select(LearningPlan).where(LearningPlan.user_id == user_id))
    if plan is not None and not plan.stale:
        plan.stale = True
        db.commit()
