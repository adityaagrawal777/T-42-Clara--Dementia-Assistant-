# Clara Backend — Message Repository Implementation
import uuid
from typing import Sequence, Optional, Dict, List
import sqlalchemy as sa
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    """
    Data access for session conversation turns.

    Provides two distinct query modes:
      1. Session history  — current session turns for the live context window.
      2. Semantic memory  — cross-session similarity search for long-term recall.

    Security guarantee: ALL cross-session queries filter on patient_id FIRST,
    ensuring strict zero-leakage isolation between patients.
    """

    def __init__(self, db_session: AsyncSession):
        super().__init__(Message, db_session)

    # ── Write operations ─────────────────────────────────────────────────────

    async def add_message(
        self,
        organization_id: uuid.UUID,
        patient_id: uuid.UUID,
        session_id: uuid.UUID,
        role: str,
        content: str,
        mood: Optional[str] = None,
        mood_score: Optional[float] = None,
        input_mode: str = "chat",
        tts_params: Optional[Dict] = None,
        embedding: Optional[List[float]] = None,
    ) -> Message:
        """Persist a single interaction turn (patient or clara) to the DB."""
        return await self.create({
            "organization_id": organization_id,
            "patient_id": patient_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "mood": mood,
            "mood_score": mood_score,
            "input_mode": input_mode,
            "tts_params": tts_params,
            "embedding": embedding,
        })

    async def update_embedding(
        self,
        message_id: uuid.UUID,
        embedding: List[float],
    ) -> None:
        """
        Attach a pre-computed semantic vector to an existing message row.

        This is called asynchronously AFTER the full response has streamed to
        the patient — it is never on the hot path, so it adds zero latency to
        the user-facing stream.
        """
        await self.db.execute(
            sa.update(self.model)
            .where(self.model.id == message_id)
            .values(embedding=embedding)
        )

    # ── Read operations ──────────────────────────────────────────────────────

    async def get_session_messages(self, session_id: uuid.UUID) -> Sequence[Message]:
        """Fetch the full chronological history of a session."""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.session_id == session_id)
            .order_by(self.model.created_at.asc())
        )
        return result.scalars().all()

    async def get_session_messages_scoped(
        self,
        session_id: uuid.UUID,
        patient_id: uuid.UUID,
    ) -> Sequence[Message]:
        """
        Fetch all messages for a session with strict patient ownership enforcement.

        patient_id is applied as the FIRST filter so Postgres prunes to this
        patient's rows before evaluating session_id — eliminating any
        possibility of cross-patient data leakage even if a session_id is
        guessed or otherwise obtained by an unauthorised caller.
        """
        result = await self.db.execute(
            select(self.model)
            .where(
                self.model.patient_id == patient_id,
                self.model.session_id == session_id,
                self.model.is_deleted == False,  # noqa: E712
            )
            .order_by(self.model.created_at.asc())
        )
        return result.scalars().all()

    async def get_recent_messages(
        self, session_id: uuid.UUID, limit: int = 20
    ) -> Sequence[Message]:
        """Fetch the most recent turns for hydrating the live context window."""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.session_id == session_id)
            .order_by(self.model.created_at.desc())
            .limit(limit)
        )
        return list(reversed(result.scalars().all()))

    async def get_total_turns(self, session_id: uuid.UUID) -> int:
        """Count total interaction turns within a session."""
        result = await self.db.execute(
            select(func.count(self.model.id))
            .where(self.model.session_id == session_id)
        )
        return result.scalar_one()

    async def semantic_search(
        self,
        patient_id: uuid.UUID,
        current_session_id: uuid.UUID,
        query_embedding: List[float],
        top_k: int = 4,
        similarity_threshold: float = 0.65,
    ) -> List[Message]:
        """
        Retrieve the most semantically relevant *past* interaction turns for a
        patient, strictly isolated to their own history from previous sessions.

        Design guarantees:
          • patient_id is the FIRST filter — Postgres prunes to this patient's
            rows before the vector index is consulted. Zero cross-patient leakage.
          • session_id exclusion ensures only cross-session memories surface;
            we never echo the patient's current conversation back at them.
          • similarity_threshold guards against injecting weakly-related noise.
          • Only 'clara' role messages are searched — they encode the full
            summarised interaction (patient input + Clara's reply) as one
            semantically rich unit.
          • is_deleted = FALSE respects soft-delete for GDPR-style erasure.

        Args:
            patient_id: UUID of the patient (security boundary — mandatory).
            current_session_id: UUID of the live session to exclude.
            query_embedding: 768-dim float vector of the incoming user message.
            top_k: Maximum number of memories to retrieve (default 4).
            similarity_threshold: Minimum cosine similarity required (default 0.65).

        Returns:
            List of Message objects ordered by cosine closeness (best first).
        """
        if not query_embedding:
            return []

        cosine_distance_threshold = 1.0 - similarity_threshold
        # Serialise Python list → pgvector literal: '[0.12, -0.34, ...]'
        vector_literal = "[" + ",".join(str(v) for v in query_embedding) + "]"

        result = await self.db.execute(
            text("""
                SELECT *
                FROM   messages
                WHERE  patient_id       = :patient_id
                  AND  session_id       != :current_session_id
                  AND  role             = 'clara'
                  AND  embedding        IS NOT NULL
                  AND  is_deleted       = FALSE
                  AND  (embedding <=> CAST(:vec AS vector)) < :threshold
                ORDER  BY embedding <=> CAST(:vec AS vector)
                LIMIT  :top_k
            """),
            {
                "patient_id": str(patient_id),
                "current_session_id": str(current_session_id),
                "vec": vector_literal,
                "threshold": cosine_distance_threshold,
                "top_k": top_k,
            },
        )
        rows = result.mappings().all()
        # Reconstruct ORM-like objects from raw mappings for consistent typing
        return [Message(**dict(row)) for row in rows]
