# Clara Backend — Chat Orchestration Service
import asyncio
import uuid
from typing import AsyncGenerator, Dict, Any, Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.repositories.patient_repo import PatientRepository
from app.repositories.message_repo import MessageRepository
import redis.asyncio as redis
from app.repositories.session_repo import SessionRepository
from app.ai.clara_engine import clara_engine, EngineResponse
from app.safety.alert_service import AlertService
from app.services.audit_service import AuditService
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()


class ChatService:
    """
    Bridge between the real-time AI engine and repository persistence.
    Orchestrates interaction turns during live sessions.

    Embedding write-back:
      After a full interaction turn completes (patient message + Clara reply),
      we fire a background coroutine that:
        1. Embeds the combined interaction text via nomic-embed-text.
        2. Attaches the resulting vector to the 'clara' role Message row.
      This is intentionally OFF the critical path so it adds zero latency
      to the streaming response the patient receives.
    """
    
    def __init__(self, db_session: AsyncSession, redis_client: redis.Redis):
        self.db = db_session
        self.redis = redis_client
        self.message_repo = MessageRepository(db_session)
        self.session_repo = SessionRepository(db_session)
        self.audit = AuditService(db_session)

    async def handle_message(
        self,
        session_id: uuid.UUID,
        patient: Patient,
        content: str,
        mode: str = "chat"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Processes a single user message and streams back processed responses.
        Maintains consistent state in the database and audit trail.
        After streaming completes, fires a background task to embed the
        interaction and store the vector for future cross-session memory recall.
        """
        
        # 1. Initiate engine stream
        engine_stream = clara_engine.process_message(
            db=self.db,
            patient=patient,
            session_id=session_id,
            user_message=content
        )
        
        full_response = ""
        final_meta = None
        
        # 2. Consume engine output
        async for response in engine_stream:
            if not response.is_final:
                # Yield raw token to the caller (API socket)
                full_response += response.token
                yield {"type": "token", "content": response.token}
            else:
                final_meta = response
                
        # 3. Post-stream persistence (only on successful completion)
        clara_message_id: Optional[uuid.UUID] = None
        if final_meta:
            mood_str = "calm"
            mood_score = settings.chat.default_mood_score
            if final_meta.mood:
                mood_str = final_meta.mood.mood
                mood_score = final_meta.mood.confidence

            # Try to persist to DB — non-fatal if DB is unavailable
            try:
                # a. Save inbound patient message (no embedding on patient turns)
                await self.message_repo.add_message(
                    organization_id=patient.organization_id,
                    patient_id=patient.id,
                    session_id=session_id,
                    role="patient",
                    content=content,
                    input_mode=mode,
                    mood=mood_str,
                    mood_score=mood_score,
                )
                
                # b. Save outbound Clara response — embedding will be attached
                #    asynchronously by _embed_and_store() below.
                clara_msg = await self.message_repo.add_message(
                    organization_id=patient.organization_id,
                    patient_id=patient.id,
                    session_id=session_id,
                    role="clara",
                    content=final_meta.full_response or "",
                    mood=mood_str,
                    mood_score=1.0,
                )
                clara_message_id = clara_msg.id

                # c. Increment audit counters
                await self.session_repo.increment_message_count(session_id)
                
                # Record clinical audit event
                await self.audit.log_ai_interaction(
                    organization_id=patient.organization_id,
                    patient_id=patient.id,
                    session_id=session_id,
                    was_distressed=final_meta.distress_detected
                )
                
                # d. Increment session alert count if detected
                if final_meta.distress_detected:
                    await self.session_repo.increment_alert_count(session_id)
                    
                # Commit the transaction so the connection is returned to PgBouncer
                await self.db.commit()

            except Exception as db_err:
                # Rollback if anything fails so the transaction is cleanly aborted
                await self.db.rollback()
                logger.warning(
                    "chat_service_db_persistence_skipped",
                    error=str(db_err),
                    session_id=str(session_id),
                )

            # 4. Fire background embedding task — off the critical path.
            #    We only do this if we successfully wrote the clara message row.
            if clara_message_id is not None:
                patient_text = content
                clara_text = final_meta.full_response or ""
                asyncio.ensure_future(
                    self._embed_and_store(
                        clara_message_id=clara_message_id,
                        patient_text=patient_text,
                        clara_text=clara_text,
                    )
                )

            # 5. Final protocol messages
            yield {
                "type": "mood", 
                "mood": mood_str,
                "confidence": mood_score
            }
            
            yield {
                "type": "done",
                "distress_detected": final_meta.distress_detected,
                "distress_severity": final_meta.distress_severity,
                "distress_categories": final_meta.distress_categories
            }

    async def _embed_and_store(
        self,
        clara_message_id: uuid.UUID,
        patient_text: str,
        clara_text: str,
    ) -> None:
        """
        Background task: embed the combined interaction text and write the
        vector back to the 'clara' Message row in the database.

        We embed the full exchange as a single unit:
          "Patient: {patient_text}\\nClara: {clara_text}"

        This produces a richer, more context-aware semantic unit than embedding
        either message alone — the vector captures both what was said AND how
        Clara responded, making future similarity searches more precise.

        A fresh DB session is obtained from the engine's session factory to
        avoid sharing a transaction that may have already been committed.

        All errors are caught and logged without re-raising — a missing vector
        is non-fatal; Clara will just not surface this turn as a memory.
        """
        from app.db.session import async_session_factory  # avoid circular import at module level
        from app.ai.ollama_client import ollama_client

        interaction_text = f"Patient: {patient_text}\nClara: {clara_text}"
        try:
            embedding = await ollama_client.embed(interaction_text)
        except Exception as embed_err:
            logger.warning(
                "chat_service_embed_failed",
                message_id=str(clara_message_id),
                error=str(embed_err),
            )
            return

        try:
            async with async_session_factory() as session:
                repo = MessageRepository(session)
                await repo.update_embedding(clara_message_id, embedding)
                await session.commit()
                logger.info(
                    "chat_service_embedding_stored",
                    message_id=str(clara_message_id),
                    dims=len(embedding),
                )
        except Exception as store_err:
            logger.warning(
                "chat_service_embedding_store_failed",
                message_id=str(clara_message_id),
                error=str(store_err),
            )

    async def get_patient_profile(self, patient_id: uuid.UUID) -> Optional[Patient]:
        """Discovery: Load patient biodata for context construction."""
        patient_repo = PatientRepository(self.db)
        return await patient_repo.get_by_id(patient_id)
