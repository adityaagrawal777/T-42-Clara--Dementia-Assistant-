import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, DateTime, JSON, text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class AuditLog(Base):
    """
    Centralized logging for security and clinical accountability.
    Captured automatically via interceptors or manually for key events.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    
    # Actor / Subject
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True, nullable=True) # Who did it
    actor_role: Mapped[str] = mapped_column(String(50)) # caregiver | admin | system
    
    # Action details
    action: Mapped[str] = mapped_column(String(100), index=True) # create | update | delete | view_pii
    resource_type: Mapped[str] = mapped_column(String(50), index=True) # patient | session | alert
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True, nullable=True)
    
    # Data changes
    payload_before: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    payload_after: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("now()"))
