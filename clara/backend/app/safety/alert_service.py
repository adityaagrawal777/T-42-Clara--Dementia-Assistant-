import uuid
import asyncio
import structlog
from typing import List, Optional
from datetime import datetime
from app.models.alert import Alert
from app.repositories.patient_repo import PatientRepository
from app.services.email_service import EmailService
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class AlertService:
    """
    Caregiver Notification Engine.
    Orchestrates the dispatch of alerts across FCM, Email, and the Dashboard.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_and_notify(
        self,
        organization_id: uuid.UUID,
        session_id: uuid.UUID,
        patient_id: uuid.UUID,
        distress_level: str,
        message_content: str,
        categories: List[str]
    ) -> Alert:
        """Create database record and dispatch real-time notifications."""
        
        # 1. Persist the alert to the database
        alert = Alert(
            organization_id=organization_id,
            session_id=session_id,
            patient_id=patient_id,
            severity=distress_level,
            trigger_phrase=f"[{', '.join(categories).upper()}] - {message_content[:100]}...",
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        
        # 2. Trigger Professional Email Notification via Background Task
        patient_repo = PatientRepository(self.db)
        patient = await patient_repo.get_by_id(patient_id)
        patient_name = patient.name if patient else "Unknown Patient"

        if settings.alert_email_to:
            asyncio.create_task(
                EmailService.send_clinical_alert(
                    recipient_email=settings.alert_email_to,
                    patient_name=patient_name,
                    alert_level=distress_level,
                    distress_categories=categories,
                    message_context=message_content
                )
            )
        
        logger.info("alert_notified", alert_id=alert.id, level=distress_level, patient=patient_name)
        return alert
