# Clara Backend — Caregiver Note Repository
"""
Data access for CaregiverNote records.

Security model:
  - All reads are scoped to (patient_id, organization_id) — zero cross-patient leakage.
  - Deletes are further scoped to caregiver_id — a caregiver cannot delete
    another caregiver's notes even if they both manage the same patient.
  - organization_id is always the FIRST filter to allow Postgres index pruning.
"""
import uuid
from typing import List, Optional, Sequence

import structlog
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caregiver_note import CaregiverNote
from app.repositories.base import BaseRepository

logger = structlog.get_logger()


class CaregiverNoteRepository(BaseRepository[CaregiverNote]):

    def __init__(self, db_session: AsyncSession):
        super().__init__(CaregiverNote, db_session)

    async def create_note(
        self,
        organization_id: uuid.UUID,
        caregiver_id: uuid.UUID,
        patient_id: uuid.UUID,
        content: str,
    ) -> CaregiverNote:
        """Persist a new clinical note and return the hydrated ORM object."""
        note = await self.create(
            {
                "organization_id": organization_id,
                "caregiver_id": caregiver_id,
                "patient_id": patient_id,
                "content": content,
            }
        )
        logger.info(
            "caregiver_note_created",
            note_id=str(note.id),
            caregiver_id=str(caregiver_id),
            patient_id=str(patient_id),
        )
        return note

    async def get_patient_notes(
        self,
        patient_id: uuid.UUID,
        organization_id: uuid.UUID,
        limit: int = 50,
    ) -> Sequence[CaregiverNote]:
        """
        Retrieve all notes for a patient, newest first.
        Scoped to organization_id first (Postgres index prune), then patient_id.
        """
        result = await self.db.execute(
            select(self.model)
            .where(
                self.model.organization_id == organization_id,
                self.model.patient_id == patient_id,
            )
            .order_by(self.model.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id_scoped(
        self,
        note_id: uuid.UUID,
        organization_id: uuid.UUID,
        patient_id: uuid.UUID,
    ) -> Optional[CaregiverNote]:
        """
        Fetch a single note with full ownership verification.
        Returns None if the note doesn't exist or belongs to a different patient/org.
        """
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == note_id,
                self.model.organization_id == organization_id,
                self.model.patient_id == patient_id,
            )
        )
        return result.scalars().first()

    async def delete_note(
        self,
        note_id: uuid.UUID,
        caregiver_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> bool:
        """
        Permanently delete a note.
        caregiver_id scope ensures caregivers can only delete their own notes.
        Returns True if a row was deleted, False if not found / unauthorised.
        """
        stmt = delete(self.model).where(
            self.model.id == note_id,
            self.model.caregiver_id == caregiver_id,
            self.model.organization_id == organization_id,
        )
        result = await self.db.execute(stmt)
        deleted = result.rowcount > 0
        if deleted:
            logger.info(
                "caregiver_note_deleted",
                note_id=str(note_id),
                caregiver_id=str(caregiver_id),
            )
        return deleted
