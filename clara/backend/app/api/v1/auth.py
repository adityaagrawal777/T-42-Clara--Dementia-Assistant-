# Clara Backend — Authentication Endpoints
import asyncio
import uuid
import datetime

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.models.caregiver import Caregiver
from app.models.patient import Patient
from app.services.auth_service import auth_service, CurrentUser
from app.api.deps import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db_session)
) -> Dict[str, Any]:
    """Caregiver login flow: Verify email/password and return signed JWT."""
    # Find caregiver by email
    result = await db.execute(
        select(Caregiver).where(Caregiver.email == form_data.username)
    )
    caregiver = result.scalars().first()
    
    if not caregiver or not auth_service.verify_password(form_data.password, caregiver.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth_service.create_access_token(
        user_id=caregiver.id,
        organization_id=caregiver.organization_id,
        role="caregiver"
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "expires_in": settings.auth.jwt_expiry_minutes * 60
    }

@router.post("/patient-session")
async def create_patient_session_token(
    payload: Dict[str, uuid.UUID],
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate short-lived patient session tokens for devices without passwords."""
    # Only caregivers can generate these tokens for patients they oversight
    if current_user.role not in ["caregiver", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="patient_id required")
        
    # In a real system, we'd check if current_user.associated_patient_ids contains patient_id
    
    # Session tokens expire in 8 hours and have the 'patient_session' role
    expires = datetime.timedelta(hours=8)
    session_token = auth_service.create_access_token(
        user_id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        role="patient_session",
        patient_id=patient_id,
        expires_delta=expires
    )
    
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "expires_in": 8 * 3600
    }

@router.get("/me", response_model=CurrentUser)
async def read_current_user(current_user: CurrentUser = Depends(get_current_user)):
    """Simple discovery endpoint to verify token validity and role."""
    return current_user


@router.get("/demo-session")
async def get_demo_session(db: AsyncSession = Depends(get_db_session)) -> Dict[str, Any]:
    """
    Development-only: Generate a patient session token for the first patient in DB.
    Disabled automatically in production (ENVIRONMENT=production).
    """
    if settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo session is not available in production.",
        )

    # Fetch the first real patient from the database
    try:
        result = await asyncio.wait_for(
            db.execute(select(Patient).where(Patient.is_active == True).order_by(Patient.created_at.asc()).limit(1)),
            timeout=5.0
        )
        patient = result.scalars().first()
    except (asyncio.TimeoutError, Exception) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {e}. Cannot create demo session.",
        )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patients found in the database. Please run the bootstrap script first.",
        )

    session_token = auth_service.create_access_token(
        user_id=patient.id,
        organization_id=patient.organization_id,
        role="patient_session",
        patient_id=patient.id,
        expires_delta=datetime.timedelta(hours=8)
    )

    return {
        "access_token": session_token,
        "session_id": str(uuid.uuid4()),
        "patient_id": str(patient.id),
        "patient_name": patient.preferred_name or patient.name,
    }

