import uuid
import json
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
import structlog

logger = structlog.get_logger()

class AuditService:
    """
    Centralized Audit Logging System.
    Captures all significant data mutations and security events.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_event(
        self,
        organization_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        actor_role: str,
        resource_type: str,
        resource_id: Optional[uuid.UUID],
        action: str,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """Create a new audit entry for compliance tracking."""
        
        log = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            actor_role=actor_role,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            payload_after=changes or {},
            ip_address=ip_address
        )
        
        self.db.add(log)
        await self.db.commit()
        
        logger.info("audit_log_created", action=action, target=resource_type)
        return log

    async def log_ai_interaction(
        self,
        organization_id: uuid.UUID,
        patient_id: uuid.UUID,
        session_id: uuid.UUID,
        was_distressed: bool
    ):
        """Specialize logging for AI safety events."""
        await self.log_event(
            organization_id=organization_id,
            user_id=None,
            actor_role="system",
            resource_type="session",
            resource_id=session_id,
            action="ai_interaction",
            changes={
                "patient_id": str(patient_id),
                "distress_detected": was_distressed
            }
        )

