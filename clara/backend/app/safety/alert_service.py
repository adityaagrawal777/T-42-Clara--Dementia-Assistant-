import uuid
import structlog
from typing import List, Optional
from datetime import datetime
from app.models.alert import Alert
from app.models.caregiver import Caregiver
from app.repositories.patient_repo import PatientRepository
from app.services.email_service import EmailService
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class AlertService:
    """
    Caregiver Notification Engine.
    Orchestrates the dispatch of alerts across Email and the Dashboard.

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
        """
        Persist a clinical alert to the database and dispatch email notifications.

        Notification routing:
          1. Primary — the patient's assigned caregiver's email (resolved from DB).
          2. Fallback — ALERT_EMAIL_TO config value (e.g. on-call team inbox).
        Both are sent if both exist and differ.
        """
        from app.db.session import async_session_factory
        from sqlalchemy import select

        patient_name = "Unknown Patient"
        caregiver_email: Optional[str] = None
        alert: Optional[Alert] = None

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

                # 2. Resolve patient name and their assigned caregiver's email
                patient_repo = PatientRepository(db)
                patient = await patient_repo.get_by_id_scoped(patient_id, organization_id)
                if patient:
                    patient_name = patient.preferred_name or patient.name
                    if patient.caregiver_id:
                        caregiver_result = await db.execute(
                            select(Caregiver).where(Caregiver.id == patient.caregiver_id)
                        )
                        caregiver = caregiver_result.scalars().first()
                        if caregiver and caregiver.email:
                            caregiver_email = caregiver.email

                await db.commit()
                if alert:
                    await db.refresh(alert)

        except Exception as e:
            # CRITICAL FIX: If the DB fails, log it, but DO NOT return None.
            # We MUST continue and send the email anyway!
            logger.error("alert_service_db_failed", error=str(e), patient_id=str(patient_id))
            # Keep patient_name as "Unknown Patient" or default to ID so email still works.
            patient_name = f"Patient ({str(patient_id)[:8]})"

        # 3. Build recipient list — deduplicated
        settings = get_settings()
        recipients: list[str] = []
        if caregiver_email:
            recipients.append(caregiver_email)
        fallback = settings.alert_email_to
        if fallback and fallback not in recipients:
            recipients.append(fallback)

        if not recipients:
            logger.warning(
                "alert_service_no_recipients",
                detail="No caregiver email and no ALERT_EMAIL_TO configured. Email skipped.",
                patient=patient_name,
                level=distress_level,
            )
        else:
            # 4. Deliver each email directly (awaited) so no send can be orphaned.
            # This runs inside the outer background task started by ClaraEngine,
            # so it does NOT block the WebSocket request path.
            results: list[bool] = []
            for recipient in recipients:
                success = await EmailService.send_clinical_alert(
                    recipient_email=recipient,
                    patient_name=patient_name,
                    alert_level=distress_level,
                    distress_categories=categories,
                    message_context=message_content,
                    patient_id=str(patient_id),
                )
                results.append(success)

            delivered = sum(results)
            logger.info(
                "alert_emails_dispatched",
                delivered=delivered,
                total=len(recipients),
                recipients=recipients,
                level=distress_level,
                patient=patient_name,
            )

        logger.info(
            "alert_notified",
            alert_id=str(alert.id) if alert else "NO_DB_RECORD",
            level=distress_level,
            patient=patient_name,
            recipients=recipients,
        )
        return alert

