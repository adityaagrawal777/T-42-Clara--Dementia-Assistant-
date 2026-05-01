# Clara Backend — Patient Repository Implementation
import uuid
from typing import Optional, List, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.repositories.base import BaseRepository
import structlog

logger = structlog.get_logger()

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

    async def append_topics(self, patient_id: uuid.UUID, new_topics: List[str]) -> bool:
        """
        Merge *new_topics* into the patient's existing favourite_topics list.
        Deduplicates case-insensitively. Returns True when at least one new
        topic was actually added; False when the list was already up-to-date.
        """
        patient = await self.get_by_id(patient_id)
        if not patient:
            return False

        existing_lower = {t.lower() for t in (patient.favourite_topics or [])}
        to_add = [t for t in new_topics if t.lower() not in existing_lower]

        if not to_add:
            return False

        merged = list(patient.favourite_topics or []) + to_add
        await self.update(patient_id, {"favourite_topics": merged})
        logger.info(
            "patient_topics_appended",
            patient_id=str(patient_id),
            added=to_add,
            total=len(merged),
        )
        return True

    async def get_patients_by_ids(self, patient_ids: list, organization_id: uuid.UUID) -> Sequence["Patient"]:
        """Fetch only the patients whose IDs appear in the given list (caregiver assignment filter)."""
        if not patient_ids:
            return []
        uuid_ids = []
        for pid in patient_ids:
            try:
                uuid_ids.append(uuid.UUID(str(pid)) if not isinstance(pid, uuid.UUID) else pid)
            except (ValueError, AttributeError):
                pass
        if not uuid_ids:
            return []
        result = await self.db.execute(
            select(self.model).where(
                self.model.id.in_(uuid_ids),
                self.model.organization_id == organization_id,
                self.model.is_active == True,
                self.model.is_deleted == False,
            )
        )
        return result.scalars().all()

    async def delete_scoped(self, patient_id: uuid.UUID, organization_id: uuid.UUID) -> bool:
        """Securely archive a patient record."""
        patient = await self.get_by_id_scoped(patient_id, organization_id)
        if not patient:
            return False
        
        # Soft-delete preferred for clinical records
        await self.update(patient_id, {"is_deleted": True, "is_active": False})
        return True

    async def get_patients_by_caregiver_id(
        self,
        caregiver_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> Sequence["Patient"]:
        """
        Retrieve all active, non-deleted patients assigned to a specific caregiver
        using the indexed caregiver_id FK.

        This replaces the legacy JSON-array scan on caregivers.associated_patient_ids.
        organization_id is applied as the primary filter so Postgres prunes to
        this org's partition before evaluating caregiver_id.
        """
        result = await self.db.execute(
            select(self.model).where(
                self.model.organization_id == organization_id,
                self.model.caregiver_id == caregiver_id,
                self.model.is_deleted == False,  # noqa: E712
                self.model.is_active == True,     # noqa: E712
            )
        )
        return result.scalars().all()

    async def set_caregiver(
        self,
        patient_id: uuid.UUID,
        caregiver_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> bool:
        """
        Assign a caregiver to a patient by writing the FK.
        Returns True on success, False if the patient wasn't found in this org.
        """
        patient = await self.get_by_id_scoped(patient_id, organization_id)
        if not patient:
            return False
        await self.update(patient_id, {"caregiver_id": caregiver_id})
        logger.info(
            "patient_caregiver_assigned",
            patient_id=str(patient_id),
            caregiver_id=str(caregiver_id),
        )
        return True

    async def clear_caregiver(
        self,
        patient_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> bool:
        """
        Remove caregiver assignment from a patient.
        Returns True on success, False if the patient wasn't found in this org.
        """
        patient = await self.get_by_id_scoped(patient_id, organization_id)
        if not patient:
            return False
        await self.update(patient_id, {"caregiver_id": None})
        logger.info("patient_caregiver_unassigned", patient_id=str(patient_id))
        return True
