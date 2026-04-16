# Clara Backend — Caregiver Dashboard Data Endpoints
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Sequence, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.api.deps import require_caregiver, CurrentUser
from app.models.message import Message
from app.models.patient import Patient
from app.models.session import ClaraSession
from app.models.alert import Alert
from app.repositories.alert_repo import AlertRepository
from app.repositories.message_repo import MessageRepository
from app.repositories.patient_repo import PatientRepository
from app.repositories.session_repo import SessionRepository
from app.schemas.alert import AlertResponse
from app.schemas.caregiver import CaregiverAnalyticsResponse
from app.schemas.message import MessageResponse
from app.schemas.session import SessionResponse

router = APIRouter(prefix="/caregiver", tags=["Caregiver Dashboard"])


# ── Organisation-wide Endpoints ───────────────────────────────────────────────

@router.get("/analytics", response_model=CaregiverAnalyticsResponse)
async def get_caregiver_analytics(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> CaregiverAnalyticsResponse:
    """
    Dashboard KPIs: live aggregate metrics for the caregiver's organisation.

    Four metrics are returned in a single round-trip:
      • total_patients    — active, non-deleted patients in the org.
      • active_sessions   — sessions with no ended_at (currently open).
      • unresolved_alerts — safety alerts not yet resolved by a caregiver.
      • stability_index   — % of positive-mood (calm + happy) messages out of
                            all mood-classified messages in the last 7 days.
                            Returns None when there is insufficient data.
    """
    org_id = current_user.organization_id

    # ── 1. Total active patients ──────────────────────────────────────────────
    patient_count_result = await db.execute(
        select(func.count(Patient.id)).where(
            Patient.organization_id == org_id,
            Patient.is_active == True,       # noqa: E712
            Patient.is_deleted == False,     # noqa: E712
        )
    )
    total_patients: int = patient_count_result.scalar_one()

    # ── 2. Currently open sessions (not yet ended) ────────────────────────────
    active_sessions_result = await db.execute(
        select(func.count(ClaraSession.id)).where(
            ClaraSession.organization_id == org_id,
            ClaraSession.ended_at.is_(None),
            ClaraSession.is_deleted == False,  # noqa: E712
        )
    )
    active_sessions: int = active_sessions_result.scalar_one()

    # ── 3. Unresolved safety alerts ───────────────────────────────────────────
    unresolved_alerts_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.organization_id == org_id,
            Alert.resolved_at.is_(None),
        )
    )
    unresolved_alerts: int = unresolved_alerts_result.scalar_one()

    # ── 4. Stability index (rolling 7-day positive-mood ratio) ────────────────
    since_7d = datetime.utcnow() - timedelta(days=7)
    stability_result = await db.execute(
        select(
            func.count(Message.id).label("total"),
            func.sum(
                case(
                    (Message.mood.in_(["calm", "happy"]), 1),
                    else_=0,
                )
            ).label("positive"),
        ).where(
            Message.organization_id == org_id,
            Message.created_at >= since_7d,
            Message.mood.isnot(None),
        )
    )
    stability_row = stability_result.first()
    stability_index: Optional[float] = None
    if stability_row and stability_row.total and stability_row.total > 0:
        stability_index = round((stability_row.positive / stability_row.total) * 100, 1)

    return CaregiverAnalyticsResponse(
        total_patients=total_patients,
        active_sessions=active_sessions,
        unresolved_alerts=unresolved_alerts,
        stability_index=stability_index,
    )


@router.get("/alerts", response_model=List[AlertResponse])
async def list_org_unresolved_alerts(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Sequence[Alert]:
    """Safety oversight: All unresolved alerts across the caregiver's organisation."""
    repo = AlertRepository(db)
    return await repo.get_org_unresolved_alerts(current_user.organization_id)


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Alert:
    """Safety workflow: Mark a specific alert as investigated and resolved."""
    repo = AlertRepository(db)
    resolved = await repo.resolve_alert(alert_id, str(current_user.user_id))
    if not resolved:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return resolved


# ── Per-patient Endpoints ─────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/mood-timeline")
async def get_patient_mood_timeline(
    patient_id: uuid.UUID,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> List[Dict[str, Any]]:
    """
    Analytic tracking: Day-by-day mood distribution for a patient.

    Returns one entry per calendar day with a breakdown of mood counts, ordered
    chronologically.  Only days that contain mood-classified messages appear.
    """
    since_date = datetime.utcnow() - timedelta(days=days)

    stmt = (
        select(
            func.date(Message.created_at).label("date"),
            Message.mood,
            func.count(Message.id).label("count"),
        )
        .join(ClaraSession, Message.session_id == ClaraSession.id)
        .where(
            ClaraSession.patient_id == patient_id,
            ClaraSession.organization_id == current_user.organization_id,
            Message.organization_id == current_user.organization_id,
            Message.created_at >= since_date,
            Message.mood.isnot(None),
        )
        .group_by(func.date(Message.created_at), Message.mood)
        .order_by(func.date(Message.created_at).asc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    timeline: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        date_str = str(row.date)
        if date_str not in timeline:
            timeline[date_str] = {"date": date_str, "moods": []}
        timeline[date_str]["moods"].append({"mood": row.mood, "count": row.count})

    return list(timeline.values())


@router.get("/patients/{patient_id}/sessions", response_model=List[SessionResponse])
async def list_patient_sessions(
    patient_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Sequence[ClaraSession]:
    """Audit oversight: Paginated list of interaction sessions for a specific patient."""
    repo = SessionRepository(db)
    # get_patient_sessions_paginated enforces both patient_id and org isolation
    sessions, _ = await repo.get_patient_sessions_paginated(
        patient_id=patient_id,
        organization_id=current_user.organization_id,
        limit=limit,
        offset=offset,
    )
    return sessions


@router.get(
    "/patients/{patient_id}/sessions/{session_id}/messages",
    response_model=List[MessageResponse],
)
async def get_patient_session_transcript(
    patient_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> List[MessageResponse]:
    """
    Full message transcript for a specific patient session.

    Access control is two-level:
      1. Patient must belong to the caregiver's organisation.
      2. Session must belong to that patient within the same organisation.

    Any caregiver within the organisation can view any patient's transcript
    for legitimate clinical oversight.  The message query itself applies
    patient_id as the primary filter (matching the repository security contract).
    """
    # ── Verify patient belongs to this organisation ───────────────────────────
    patient_repo = PatientRepository(db)
    patient = await patient_repo.get_by_id_scoped(patient_id, current_user.organization_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # ── Verify session belongs to this patient within the organisation ─────────
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id_scoped(session_id, current_user.organization_id)
    if not session or session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found.")

    # ── Fetch messages with patient_id as primary isolation filter ────────────
    msg_repo = MessageRepository(db)
    messages = await msg_repo.get_session_messages_scoped(
        session_id=session_id,
        patient_id=patient_id,
    )
    return [MessageResponse.model_validate(m) for m in messages]


@router.get("/patients/{patient_id}/alerts", response_model=List[AlertResponse])
async def list_patient_unresolved_alerts(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Sequence[Alert]:
    """
    Safety oversight: Current unresolved incidents for a specific patient.

    Access control is two-level:
      1. Patient must belong to the caregiver's organisation.
      2. Alerts are scoped by both patient_id and organization_id to prevent
         cross-tenant data exposure.
    """
    patient_repo = PatientRepository(db)
    patient = await patient_repo.get_by_id_scoped(patient_id, current_user.organization_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    repo = AlertRepository(db)
    return await repo.get_unresolved_alerts(patient_id, current_user.organization_id)
