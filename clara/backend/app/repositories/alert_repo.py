# Clara Backend — Alert Repository Implementation
import uuid
from datetime import datetime, timedelta
from typing import Sequence, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.alert import Alert
from app.repositories.base import BaseRepository

class AlertRepository(BaseRepository[Alert]):
    """
    Data access for safety alerts and incident investigations.
    Handles resolution workflows by caregivers.
    """
    def __init__(self, db_session: AsyncSession):
        super().__init__(Alert, db_session)

    async def create_alert(
        self, 
        session_id: uuid.UUID, 
        patient_id: uuid.UUID, 
        severity: str, 
        trigger_phrase: str,
        rule_name: str,
        message_content: str,
        mood_at_trigger: str
    ) -> Alert:
        """System-level creation of a safety incident for human review."""
        return await self.create({
            "session_id": session_id,
            "patient_id": patient_id,
            "severity": severity,
            "trigger_phrase": trigger_phrase,
            "rule_name": rule_name,
            "message_content": message_content,
            "mood_at_trigger": mood_at_trigger
        })

    async def get_unresolved_alerts(self, patient_id: uuid.UUID) -> Sequence[Alert]:
        """Fetch all incidents for a specific patient that require caregiver review."""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.patient_id == patient_id, self.model.resolved_at == None)
            .order_by(self.model.created_at.desc())
        )
        return result.scalars().all()

    async def resolve_alert(self, alert_id: uuid.UUID, resolved_by: str) -> Optional[Alert]:
        """Mark a specific safety alert as investigated and resolved by a care professional."""
        return await self.update(alert_id, {
            "resolved_at": datetime.utcnow(),
            "resolved_by": resolved_by
        })

    async def get_org_unresolved_alerts(self, organization_id: uuid.UUID) -> Sequence[Alert]:
        """Fetch all unresolved alerts across an entire organization for caregiver oversight."""
        result = await self.db.execute(
            select(self.model)
            .where(
                self.model.organization_id == organization_id,
                self.model.resolved_at == None
            )
            .order_by(self.model.created_at.desc())
        )
        return result.scalars().all()

    async def get_alert_history(self, patient_id: uuid.UUID, days: int = 30) -> Sequence[Alert]:
        """Fetch all safety incidents over a specific time window for trend analysis."""
        since_date = datetime.utcnow() - timedelta(days=days)
        result = await self.db.execute(
            select(self.model)
            .where(self.model.patient_id == patient_id, self.model.created_at >= since_date)
            .order_by(self.model.created_at.desc())
        )
        return result.scalars().all()
