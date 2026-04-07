# Clara Backend — Session Repository Implementation
import uuid
from datetime import datetime
from typing import Optional, Sequence
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.session import ClaraSession
from app.repositories.base import BaseRepository

class SessionRepository(BaseRepository[ClaraSession]):
    """
    Data access for session lifecycle and audit counters.
    Handles cross-session analytics for caregiver dashboards.
    """
    def __init__(self, db_session: AsyncSession):
        super().__init__(ClaraSession, db_session)

    async def create_session(self, patient_id: uuid.UUID, mode: str) -> ClaraSession:
        """Initialize a new interactive session for a patient via a device."""
        return await self.create({
            "patient_id": patient_id,
            "mode": mode,
            "started_at": datetime.utcnow()
        })

    async def end_session(self, session_id: uuid.UUID, mood_summary: str) -> Optional[ClaraSession]:
        """Finalize an interactive session and finalize the audit trail."""
        return await self.update(session_id, {
            "ended_at": datetime.utcnow(),
            "mood_summary": mood_summary
        })

    async def get_recent_sessions(self, patient_id: uuid.UUID, limit: int = 10) -> Sequence[ClaraSession]:
        """Fetch the most recent sessions for analysis on the patient's care timeline."""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.patient_id == patient_id)
            .order_by(self.model.started_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def increment_message_count(self, session_id: uuid.UUID):
        """Standardized counter for tracking total turns per session."""
        stmt = (
            update(self.model)
            .where(self.model.id == session_id)
            .values(message_count=self.model.message_count + 1)
        )
        await self.db.execute(stmt)

    async def increment_alert_count(self, session_id: uuid.UUID):
        """Tracks safety incidents/alerts triggered during an interaction session."""
        stmt = (
            update(self.model)
            .where(self.model.id == session_id)
            .values(alert_count=self.model.alert_count + 1)
        )
        await self.db.execute(stmt)
