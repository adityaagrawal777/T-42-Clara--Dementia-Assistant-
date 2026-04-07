# Clara Backend — Patient Management Endpoints
import uuid
from typing import List, Sequence
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.repositories.patient_repo import PatientRepository
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.api.deps import require_caregiver, CurrentUser

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/", response_model=List[PatientResponse])
async def list_active_patients(
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> Sequence[PatientResponse]:
    """Caregiver oversight: List all patients under care."""
    repo = PatientRepository(db)
    return await repo.get_active_patients()

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_record(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> PatientResponse:
    """Caregiver onboarding: Manually register a new patient bio."""
    repo = PatientRepository(db)
    return await repo.create(patient_data.model_dump())

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient_profile(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> PatientResponse:
    """Caregiver detailing: Fetch comprehensive patient bio and memories."""
    repo = PatientRepository(db)
    patient = await repo.get_by_id(patient_id)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return patient # type: ignore

@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient_profile(
    patient_id: uuid.UUID,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> PatientResponse:
    """Caregiver modification: Securely update grounding info or biography."""
    repo = PatientRepository(db)
    updated = await repo.update_profile(patient_id, patient_data.model_dump(exclude_unset=True))
    
    if not updated:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return updated # type: ignore

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
):
    """Caregiver management: Permanently remove or archive a patient record."""
    repo = PatientRepository(db)
    success = await repo.delete(patient_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return None
