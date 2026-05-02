# Clara Backend — Patient Model
import uuid
from datetime import date
from typing import Optional, List, Dict
from sqlalchemy import String, Date, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TenantMixin, SoftDeleteMixin, TimestampMixin


class Patient(Base, TenantMixin, SoftDeleteMixin, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    hometown: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # ── Authentication ───────────────────────────────────────────────────────
    # Bcrypt-hashed passphrase. Nullable so existing records aren't broken.
    hashed_passphrase: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # ── Caregiver Contact ────────────────────────────────────────────────────
    caregiver_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── AI Persona Fields ────────────────────────────────────────────────────
    occupation_history: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    family_names: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    favourite_topics: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    life_memories: Mapped[Optional[List[Dict]]] = mapped_column(JSON, nullable=True)


    # ── Relations ────────────────────────────────────────────────────────────
    # caregiver_id: nullable FK — populated on assignment, cleared on unassign.
    # SET NULL on caregiver deletion preserves patient records.
    caregiver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    organization = relationship("Organization", back_populates="patients")
    caregiver = relationship("Caregiver", back_populates="patients", foreign_keys=[caregiver_id])
