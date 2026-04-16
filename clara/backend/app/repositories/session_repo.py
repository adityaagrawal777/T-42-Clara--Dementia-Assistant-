# Clara Backend — Session Repository Implementation
import uuid
from datetime import datetime
from typing import Optional, Sequence, Tuple
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.session import ClaraSession
from app.repositories.base import BaseRepository

class SessionRepository(BaseRepository[ClaraSession]):
    """
    Data access specifically for session records.
    Enforces organizational scoping for safe care team oversight.
    """
    def __init__(self, db_session: AsyncSession):
        super().__init__(ClaraSession, db_session)

    async def create_session(self, patient_id: uuid.UUID, organization_id: uuid.UUID, mode: str) -> ClaraSession:
        """Initialize a new interactive session for a patient with verified tenancy."""
        return await self.create({
            "patient_id": patient_id,
            "organization_id": organization_id,
            "mode": mode,
            "started_at": datetime.utcnow()
        })

    async def get_by_id_scoped(self, session_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[ClaraSession]:
        """Fetch a session record ensuring it belongs to the active tenant."""
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == session_id,
                self.model.organization_id == organization_id
            )
        )
        return result.scalars().first()

    async def end_session(self, session_id: uuid.UUID, organization_id: uuid.UUID, mood_summary: str) -> Optional[ClaraSession]:
        """Finalize an interactive session and finalize the audit trail."""
        # Verify ownership first
        session = await self.get_by_id_scoped(session_id, organization_id)
        if not session:
            return None
            
        return await self.update(session_id, {
            "ended_at": datetime.utcnow(),
            "mood_summary": mood_summary
        })

    async def get_recent_sessions(self, patient_id: uuid.UUID, organization_id: uuid.UUID, limit: int = 10) -> Sequence[ClaraSession]:
        """Fetch the most recent sessions for analysis within a verified org."""
        result = await self.db.execute(
            select(self.model)
            .where(
                self.model.patient_id == patient_id,
                self.model.organization_id == organization_id
            )
            .order_by(self.model.started_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def increment_message_count_scoped(self, session_id: uuid.UUID, organization_id: uuid.UUID):
        """Standardized counter for tracking total turns per session."""
        stmt = (
            update(self.model)
            .where(
                self.model.id == session_id,
                self.model.organization_id == organization_id
            )
            .values(message_count=self.model.message_count + 1)
        )
        await self.db.execute(stmt)

    async def increment_alert_count_scoped(self, session_id: uuid.UUID, organization_id: uuid.UUID):
        """Tracks safety incidents/alerts triggered during an interaction session."""
        stmt = (
            update(self.model)
            .where(
                self.model.id == session_id,
                self.model.organization_id == organization_id
            )
            .values(alert_count=self.model.alert_count + 1)
        )
        await self.db.execute(stmt)

    async def get_patient_sessions_paginated(
        self,
        patient_id: uuid.UUID,
        organization_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[Sequence[ClaraSession], int]:
        """
        Retrieve a patient's session history with pagination.

        Both patient_id and organization_id are required to enforce strict
        multi-tenant, per-patient isolation.  Soft-deleted sessions are
        excluded so GDPR erasure is respected transparently.
        """
        base_where = [
            self.model.patient_id == patient_id,
            self.model.organization_id == organization_id,
            self.model.is_deleted == False,  # noqa: E712
        ]

        total_result = await self.db.execute(
            select(func.count(self.model.id)).where(*base_where)
        )
        total: int = total_result.scalar_one()

        page_result = await self.db.execute(
            select(self.model)
            .where(*base_where)
            .order_by(self.model.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return page_result.scalars().all(), total
