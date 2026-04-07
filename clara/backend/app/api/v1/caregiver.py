# Clara Backend — Caregiver Dashboard Data Endpoints
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Sequence, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.api.deps import require_caregiver, CurrentUser
from app.models.message import Message
from app.models.session import ClaraSession
from app.models.alert import Alert
from app.repositories.session_repo import SessionRepository
from app.repositories.alert_repo import AlertRepository
from app.schemas.session import SessionResponse
from app.schemas.alert import AlertResponse

router = APIRouter(prefix="/caregiver", tags=["Caregiver Dashboard"])

@router.get("/patients/{patient_id}/mood-timeline")
async def get_patient_mood_timeline(
    patient_id: uuid.UUID,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> List[Dict[str, Any]]:
    """Analytic tracking: Retrieve day-by-day mood distribution for a patient."""
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Query messages joined with sessions for the specific patient
    stmt = (
        select(
            func.date(Message.created_at).label("date"),
            Message.mood,
            func.count(Message.id).label("count")
        )
        .join(ClaraSession, Message.session_id == ClaraSession.id)
        .where(
            ClaraSession.patient_id == patient_id,
            Message.created_at >= since_date,
            Message.mood != None
        )
        .group_by(func.date(Message.created_at), Message.mood)
        .order_by(func.date(Message.created_at).asc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Transform into grouped timeline structure
    timeline: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        date_str = str(row.date)
        if date_str not in timeline:
            timeline[date_str] = {"date": date_str, "moods": []}
        timeline[date_str]["moods"].append({"mood": row.mood, "count": row.count})
        
    return list(timeline.values())

@router.get("/patients/{patient_id}/sessions", response_model=List[SessionResponse])
async def list_patient_sessions_paginated(
    patient_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> Sequence[ClaraSession]:
    """Audit oversight: Paginated list of interaction sessions for a specific subject."""
    repo = SessionRepository(db)
    return await repo.get_recent_sessions(patient_id, limit=limit)

@router.get("/patients/{patient_id}/alerts", response_model=List[AlertResponse])
async def list_unresolved_patient_alerts(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> Sequence[Alert]:
    """Safety oversight: Current unresolved incidents for a patient's care circle."""
    repo = AlertRepository(db)
    return await repo.get_unresolved_alerts(patient_id)
