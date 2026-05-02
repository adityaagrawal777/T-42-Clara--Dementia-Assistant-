# Clara Backend — Caregiver Dashboard Data Endpoints
"""
All caregiver-facing endpoints.

Assignment architecture (Priority 1):
  Patient lookup now uses the indexed Patient.caregiver_id FK — no JSON-array
  scanning. assign/unassign write both the FK (primary) and the JSON array
  (backward compat) atomically.

Caregiver Notes (Priority 6):
  Private clinical observations. Strictly isolated from AI prompts and
  patient-facing views. Hard-delete supported per GDPR erasure requirements.
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Sequence, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.api.deps import require_caregiver, CurrentUser
from app.models.caregiver import Caregiver
from app.models.message import Message
from app.models.patient import Patient
from app.models.session import ClaraSession
from app.models.alert import Alert
from app.repositories.alert_repo import AlertRepository
from app.repositories.caregiver_note_repo import CaregiverNoteRepository
from app.repositories.message_repo import MessageRepository
from app.repositories.patient_repo import PatientRepository
from app.repositories.session_repo import SessionRepository
from app.schemas.alert import AlertResponse
from app.schemas.caregiver import CaregiverAnalyticsResponse
from app.schemas.caregiver_note import CaregiverNoteCreate, CaregiverNoteResponse
from app.schemas.message import MessageResponse
from app.schemas.patient import PatientResponse
from app.schemas.session import SessionResponse

router = APIRouter(prefix="/caregiver", tags=["Caregiver Dashboard"])


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _get_caregiver(db: AsyncSession, caregiver_id: uuid.UUID) -> Caregiver | None:
    result = await db.execute(select(Caregiver).where(Caregiver.id == caregiver_id))
    return result.scalars().first()


async def _caregiver_patient_ids(
    db: AsyncSession,
    caregiver_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> List[uuid.UUID]:
    """
    Return the caregiver's assigned patient IDs using the indexed FK query.

    Replaces the legacy JSON-array scan — O(assigned patients) indexed lookup
    instead of full-table JSON parse.
    """
    result = await db.execute(
        select(Patient.id).where(
            Patient.organization_id == organization_id,
            Patient.caregiver_id == caregiver_id,
            Patient.is_deleted == False,  # noqa: E712
        )
    )
    return list(result.scalars().all())


async def _verify_patient_access(
    db: AsyncSession,
    patient_id: uuid.UUID,
    caregiver_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> Patient:
    """
    Confirm the patient exists in this org AND is assigned to this caregiver.
    Raises 404 (not found) or 403 (access denied) with clear messages.
    """
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.organization_id == organization_id,
            Patient.is_deleted == False,  # noqa: E712
        )
    )
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    if patient.caregiver_id != caregiver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this patient.",
        )
    return patient


# ── Organisation-wide Endpoints ───────────────────────────────────────────────

@router.get("/analytics", response_model=CaregiverAnalyticsResponse)
async def get_caregiver_analytics(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> CaregiverAnalyticsResponse:
    """Dashboard KPIs scoped to the caregiver's assigned patients."""
    org_id = current_user.organization_id
    patient_ids = await _caregiver_patient_ids(db, current_user.user_id, org_id)

    total_patients = len(patient_ids)

    if not patient_ids:
        return CaregiverAnalyticsResponse(
            total_patients=0,
            active_sessions=0,
            unresolved_alerts=0,
            stability_index=None,
        )

    # Currently open sessions for assigned patients
    active_sessions_result = await db.execute(
        select(func.count(ClaraSession.id)).where(
            ClaraSession.patient_id.in_(patient_ids),
            ClaraSession.organization_id == org_id,
            ClaraSession.ended_at.is_(None),
            ClaraSession.is_deleted == False,  # noqa: E712
        )
    )
    active_sessions: int = active_sessions_result.scalar_one()

    # Unresolved safety alerts for assigned patients
    unresolved_alerts_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.patient_id.in_(patient_ids),
            Alert.organization_id == org_id,
            Alert.resolved_at.is_(None),
        )
    )
    unresolved_alerts: int = unresolved_alerts_result.scalar_one()

    # Stability index: % of calm/happy messages in rolling 7 days
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
        )
        .join(ClaraSession, Message.session_id == ClaraSession.id)
        .where(
            ClaraSession.patient_id.in_(patient_ids),
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
) -> List[AlertResponse]:
    """Unresolved alerts scoped to the caregiver's assigned patients."""
    patient_ids = await _caregiver_patient_ids(
        db, current_user.user_id, current_user.organization_id
    )
    if not patient_ids:
        return []

    # Build patient_id → display name lookup in a single query
    patients_result = await db.execute(
        select(Patient.id, Patient.name, Patient.preferred_name).where(
            Patient.id.in_(patient_ids)
        )
    )
    patient_names: Dict[uuid.UUID, str] = {
        row.id: (row.preferred_name or row.name) for row in patients_result.all()
    }

    repo = AlertRepository(db)
    enriched: List[AlertResponse] = []
    for pid in patient_ids:
        alerts = await repo.get_unresolved_alerts(pid, current_user.organization_id)
        for alert in alerts:
            r = AlertResponse.model_validate(alert)
            enriched.append(r.model_copy(update={"patient_name": patient_names.get(pid)}))
    return enriched


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


