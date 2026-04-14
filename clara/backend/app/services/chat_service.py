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
from app.services.audit_service import AuditService
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class ChatService:
    """
    Bridge between the real-time AI engine and repository persistence.
    Verifies tenancy and orchestrates interaction turns during live sessions.
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
        Ensures all database increments and records are scoped to the correct organization.
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

            try:
                # a. Save inbound patient message
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
                
                # b. Save outbound Clara response
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

                # c. Increment audit counters with organization scoping
                await self.session_repo.increment_message_count_scoped(
                    session_id, 
                    patient.organization_id
                )
                
                # Record clinical audit event
                await self.audit.log_ai_interaction(
                    organization_id=patient.organization_id,
                    patient_id=patient.id,
                    session_id=session_id,
                    was_distressed=final_meta.distress_detected
                )
                
                # d. Increment session alert count if detected
                if final_meta.distress_detected:
                    await self.session_repo.increment_alert_count_scoped(
                        session_id, 
                        patient.organization_id
                    )
                    
                await self.db.commit()

            except Exception as db_err:
                await self.db.rollback()
                logger.warning(
                    "chat_service_db_persistence_skipped",
                    error=str(db_err),
                    session_id=str(session_id),
                )

            # 4. Fire background embedding task
            if clara_message_id is not None:
                patient_text = content
                clara_text = final_meta.full_response or ""
                asyncio.create_task(
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
        """Background task for interaction embedding."""
        from app.db.session import async_session_factory
        from app.ai.ollama_client import ollama_client

        interaction_text = f"Patient: {patient_text}\nClara: {clara_text}"
        try:
            embedding = await ollama_client.embed(interaction_text)
        except Exception as embed_err:
            logger.warning("chat_service_embed_failed", message_id=str(clara_message_id), error=str(embed_err))
            return

        try:
            async with async_session_factory() as session:
                repo = MessageRepository(session)
                await repo.update_embedding(clara_message_id, embedding)
                await session.commit()
        except Exception as store_err:
            logger.warning("chat_service_embedding_store_failed", message_id=str(clara_message_id), error=str(store_err))

    async def get_patient_profile(self, patient_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[Patient]:
        """Discovery: Load patient biodata ensuring organization-level security."""
        patient_repo = PatientRepository(self.db)
        return await patient_repo.get_by_id_scoped(patient_id, organization_id)
