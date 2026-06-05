"""Learning-plan agent.

A LangChain tool-calling agent composes four tools into a day-by-day study plan:

- ``get_knowledge_gaps``  — what the learner keeps getting wrong (reuses gaps.py)
- ``list_topics``         — the materials they've uploaded, by collection
- ``get_days_until_goal`` — time left before their target date
- ``generate_plan``       — turns those inputs into the structured plan JSON

The model orchestrates the calls; ``generate_plan`` produces the artifact. We read the
plan straight out of that tool's return value (via the executor's intermediate steps)
rather than trusting the model to echo a large JSON blob back verbatim.
"""

import json
import re
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.llm.anthropic_client import AnthropicUnavailableError
from app.models.material import Collection, Material
from app.models.plan import LearningPlan
from app.models.user import UserGoal
from app.services import gaps as gaps_service

PLAN_MAX_TOKENS = 4096
AGENT_MAX_TOKENS = 1024


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
    from anthropic import Anthropic

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
    client = Anthropic(api_key=settings.anthropic_api_key)
    resp = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=PLAN_MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return "".join(block.text for block in resp.content if block.type == "text")


def _build_tools(db: Session, user_id: uuid.UUID):
    """Build the four agent tools, closing over the db session and user id."""
    from langchain_core.tools import tool

    @tool
    def get_knowledge_gaps() -> str:
        """Return the learner's weak concepts (gaps) and strengths as JSON."""
        return json.dumps(gaps_service.compute_gaps(db, user_id))

    @tool
    def list_topics() -> str:
        """Return the learner's uploaded materials grouped by collection, as JSON."""
        return json.dumps(topics_for(db, user_id))

    @tool
    def get_days_until_goal() -> str:
        """Return the learner's goal text and the number of days until the target date."""
        return json.dumps(days_until_goal(db, user_id))

    @tool
    def generate_plan(topics: str, gaps: str, days: str) -> str:
        """Generate the day-by-day study plan JSON from topics, gaps, and days available."""
        return _generate_plan_json(topics, gaps, days)

    return [get_knowledge_gaps, list_topics, get_days_until_goal, generate_plan]


def _run_agent(db: Session, user_id: uuid.UUID) -> dict:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_anthropic import ChatAnthropic
    from langchain_core.prompts import ChatPromptTemplate

    tools = _build_tools(db, user_id)
    llm = ChatAnthropic(
        model=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        max_tokens=AGENT_MAX_TOKENS,
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a learning-plan agent. To build the plan you MUST: "
                "1) call get_knowledge_gaps, 2) call list_topics, "
                "3) call get_days_until_goal, then 4) call generate_plan passing the "
                "results of the first three as its topics, gaps, and days arguments. "
                "Return the generate_plan output as your final answer.",
            ),
            ("human", "Build my personalized learning plan."),
            ("placeholder", "{agent_scratchpad}"),
        ]
    )
    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(
        agent=agent, tools=tools, return_intermediate_steps=True, max_iterations=8
    )
    result = executor.invoke({})

    # Prefer the generate_plan tool's own return value over the model's final text.
    raw = None
    for action, observation in result.get("intermediate_steps", []):
        if getattr(action, "tool", None) == "generate_plan":
            raw = observation
    if raw is None:
        raw = result.get("output", "")
    if isinstance(raw, list):  # some LC versions wrap output in content blocks
        raw = " ".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in raw
        )
    return _extract_json_object(raw)


def generate_learning_plan(db: Session, user_id: uuid.UUID) -> LearningPlan:
    if not settings.anthropic_api_key:
        raise AnthropicUnavailableError(
            "ANTHROPIC_API_KEY is not configured; the learning-plan agent is unavailable."
        )

    goal_info = days_until_goal(db, user_id)
    if not topics_for(db, user_id):
        raise ValueError(
            "No materials found. Upload study materials before generating a plan."
        )

    plan_json = _run_agent(db, user_id)

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
