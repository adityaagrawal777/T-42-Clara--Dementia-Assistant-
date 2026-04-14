import uuid
import asyncio
import structlog
from typing import List, Optional
from datetime import datetime
from app.models.alert import Alert
from app.repositories.patient_repo import PatientRepository
from app.services.email_service import EmailService
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class AlertService:
    """
    Caregiver Notification Engine.
    Orchestrates the dispatch of alerts across FCM, Email, and the Dashboard.

    NOTE: create_and_notify always opens its own DB session so it is safe to
    run as an asyncio background task without interfering with the caller's
    active transaction.
    """

    async def create_and_notify(
        self,
        organization_id: uuid.UUID,
        session_id: uuid.UUID,
        patient_id: uuid.UUID,
        distress_level: str,
        message_content: str,
        categories: List[str]
    ) -> Optional[Alert]:
        """Create database record and dispatch real-time notifications."""
        from app.db.session import async_session_factory

        try:
            async with async_session_factory() as db:
                # 1. Persist the alert to the database
                alert = Alert(
                    organization_id=organization_id,
                    session_id=session_id,
                    patient_id=patient_id,
                    severity=distress_level,
                    trigger_phrase=f"[{', '.join(categories).upper()}] - {message_content[:100]}...",
                )
                db.add(alert)
                await db.flush()

                # 2. Resolve patient name for notification
                patient_repo = PatientRepository(db)
                patient = await patient_repo.get_by_id_scoped(patient_id, organization_id)
                patient_name = patient.name if patient else "Unknown Patient"

                await db.commit()
                await db.refresh(alert)

        except Exception as e:
            logger.error("alert_service_db_failed", error=str(e))
            return None

        # 3. Trigger Professional Email Notification via Background Task
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
