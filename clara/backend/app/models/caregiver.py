# Clara Backend — Caregiver Model
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TenantMixin, SoftDeleteMixin, TimestampMixin

class Caregiver(Base, TenantMixin, SoftDeleteMixin, TimestampMixin):
    """
    Caregiver account for accessing the dashboard and overseeing patients.
    Supports multi-patient linkage via UUID arrays.
    """
    __tablename__ = "caregivers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Credentials & Identity
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Patient Linkage
    associated_patient_ids: Mapped[Optional[List[uuid.UUID]]] = mapped_column(JSON, nullable=True)
    
    # Relationship to Tenant
    organization = relationship("Organization", back_populates="caregivers")
