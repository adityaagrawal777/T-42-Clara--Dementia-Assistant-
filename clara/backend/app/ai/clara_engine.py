# Clara Backend — Core AI Orchestration Engine
import uuid
import datetime
from dataclasses import dataclass
from typing import AsyncGenerator, Optional, List, Dict
import structlog
import re
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.ai.ollama_client import OllamaClient
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
    """Real-time token sanitization buffer."""
    def __init__(self, sanitizer: ResponseSanitizer, patient_name: str):
        self.sanitizer = sanitizer
        self.patient_name = patient_name
        self.raw_buffer = ""
        self.yielded_text = ""
        self.in_brackets = False

    def process_token(self, token: str) -> str:
        clean_token = ""
        for char in token:
            if char == '[':
                self.in_brackets = True
            elif char == ']':
                self.in_brackets = False
            elif not self.in_brackets:
                clean_token += char
                
        self.raw_buffer += clean_token
        
        # Flush at word boundaries
        match = re.search(r'[\s\.,!\?;:]', self.raw_buffer[::-1])
        if not match:
            return ""
            
        safe_idx = len(self.raw_buffer) - match.start()
        safe_content = self.raw_buffer[:safe_idx]
        
        sanitized = self.sanitizer.sanitize(safe_content, self.patient_name)
        
        if len(sanitized) > len(self.yielded_text):
            to_yield = sanitized[len(self.yielded_text):]
            self.yielded_text = sanitized
            return to_yield
            
        return ""

    def flush(self) -> str:
        sanitized = self.sanitizer.sanitize(self.raw_buffer, self.patient_name)
        if len(sanitized) > len(self.yielded_text):
            to_yield = sanitized[len(self.yielded_text):]
            self.yielded_text = sanitized
            return to_yield
        return ""

