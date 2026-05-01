# Clara Backend — Core AI Orchestration Engine
import uuid
import asyncio
from dataclasses import dataclass
from typing import AsyncGenerator, Optional, List, Dict
import structlog
import re
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.ai.ollama_client import ollama_client
from app.ai.prompt_builder import PromptBuilder, ResponseSanitizer
from app.ai.context_manager import ContextManager
from app.ai.mood_classifier import MoodClassifier, MoodResult
from app.safety.distress_detector import DistressDetector
from app.safety.alert_service import AlertService
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

@dataclass
class EngineResponse:
    """Standardized response from the processing engine."""
    token: str
    is_final: bool = False
    mood: Optional[MoodResult] = None
    distress_detected: bool = False
    distress_severity: Optional[str] = None
    distress_categories: Optional[List[str]] = None
    full_response: Optional[str] = None

class _StreamBuffer:
    """
    Ultra-low latency token buffer.
    Claude-like experience: flushes tokens almost immediately while
    cleaning up internal bracketed messages.
    """
    def __init__(self, sanitizer: ResponseSanitizer, patient_name: str):
        self.sanitizer = sanitizer
        self.patient_name = patient_name
        self.in_brackets = False

    def process_token(self, token: str) -> str:
        """
        Process a single incoming token delta.
        Strips internal markers and returns safe display text immediately.
        """
        clean_token = ""
        for char in token:
            if char == '[':
                self.in_brackets = True
            elif char == ']':
                self.in_brackets = False
            elif not self.in_brackets:
                clean_token += char
                
        # Real-time sanitization: only apply if the token itself contains
        # a forbidden word (rare) or just return the clean token for speed.
        # Deep sanitization will happen on the full response at the end.
        return clean_token

class ClaraEngine:
    """
    Core AI Orchestration.
    Optimized for FIRST TOKEN LATENCY.
    """
    
    def __init__(self):
        self.prompt_builder = PromptBuilder()
        self.context_manager = ContextManager()
        self.mood_classifier = MoodClassifier()
        self.distress_detector = DistressDetector()
        self.sanitizer = ResponseSanitizer()

    async def _retrieve_memories(
        self,
        db: AsyncSession,
        patient: Patient,
        session_id: uuid.UUID,
        user_message: str,
    ) -> List[Dict[str, str]]:
        from app.repositories.message_repo import MessageRepository
        try:
            query_embedding = await ollama_client.embed(user_message)
            repo = MessageRepository(db)
            memories = await repo.semantic_search(
                patient_id=patient.id,
                current_session_id=session_id,
                query_embedding=query_embedding,
                top_k=settings.memory.top_k,
                similarity_threshold=settings.memory.similarity_threshold,
            )
            if not memories:
                logger.debug("clara_engine_no_recalled_memories", patient_id=str(patient.id))
                return []

            logger.info(
                "clara_engine_recalled_memories",
                patient_id=str(patient.id),
                count=len(memories),
            )
            memory_lines = [f"- {msg.content.strip()}" for msg in memories]
            recalled_block = (
                "## Recalled Memories (genuine excerpts from past conversations with this patient — "
                "you MAY reference these specifically):\n" + "\n".join(memory_lines)
            )
            return [{"role": "system", "content": recalled_block}]
        except Exception as e:
            logger.warning("clara_engine_memory_retrieval_failed", error=str(e), patient_id=str(patient.id))
            return []

    async def process_message(
        self,
        db: AsyncSession,
        patient: Patient,
        session_id: uuid.UUID,
        user_message: str
    ) -> AsyncGenerator[EngineResponse, None]:
        # 1. Start all preparation tasks
        mood_task = asyncio.create_task(self.mood_classifier.classify(user_message))
        context_task = asyncio.create_task(self.context_manager.load_context(session_id))
        memory_task = asyncio.create_task(self._retrieve_memories(db, patient, session_id, user_message))
        
        # 2. Safety scan (fast)
        distress_result = self.distress_detector.analyze_with_severity(user_message)
        if distress_result.is_distressed:
            asyncio.create_task(AlertService().create_and_notify(
                organization_id=patient.organization_id,
                session_id=session_id,
                patient_id=patient.id,
                distress_level=distress_result.severity or "medium",
                message_content=user_message,
                categories=distress_result.categories
            ))
            
        patient_name = patient.preferred_name or patient.name.split()[0]
        
        # 3. Dynamic Emergency Fast-Path (No hardcoded strings)
        if distress_result.is_distressed and distress_result.severity in ["critical", "high"]:
            # We skip memory and context retrieval entirely to save database/embedding latency
            # and inject a highly urgent, stripped-down system prompt.
            system_prompt = self.prompt_builder.build_emergency_prompt(
                patient, 
                distress_result.severity, 
                distress_result.categories
            )
            full_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            # Restrict token generation for maximum speed
            llm_options = {
                "temperature": 0.4,  # Lower temp for more deterministic, calming response
                "num_predict": 60,   # Prevent long rambling
                "num_ctx": 1024,
            }
        else:
            # NORMAL PATH
            # ONLY wait for critical components needed for prompt
            # Mood is NOT critical for starting the stream
            context, memory_messages = await asyncio.gather(context_task, memory_task)
            
            system_prompt = self.prompt_builder.build_system_prompt(patient)
            full_messages = (
                [{"role": "system", "content": system_prompt}]
                + memory_messages
                + (context or [{"role": "system", "content": f"Session start with {patient_name}."}])
                + [{"role": "user", "content": user_message}]
            )
            llm_options = {
                "temperature": settings.ollama.temperature,
                "num_ctx": settings.ollama.num_ctx,
            }
        
        # 5. STREAM IMMEDIATELY
        stream_buffer = _StreamBuffer(self.sanitizer, patient_name)
        full_response_raw = ""
        
        try:
            async for delta in ollama_client.chat_stream(
                full_messages,
                model=settings.ollama.model,
                options=llm_options
            ):
                full_response_raw += delta
                token_to_send = stream_buffer.process_token(delta)
                if token_to_send:
                    # Provide word-by-word/char-by-char experience
                    yield EngineResponse(token=token_to_send)
            
            # 6. Post-stream finalization
            mood_result = await mood_task # mood should be done by now
            
            distress_marker_found = self.prompt_builder.DISTRESS_MARKER in full_response_raw
            clean_response = full_response_raw.replace(self.prompt_builder.DISTRESS_MARKER, "").strip()
            # Professional scrubbing before persistence
            clean_response = self.sanitizer.sanitize(clean_response, patient_name)
            
            # Redis sync
            await self.context_manager.add_message(session_id, "user", user_message)
            await self.context_manager.add_message(session_id, "assistant", clean_response)
            
            yield EngineResponse(
                token="",
                is_final=True,
                mood=mood_result,
                distress_detected=distress_result.is_distressed or distress_marker_found,
                distress_severity=distress_result.severity or ("high" if distress_marker_found else None),
                distress_categories=distress_result.categories,
                full_response=clean_response
            )
            
        except Exception as e:
            logger.error("clara_engine_stream_failed", error=str(e))
            raise e

clara_engine = ClaraEngine()
