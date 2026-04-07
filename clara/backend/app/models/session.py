# Clara Backend — ClaraSession Model
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TenantMixin, SoftDeleteMixin, TimestampMixin

class ClaraSession(Base, TenantMixin, SoftDeleteMixin, TimestampMixin):
    """
    Session record for a patient-clara interaction.
    Named ClaraSession to avoid reserved 'session' conflicts.
    """
    __tablename__ = "clara_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign Keys
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("patients.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    # Interaction specifics
    mode: Mapped[str] = mapped_column(String(50), default="chat")  # chat | voice | mixed
    mood_summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Tracking counters
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    alert_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Session lifecycle
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )

    
    # Relationships
    patient = relationship("Patient")
