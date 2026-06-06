import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.llm.anthropic_client import AnthropicUnavailableError
from app.models.plan import LearningPlan
from app.models.user import User
from app.schemas.plan import LearningPlanOut, PlanContent
from app.services import plan_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plan", tags=["plan"])


def _to_out(plan: LearningPlan | None) -> LearningPlanOut:
    if plan is None:
        return LearningPlanOut(plan=None)
    return LearningPlanOut(
        plan=PlanContent(**plan.plan_json),
        stale=plan.stale,
        goal_text=plan.goal_text,
        target_date=plan.target_date,
        updated_at=plan.updated_at,
    )


@router.post("/generate", response_model=LearningPlanOut)
def generate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LearningPlanOut:
    try:
        plan = plan_agent.generate_learning_plan(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except AnthropicUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )
    except Exception:
        logger.exception("Plan generation failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate your plan right now. Please try again.",
        )
    return _to_out(plan)


@router.get("", response_model=LearningPlanOut)
def get_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LearningPlanOut:
    plan = db.scalar(
        select(LearningPlan).where(LearningPlan.user_id == current_user.id)
    )
    return _to_out(plan)
