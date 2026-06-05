from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.gaps import GapsReport
from app.services import gaps as gaps_service

router = APIRouter(prefix="/gaps", tags=["gaps"])


@router.get("", response_model=GapsReport)
def get_gaps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GapsReport:
    report = gaps_service.compute_gaps(db, current_user.id)
    return GapsReport(**report)
