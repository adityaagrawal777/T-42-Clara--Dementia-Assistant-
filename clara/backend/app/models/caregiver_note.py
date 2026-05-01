# Clara Backend — Caregiver Note Model
"""
Private clinical notes written by a caregiver about a patient.

Design decisions:
  - Notes are NEVER exposed to the patient or to the AI (Clara engine).
    They are strictly a caregiver-to-caregiver / caregiver-to-self artifact.
  - Hard delete is intentional: caregivers must be able to permanently
    remove a note without leaving a soft-delete trail (GDPR erasure path).
  - TenantMixin enforces org-level isolation as first-class constraint.
  - No SoftDeleteMixin: permanent erasure on DELETE request.
"""
import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TenantMixin, TimestampMixin


class CaregiverNote(Base, TenantMixin, TimestampMixin):
    """
    A private clinical observation or handover note written by a caregiver.
    Strictly isolated: never visible to patients or injected into AI prompts.
    """
    __tablename__ = "caregiver_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    caregiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Content ───────────────────────────────────────────────────────────────
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    caregiver = relationship("Caregiver", back_populates="notes")
    patient = relationship("Patient")
