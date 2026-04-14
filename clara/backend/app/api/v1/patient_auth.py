# Clara Backend — Patient Authentication Endpoints
# Routes: POST /auth/patient/register, POST /auth/patient/login
import datetime
import uuid
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.patient import Patient
from app.models.organization import Organization
from app.models.session import ClaraSession
from app.services.auth_service import auth_service
from app.config import get_settings

router = APIRouter(prefix="/auth/patient", tags=["Patient Auth"])
settings = get_settings()


# ─── Request / Response Schemas ──────────────────────────────────────────────

class PatientRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Patient's full name")
    preferred_name: Optional[str] = Field(None, max_length=100)
    passphrase: str = Field(..., min_length=4, description="Secret passphrase chosen by the patient")
    caregiver_phone: Optional[str] = Field(None, max_length=50)


class PatientLoginRequest(BaseModel):
    name: str = Field(..., min_length=1)
    passphrase: str = Field(..., min_length=1)


class PatientSessionResponse(BaseModel):
    access_token: str
    session_id: str
    patient_id: str
    patient_name: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _create_session_record(
    db: AsyncSession,
    patient_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> ClaraSession:
    """
    Insert a new ClaraSession row into Supabase and return it.
    Called on every successful login or registration so the care team
    can audit all sessions from the Supabase dashboard.

    ``organization_id`` is required: ClaraSession inherits TenantMixin
    which enforces a NOT NULL constraint on that column at the database level.
    """
    session = ClaraSession(
        patient_id=patient_id,
        organization_id=organization_id,
        mode="chat",
        started_at=datetime.datetime.utcnow(),
    )
    db.add(session)
    await db.flush()   # gets the generated UUID without committing
    return session


def _issue_token(patient: Patient, session_id: uuid.UUID) -> str:
    """Create a signed JWT embedding the patient's identity and session."""
    return auth_service.create_access_token(
        user_id=patient.id,
        organization_id=patient.organization_id,
        role="patient_session",
        patient_id=patient.id,
        expires_delta=datetime.timedelta(hours=8),
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/register", response_model=PatientSessionResponse, status_code=status.HTTP_201_CREATED)
async def register_patient(
    body: PatientRegisterRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Create a new patient account and open their first session.
    - Checks for duplicate names (case-insensitive)
    - Hashes the passphrase with bcrypt before storage
    - Writes a ClaraSession row to Supabase for audit trail
    """
    name_lower = body.name.strip().lower()

    # Fetch the default organization (first one in DB)
    org_result = await db.execute(select(Organization).limit(1))
    org = org_result.scalars().first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No organization found. Please run the bootstrap script first.",
        )

    # Duplicate name check scoped to the organization
    result = await db.execute(
        select(Patient).where(
            Patient.organization_id == org.id,
            Patient.is_deleted == False,
            Patient.is_active == True,
        )
    )
    for p in result.scalars().all():
        if p.name.strip().lower() == name_lower:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with the name '{body.name}' already exists. Please sign in instead.",
            )

    # Hash passphrase and create patient record
    patient = Patient(
        name=body.name.strip(),
        preferred_name=body.preferred_name or body.name.strip().split()[0],
        hashed_passphrase=auth_service.get_password_hash(body.passphrase),
        caregiver_phone=body.caregiver_phone,
        organization_id=org.id,
        is_active=True,
    )
    db.add(patient)
    await db.flush()  # persist patient to get its UUID before session creation

    # Create a Supabase session record (organization_id is NOT NULL in DB)
    clara_session = await _create_session_record(db, patient.id, patient.organization_id)
    await db.commit()
    await db.refresh(patient)
    await db.refresh(clara_session)

    token = _issue_token(patient, clara_session.id)

    return {
        "access_token": token,
        "session_id": str(clara_session.id),
        "patient_id": str(patient.id),
        "patient_name": patient.preferred_name or patient.name,
    }


@router.post("/login", response_model=PatientSessionResponse)
async def login_patient(
    body: PatientLoginRequest,
    db: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Sign in an existing patient.
    - Verifies name + bcrypt passphrase
    - Opens a new ClaraSession row in Supabase for this interaction
    - Returns a signed JWT session token
    """
    name_lower = body.name.strip().lower()

    # Fetch the default organization first so login is org-scoped
    org_result = await db.execute(select(Organization).limit(1))
    org = org_result.scalars().first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No organization found. Please contact your caregiver.",
        )

    result = await db.execute(
        select(Patient).where(
            Patient.organization_id == org.id,
            Patient.is_deleted == False,
            Patient.is_active == True,
        )
    )
    patient = next(
        (p for p in result.scalars().all() if p.name.strip().lower() == name_lower),
        None,
    )

    if not patient or not patient.hashed_passphrase:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Name or passphrase is incorrect.",
        )

    if not auth_service.verify_password(body.passphrase, patient.hashed_passphrase):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Name or passphrase is incorrect.",
        )

    # Create a Supabase session record for this login (organization_id is NOT NULL in DB)
    clara_session = await _create_session_record(db, patient.id, patient.organization_id)
    await db.commit()
    await db.refresh(clara_session)

    token = _issue_token(patient, clara_session.id)

    return {
        "access_token": token,
        "session_id": str(clara_session.id),
        "patient_id": str(patient.id),
        "patient_name": patient.preferred_name or patient.name,
    }
