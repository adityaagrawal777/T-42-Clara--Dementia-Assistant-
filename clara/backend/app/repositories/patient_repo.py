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
    Handles career history and persona fields.
    """
    def __init__(self, db_session: AsyncSession):
        super().__init__(Patient, db_session)

    async def get_active_patients(self) -> Sequence[Patient]:
        """Fetch all patients currently marked as active for care interaction."""
        result = await self.db.execute(
            select(self.model).where(self.model.is_active == True)
        )
        return result.scalars().all()

    async def update_profile(self, patient_id: uuid.UUID, data: dict) -> Optional[Patient]:
        """Update a patient's bios and grounding info with partial data."""
        return await self.update(patient_id, data)

    async def get_with_full_context(self, patient_id: uuid.UUID) -> Optional[Patient]:
        """Retrieve patient record with all JSON-serialized life memories loaded."""
        # Note: SQLAlchemy's Mapped JSON is already eager-loaded in simple select
        return await self.get_by_id(patient_id)
