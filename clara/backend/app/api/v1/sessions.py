# Clara Backend — Session Lifecycle Endpoints
import uuid
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.repositories.session_repo import SessionRepository
from app.repositories.message_repo import MessageRepository
from app.ai.context_manager import ContextManager
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionUpdate,
    PaginatedSessionsResponse,
)
from app.schemas.message import MessageResponse
from app.api.deps import get_current_user, CurrentUser, require_patient_session

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_clara_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user)
) -> SessionResponse:
    """Session startup: Initialize a safe interaction session for a patient."""
    # Ensure authorization via device token or caregiver
    if current_user.role == "patient_session" and current_user.patient_id != session_data.patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized session request.")

    repo = SessionRepository(db)
    # Enforce organizational isolation: only create sessions within the user's organization
    new_session = await repo.create_session(
        patient_id=session_data.patient_id,
        organization_id=current_user.organization_id,
        mode=session_data.mode
    )
    return new_session  # type: ignore


@router.get("/history", response_model=PaginatedSessionsResponse)
async def get_patient_session_history(
    limit: int = Query(20, ge=1, le=100, description="Maximum sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_patient_session),
) -> PaginatedSessionsResponse:
    """
    Retrieve the authenticated patient's own session history.

    Strictly scoped to the calling patient — no other patient's sessions
    are accessible regardless of organisation membership.  Results are
    ordered most-recent first and support cursor-style pagination via
    limit / offset query parameters.
    """
    repo = SessionRepository(db)
    sessions, total = await repo.get_patient_sessions_paginated(
        patient_id=current_user.patient_id,  # type: ignore[arg-type]
        organization_id=current_user.organization_id,
        limit=limit,
        offset=offset,
    )
    return PaginatedSessionsResponse(
        sessions=[SessionResponse.model_validate(s) for s in sessions],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


@router.get("/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_message_history(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_patient_session),
) -> List[MessageResponse]:
    """
    Retrieve the full message transcript for one of the patient's past sessions.

    Access is double-gated:
      1. Session-level: verifies the session exists within the patient's org
         AND that session.patient_id matches the authenticated patient.
      2. Message-level: patient_id is applied as the primary filter on the
         messages query, so cross-patient leakage is impossible even if a
         session UUID is somehow obtained by an unauthorised caller.
    """
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id_scoped(session_id, current_user.organization_id)

    # Explicit patient ownership check — org membership alone is insufficient
    if not session or session.patient_id != current_user.patient_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    msg_repo = MessageRepository(db)
    messages = await msg_repo.get_session_messages_scoped(
        session_id=session_id,
        patient_id=current_user.patient_id,  # type: ignore[arg-type]
    )
    return [MessageResponse.model_validate(m) for m in messages]


@router.patch("/{session_id}/end", response_model=SessionResponse)
async def end_clara_session(
    session_id: uuid.UUID,
    session_update: SessionUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user)
) -> SessionResponse:
    """Session conclusion: Finalize interaction and securely clear AI memory."""
    repo = SessionRepository(db)

    # Securely finalize session within org scope
    ended_session = await repo.end_session(
        session_id=session_id,
        organization_id=current_user.organization_id,
        mood_summary=session_update.mood_summary or "normal"
    )

    if not ended_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session record not found in your organization"
        )

    # 2. Secure context clearing from Redis
    context_manager = ContextManager()
    await context_manager.clear_context(session_id)

    return ended_session  # type: ignore
