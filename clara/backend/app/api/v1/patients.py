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
    """Caregiver oversight: List all patients within your organization."""
    repo = PatientRepository(db)
    return await repo.get_active_patients(current_user.organization_id)

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient_record(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> PatientResponse:
    """Caregiver onboarding: Register a new patient in your organization."""
    repo = PatientRepository(db)
    data = patient_data.model_dump()
    data["organization_id"] = current_user.organization_id # Enforce tenancy
    return await repo.create(data)

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient_profile(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
) -> PatientResponse:
    """Caregiver detailing: Fetch comprehensive patient bio and memories."""
    repo = PatientRepository(db)
    patient = await repo.get_by_id_scoped(patient_id, current_user.organization_id)
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Patient record not found in your organization"
        )
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
    updated = await repo.update_profile(
        patient_id, 
        current_user.organization_id, 
        patient_data.model_dump(exclude_unset=True)
    )
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Patient record not found in your organization"
        )
    return updated # type: ignore

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(require_caregiver)
):
    """Caregiver management: Archive a patient record within your organization."""
    repo = PatientRepository(db)
    success = await repo.delete_scoped(patient_id, current_user.organization_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Patient record not found in your organization"
        )
    return None
