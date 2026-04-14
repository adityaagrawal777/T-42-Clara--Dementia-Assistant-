# Clara Backend — Session Lifecycle Endpoints
import uuid
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.repositories.session_repo import SessionRepository
from app.ai.context_manager import ContextManager
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.api.deps import get_current_user, CurrentUser

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
    return new_session # type: ignore

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
    
    return ended_session # type: ignore
