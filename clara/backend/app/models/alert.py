# Clara Backend — Alert Model
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TenantMixin, SoftDeleteMixin, TimestampMixin

class Alert(Base, TenantMixin, SoftDeleteMixin, TimestampMixin):
    """
    Caregiver alert notifications generated during ClaraSessions.
    Linked to a specific message and session context.
    """
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign Keys
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("clara_sessions.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("patients.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    # Alert details
    severity: Mapped[str] = mapped_column(String(50), default="low") # low | medium | high | critical
    trigger_phrase: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rule_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Audit content at trigger
    message_content: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    mood_at_trigger: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Resolution/Audit trail
    notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Relationships
    session = relationship("ClaraSession")
    patient = relationship("Patient")
