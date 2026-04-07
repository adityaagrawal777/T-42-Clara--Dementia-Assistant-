# Clara Backend — Message Model
import uuid
from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy import String, Float, DateTime, ForeignKey, JSON, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base, TenantMixin, SoftDeleteMixin, TimestampMixin

# Embedding dimensionality for nomic-embed-text (768-dim)
EMBEDDING_DIM = 768


class Message(Base, TenantMixin, SoftDeleteMixin, TimestampMixin):
    """
    Individual turn within a ClaraSession.
    Captures content, role, emotion state, and a semantic embedding vector
    for cross-session long-term memory retrieval via pgvector similarity search.

    Security guarantee: every row carries both session_id AND patient_id.
    All semantic queries filter on patient_id FIRST, ensuring zero cross-patient
    data leakage regardless of session structure.
    """
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # ── Ownership ─────────────────────────────────────────────────────────────
    # session_id: which live session this message belongs to
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clara_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # patient_id: denormalised for O(1) patient-scoped memory queries.
    # Without this column, a cross-session semantic search would require
    # a JOIN through clara_sessions which is expensive and fragile.
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # ── Content ───────────────────────────────────────────────────────────────
    role: Mapped[str] = mapped_column(String(50), nullable=False)   # patient | clara
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Emotion classification ────────────────────────────────────────────────
    mood: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mood_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Interaction context ───────────────────────────────────────────────────
    input_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # voice | chat
    tts_params: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)

    # ── Semantic vector ───────────────────────────────────────────────────────
    # Populated asynchronously after the interaction turn completes.
    # NULL on patient messages; populated on clara assistant turns (we embed
    # the summarised interaction: "Patient said X. Clara responded Y.").
    # This strategy ensures one clean, well-formed memory unit per turn.
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(EMBEDDING_DIM),
        nullable=True,
        comment="nomic-embed-text 768-dim semantic vector for long-term memory retrieval"
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    session = relationship("ClaraSession", lazy="select")
    patient = relationship("Patient", lazy="select")
