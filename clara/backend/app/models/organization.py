import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Organization(Base):
    """
    Root tenant of the system.
    Strictly isolates all patients, caregivers, and sessions.
    """
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True) # clinic-a, school-b
    
    # AI Branding
    assistant_name: Mapped[str] = mapped_column(String(50), default="Clara")
    
    # Security contact / Subscription level
    admin_email: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Auditing
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("now()"), onupdate=text("now()"))
    
    # Relationships (Caregivers and Patients are isolated per Org)
    caregivers = relationship("Caregiver", back_populates="organization", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="organization", cascade="all, delete-orphan")