# ── Patient Assignment Endpoints ──────────────────────────────────────────────

@router.get("/org-patients", response_model=List[PatientResponse])
async def list_all_org_patients(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Sequence[Patient]:
    """All active patients in the organisation — used by the assign-patient modal."""
    repo = PatientRepository(db)
    return await repo.get_active_patients(current_user.organization_id)


@router.post("/patients/{patient_id}/assign", status_code=status.HTTP_200_OK)
async def assign_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Dict[str, str]:
    """
    Assign a patient to the requesting caregiver.

    Dual-write strategy:
      1. Writes Patient.caregiver_id (primary, indexed FK).
      2. Updates Caregiver.associated_patient_ids JSON array (backward compat).
    Both writes are flushed inside the same transaction.
    """
    patient_repo = PatientRepository(db)
    assigned = await patient_repo.set_caregiver(
        patient_id=patient_id,
        caregiver_id=current_user.user_id,
        organization_id=current_user.organization_id,
    )
    if not assigned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Backward-compat: keep JSON array in sync
    caregiver = await _get_caregiver(db, current_user.user_id)
    if caregiver:
        existing = [str(pid) for pid in (caregiver.associated_patient_ids or [])]
        pid_str = str(patient_id)
        if pid_str not in existing:
            caregiver.associated_patient_ids = existing + [pid_str]

    await db.commit()
    return {"message": "Patient assigned."}


@router.delete("/patients/{patient_id}/assign", status_code=status.HTTP_200_OK)
async def unassign_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Dict[str, str]:
    """
    Remove the caregiver assignment from a patient.

    Dual-write strategy: clears Patient.caregiver_id and removes from
    Caregiver.associated_patient_ids JSON array.
    """
    patient_repo = PatientRepository(db)
    cleared = await patient_repo.clear_caregiver(
        patient_id=patient_id,
        organization_id=current_user.organization_id,
    )
    if not cleared:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Backward-compat: keep JSON array in sync
    caregiver = await _get_caregiver(db, current_user.user_id)
    if caregiver:
        pid_str = str(patient_id)
        existing = [str(pid) for pid in (caregiver.associated_patient_ids or [])]
        caregiver.associated_patient_ids = [p for p in existing if p != pid_str]

    await db.commit()
    return {"message": "Patient unassigned."}


# ── Per-patient Endpoints ─────────────────────────────────────────────────────

@router.get("/patients/{patient_id}/mood-timeline")
async def get_patient_mood_timeline(
    patient_id: uuid.UUID,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> List[Dict[str, Any]]:
    """
    Day-by-day mood distribution for a patient.

    IMPORTANT: Only patient-role messages are counted.
    Clara's response messages are stored with the same mood label as the
    patient's message. Including them would double-count every mood and
    could cause the dominant-mood algorithm on the frontend to resolve a
    \"distressed\" day as \"calm\" (e.g. 1 distressed patient msg is countered
    by 2 calm: the greeting turn + Clara's mirrored reply, tipping the
    dominant mood to calm). Filtering to role='patient' ensures the graph
    reflects the patient's true emotional state.
    """
    # Security: confirm the patient belongs to this caregiver's organisation.
    await _verify_patient_access(db, patient_id, current_user.user_id, current_user.organization_id)
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
            # Only patient-authored messages carry a clinically meaningful mood
            # classification. Clara's response messages inherit the mood label
            # from the turn but do not represent an independent emotional signal.
            Message.role == "patient",
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
    """Paginated list of interaction sessions for a specific patient.

    Before returning results, any orphaned sessions (ended_at IS NULL but
    started_at older than 4 h) are silently closed. This heals records that
    were created before the WebSocketDisconnect auto-close fix and prevents
    them from showing as 'Ongoing' on the Record Timeline indefinitely.
    """
    repo = SessionRepository(db)

    # ── Heal stale orphans ───────────────────────────────────────────────────
    healed = await repo.close_stale_sessions(
        organization_id=current_user.organization_id,
        patient_id=patient_id,
    )
    if healed:
        await db.commit()

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
    """Full message transcript for a specific patient session."""
    patient_repo = PatientRepository(db)
    patient = await patient_repo.get_by_id_scoped(patient_id, current_user.organization_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id_scoped(session_id, current_user.organization_id)
    if not session or session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found.")

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
) -> List[AlertResponse]:
    """Current unresolved incidents for a specific patient."""
    patient_repo = PatientRepository(db)
    patient = await patient_repo.get_by_id_scoped(patient_id, current_user.organization_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    patient_name = patient.preferred_name or patient.name
    repo = AlertRepository(db)
    raw_alerts = await repo.get_unresolved_alerts(patient_id, current_user.organization_id)
    return [
        AlertResponse.model_validate(a).model_copy(update={"patient_name": patient_name})
        for a in raw_alerts
    ]


# ── Emergency Session Control ─────────────────────────────────────────────────

@router.post(
    "/patients/{patient_id}/end-session",
    status_code=status.HTTP_200_OK,
    summary="Emergency interrupt — remotely close a patient's active session",
)
async def end_active_session(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Dict[str, str]:
    """
    Caregiver emergency control: immediately close the patient's active WebSocket
    session by marking it ended in the database. The patient's device will detect
    the session close on the next keep-alive and redirect to the sign-in screen.
    """
    await _verify_patient_access(db, patient_id, current_user.user_id, current_user.organization_id)

    result = await db.execute(
        select(ClaraSession).where(
            ClaraSession.patient_id == patient_id,
            ClaraSession.organization_id == current_user.organization_id,
            ClaraSession.ended_at.is_(None),
            ClaraSession.is_deleted == False,  # noqa: E712
        ).order_by(ClaraSession.started_at.desc()).limit(1)
    )
    session = result.scalars().first()
    if not session:
        return {"message": "No active session found for this patient."}

    session.ended_at = datetime.utcnow()
    await db.commit()
    return {"message": "Session ended. Patient device will disconnect shortly."}


# ── Caregiver Notes Endpoints (Priority 6) ────────────────────────────────────

@router.get(
    "/patients/{patient_id}/notes",
    response_model=List[CaregiverNoteResponse],
    summary="List clinical notes for a patient",
)
async def list_patient_notes(
    patient_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Sequence[CaregiverNoteResponse]:
    """
    Retrieve private clinical notes written by any caregiver about this patient.
    Scoped to the requesting caregiver's organisation.
    Notes are ordered newest-first.

    IMPORTANT: These notes are NEVER exposed to the patient or injected into
    AI system prompts. They exist exclusively in the caregiver dashboard.
    """
    # Confirm the patient is in this org (does not enforce assignment —
    # any caregiver in the org can read notes for cross-handover visibility)
    patient_repo = PatientRepository(db)
    patient = await patient_repo.get_by_id_scoped(patient_id, current_user.organization_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    note_repo = CaregiverNoteRepository(db)
    return await note_repo.get_patient_notes(
        patient_id=patient_id,
        organization_id=current_user.organization_id,
        limit=limit,
    )


@router.post(
    "/patients/{patient_id}/notes",
    response_model=CaregiverNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a clinical note",
)
async def create_patient_note(
    patient_id: uuid.UUID,
    payload: CaregiverNoteCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> CaregiverNoteResponse:
    """
    Write a private clinical observation for a patient.
    The note is immediately persisted and returned.
    It is never transmitted to the patient or to Clara's AI engine.
    """
    patient_repo = PatientRepository(db)
    patient = await patient_repo.get_by_id_scoped(patient_id, current_user.organization_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    note_repo = CaregiverNoteRepository(db)
    note = await note_repo.create_note(
        organization_id=current_user.organization_id,
        caregiver_id=current_user.user_id,
        patient_id=patient_id,
        content=payload.content,
    )
    await db.commit()
    await db.refresh(note)
    return CaregiverNoteResponse.model_validate(note)


@router.delete(
    "/patients/{patient_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a clinical note",
)
async def delete_patient_note(
    patient_id: uuid.UUID,
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> None:
    """
    Permanently delete a note written by the requesting caregiver.
    Caregivers can only delete their own notes (caregiver_id scoped).
    A caregiver cannot delete notes written by a colleague.
    """
    note_repo = CaregiverNoteRepository(db)
    deleted = await note_repo.delete_note(
        note_id=note_id,
        caregiver_id=current_user.user_id,
        organization_id=current_user.organization_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you do not have permission to delete it.",
        )
    await db.commit()


# ── Live Status Endpoint ──────────────────────────────────────────────────────

@router.get(
    "/patients/{patient_id}/live-status",
    summary="Real-time patient status — polled by the caregiver dashboard",
)
async def get_patient_live_status(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver),
) -> Dict[str, Any]:
    """
    Returns a lightweight snapshot of a patient's current activity state.

    Designed to be polled every 15 seconds by the caregiver dashboard.
    All counts are computed fresh from the source tables — never from
    the denormalized message_count/alert_count columns, which may lag
    during an ongoing session.

    Response shape:
      {
        "is_session_active": bool,
        "active_session_id": str | null,
        "session_started_at": ISO datetime | null,
        "total_messages": int,          -- all messages across all sessions
        "active_session_messages": int, -- messages in the live session only
        "unresolved_alerts": int,
        "latest_mood": str | null,      -- most recent message mood
        "session_count": int,
      }
    """
    await _verify_patient_access(db, patient_id, current_user.user_id, current_user.organization_id)
    org_id = current_user.organization_id

    # ── 1. Active session ─────────────────────────────────────────────────────
    active_session_result = await db.execute(
        select(ClaraSession).where(
            ClaraSession.patient_id == patient_id,
            ClaraSession.organization_id == org_id,
            ClaraSession.ended_at.is_(None),
            ClaraSession.is_deleted == False,  # noqa: E712
        ).order_by(ClaraSession.started_at.desc()).limit(1)
    )
    active_session: Optional[ClaraSession] = active_session_result.scalars().first()

    # ── 2. Total sessions ─────────────────────────────────────────────────────
    session_count_result = await db.execute(
        select(func.count(ClaraSession.id)).where(
            ClaraSession.patient_id == patient_id,
            ClaraSession.is_deleted == False,  # noqa: E712
        )
    )
    session_count: int = session_count_result.scalar_one()

    # ── 3. Total messages — patient_id is the security boundary ───────────────
    total_msg_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.patient_id == patient_id,
        )
    )
    total_messages: int = total_msg_result.scalar_one()

    # ── 4. Active session message count ───────────────────────────────────────
    active_session_messages = 0
    if active_session:
        active_msg_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.session_id == active_session.id,
            )
        )
        active_session_messages = active_msg_result.scalar_one()

    # ── 5. Unresolved alerts ──────────────────────────────────────────────────
    alert_count_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.patient_id == patient_id,
            Alert.resolved_at.is_(None),
        )
    )
    unresolved_alerts: int = alert_count_result.scalar_one()

    # ── 6. Latest mood — most recent patient message with a mood classification
    latest_mood_result = await db.execute(
        select(Message.mood).where(
            Message.patient_id == patient_id,
            Message.mood.isnot(None),
            Message.role == "patient",
        ).order_by(Message.created_at.desc()).limit(1)
    )
    latest_mood: Optional[str] = latest_mood_result.scalar_one_or_none()

    return {
        "is_session_active": active_session is not None,
        "active_session_id": str(active_session.id) if active_session else None,
        "session_started_at": active_session.started_at.isoformat() if active_session else None,
        "total_messages": total_messages,
        "active_session_messages": active_session_messages,
        "unresolved_alerts": unresolved_alerts,
        "latest_mood": latest_mood,
        "session_count": session_count,
    }