class ClaraEngine:
    """
    The unique entry point for all AI operations.
    No other layer calls OllamaClient, ContextManager, or MoodClassifier directly.

    Memory pipeline (added for cross-session recall):
      1. Embed the incoming user message with nomic-embed-text.
      2. Query the DB for semantically similar past interaction turns
         from PREVIOUS sessions of this same patient (via pgvector ANN).
      3. Prepend the retrieved memories into the context window so Clara
         can naturally reference them during her streamed response.
    """
    
    def __init__(self):
        self.ollama = OllamaClient()
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
        """
        Embed user_message and fetch the top-K most relevant past interaction
        memories from previous sessions for this patient.

        Returns a list of role-message dicts ready for insertion into the
        Ollama message list, or an empty list if embedding fails or no
        relevant memories exist.

        Failures are non-fatal: we log a warning and continue without memory
        rather than blocking Clara's response.
        """
        from app.repositories.message_repo import MessageRepository

        try:
            query_embedding = await self.ollama.embed(user_message)
        except Exception as embed_err:
            logger.warning(
                "engine_embed_query_failed",
                error=str(embed_err),
                fallback="proceeding without memory retrieval"
            )
            return []

        try:
            repo = MessageRepository(db)
            memories = await repo.semantic_search(
                patient_id=patient.id,
                current_session_id=session_id,
                query_embedding=query_embedding,
                top_k=settings.memory.top_k,
                similarity_threshold=settings.memory.similarity_threshold,
            )
        except Exception as search_err:
            logger.warning(
                "engine_semantic_search_failed",
                error=str(search_err),
                fallback="proceeding without memory retrieval"
            )
            return []

        if not memories:
            return []

        # Format remembered turns as a single system-level context injection.
        # We use a distinct framing so the model treats them as recalled facts,
        # not as part of the live conversation transcript.
        memory_lines = []
        for msg in memories:
            memory_lines.append(f"- {msg.content.strip()}")

        recalled_block = (
            "## Recalled details from Clara's long-term memory\n"
            "The following are verified facts Clara already knows about this patient "
            "from previous conversations. Reference them naturally if relevant — "
            "never fabricate additional details beyond what is listed here.\n"
            + "\n".join(memory_lines)
        )

        logger.info(
            "engine_memory_retrieved",
            patient_id=str(patient.id),
            memories_count=len(memories)
        )

        return [{"role": "system", "content": recalled_block}]

    async def process_message(
        self,
        db: AsyncSession,
        patient: Patient,
        session_id: uuid.UUID,
        user_message: str
    ) -> AsyncGenerator[EngineResponse, None]:
        """
        Main interactive entry point for the session.
        Streams empathetic, persona-driven responses with long-term memory.
        """
        
        # 1. SAFETY SCAN: Check user input for acute distress
        preview: str = str(user_message)  # explicit cast avoids Pyre2 str-slice false positive
        logger.debug("engine_safety_scan", message_preview=preview[:50])
        distress_result = self.distress_detector.analyze_with_severity(user_message)
        logger.debug("engine_safety_scan_complete", distress_detected=distress_result.is_distressed)
        if distress_result.is_distressed:
            # Trigger high-priority alert immediately
            alert_service = AlertService(db)
            await alert_service.create_and_notify(
                organization_id=patient.organization_id,
                session_id=session_id,
                patient_id=patient.id,
                distress_level=distress_result.severity or "medium",
                message_content=user_message,
                categories=distress_result.categories
            )
        
        # 2. Classify mood of the user message (Strategy A/B)
        mood_result: Optional[MoodResult] = await self.mood_classifier.classify(user_message)
        mood_label = mood_result.mood if mood_result is not None else "unknown"
        logger.debug("engine_mood_classified", mood=mood_label)
        
        # 3. Load context history from Redis
        context = await self.context_manager.load_context(session_id)
        
        # 4. Build specialized system instruction
        assistant_name = "Clara" # Hardcoded to prevent MissingGreenlet lazy-load error from SQLAlchemy
        system_prompt = self.prompt_builder.build_system_prompt(patient, assistant_name=assistant_name)
        
        # 5. Retrieve cross-session long-term memories via pgvector similarity
        #    These are fetched with the query embedding of the CURRENT user message,
        #    so only genuinely related historical facts are surfaced.
        memory_messages = await self._retrieve_memories(db, patient, session_id, user_message)
        
        # 6. Compose full message list
        # If this is the very first message in the session (no prior context),
        # inject a warm opening assistant turn so the model understands it has
        # already greeted the patient. This prevents cold-start persona drift
        # (e.g., "Not me, I'm Clara, here FOR Bud") on the very first exchange.
        patient_name = patient.preferred_name or patient.name.split()[0]
        if not context:
            context = [{
                "role": "assistant",
                "content": f"Hi {patient_name}! It's so lovely to hear from you. How are you doing today?"
            }]

        # Message order: [system] → [recalled memories (system)] → [session history] → [user turn]
        # Placing memory_messages after the main system prompt but before session
        # history ensures the model sees the persona rules first, then the long-term
        # memory facts, then the recent conversation flow.
        full_messages = (
            [{"role": "system", "content": system_prompt}]
            + memory_messages
            + context
            + [{"role": "user", "content": user_message}]
        )
        
        # 7. Stream tokens from the model
        full_response_raw = ""
        logger.debug("engine_stream_start", model=settings.ollama.model)
        
        patient_name = patient.preferred_name or patient.name.split()[0]
        stream_buffer = _StreamBuffer(self.sanitizer, patient_name)
        
        try:
            # 8. Stream AI response from Ollama with Performance Optimizations
            async for delta in self.ollama.chat_stream(
                full_messages,
                model=settings.ollama.model,
                options={
                    "temperature":    settings.ollama.temperature,
                    "num_predict":    settings.ollama.num_predict,
                    "top_k":          settings.ollama.top_k_sampling,
                    "top_p":          settings.ollama.top_p,
                    "repeat_penalty": settings.ollama.repeat_penalty,
                    "num_ctx":        settings.ollama.num_ctx,
                }
            ):
                full_response_raw += delta
                
                # Just yield the token directly to the frontend
                safe_delta = stream_buffer.process_token(delta)
                if safe_delta:
                    yield EngineResponse(token=safe_delta)
                
            # Flush any remaining text in the buffer
            final_delta = stream_buffer.flush()
            if final_delta:
                yield EngineResponse(token=final_delta)
                
            # 9. Post-processing: Check for distress marker
            distress_detected = self.prompt_builder.DISTRESS_MARKER in full_response_raw
            
            # 10. Strip the distress marker and sanitize any forbidden address terms
            clean_response = full_response_raw.replace(self.prompt_builder.DISTRESS_MARKER, "").strip()
            patient_name = patient.preferred_name or patient.name.split()[0]
            clean_response = self.sanitizer.sanitize(clean_response, patient_name)
            logger.debug("engine_response_sanitized", patient_name=patient_name)
            
            # 11. Update conversation context window in Redis
            # We add BOTH the user message and the assistant's clean response
            await self.context_manager.add_message(session_id, "user", user_message)
            await self.context_manager.add_message(session_id, "assistant", clean_response)
            
            # 12. Yield the final metadata chunk
            # Determine overall distress flag (either triggered by user message or AI output via DISTRESS_MARKER)
            final_distress = distress_result.is_distressed or distress_detected
            
            yield EngineResponse(
                token="",
                is_final=True,
                mood=mood_result,
                distress_detected=final_distress,
                distress_severity=distress_result.severity if distress_result.is_distressed else (
                    "critical" if distress_detected else None
                ),
                distress_categories=distress_result.categories if distress_result.is_distressed else [],
                full_response=clean_response
            )
            
        except Exception as e:
            logger.error("engine_stream_error", error=str(e))
            raise e

# Core singleton engine
clara_engine = ClaraEngine()
