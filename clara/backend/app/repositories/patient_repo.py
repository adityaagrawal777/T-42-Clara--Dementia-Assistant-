# Clara Backend — Patient Repository Implementation
import uuid
from typing import Optional, List, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.repositories.base import BaseRepository

class PatientRepository(BaseRepository[Patient]):
    """
    Data access specifically for patient records.
    Enforces organization-level isolation for all queries.
    """
    def __init__(self, db_session: AsyncSession):
        super().__init__(Patient, db_session)

    async def get_active_patients(self, organization_id: uuid.UUID) -> Sequence[Patient]:
        """Fetch all patients currently marked as active within a specific organization."""
        result = await self.db.execute(
            select(self.model).where(
                self.model.organization_id == organization_id,
                self.model.is_active == True,
                self.model.is_deleted == False
            )
        )
        return result.scalars().all()

    async def get_by_id_scoped(self, patient_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[Patient]:
        """Fetch a single patient record ensuring it belongs to the requester's organization."""
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == patient_id,
                self.model.organization_id == organization_id,
                self.model.is_deleted == False
            )
        )
        return result.scalars().first()

    async def update_profile(self, patient_id: uuid.UUID, organization_id: uuid.UUID, data: dict) -> Optional[Patient]:
        """Update a patient's bios ensures organization ownership."""
        # Find first to verify ownership
        patient = await self.get_by_id_scoped(patient_id, organization_id)
        if not patient:
            return None
            
        return await self.update(patient_id, data)

    async def delete_scoped(self, patient_id: uuid.UUID, organization_id: uuid.UUID) -> bool:
        """Securely archive a patient record."""
        patient = await self.get_by_id_scoped(patient_id, organization_id)
        if not patient:
            return False
        
        # Soft-delete preferred for clinical records
        await self.update(patient_id, {"is_deleted": True, "is_active": False})
        return True
