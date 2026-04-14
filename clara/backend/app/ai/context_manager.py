# Clara Backend — Redis Context Management
import json
import uuid
import structlog
from typing import List, Dict, Optional
from app.db.redis import redis_client, SESSION_CONTEXT_KEY, SESSION_TTL
from app.ai.ollama_client import ollama_client
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class ContextManager:
    """
    Session-scoped state manager for conversation history in Redis.
    Handles memory compression via Ollama-based summarization to keep context windows lean.
    """
    
    # Context window limits for optimizing model prefill time
    MAX_CONTEXT_MESSAGES = 20
    SUMMARIZATION_THRESHOLD = 10

    async def load_context(self, session_id: uuid.UUID) -> List[Dict[str, str]]:
        """Fetch the current context window from Redis persistence."""
        key = SESSION_CONTEXT_KEY.format(session_id=session_id)
        
        try:
            context_data = await redis_client.get(key)
            if not context_data:
                return []
            return json.loads(context_data)
        except Exception as e:
            logger.warning("context_load_failed", session_id=str(session_id), error=str(e))
            return []

    async def add_message(self, session_id: uuid.UUID, role: str, content: str):
        """Append a new interaction turn and trigger summarization if the window exceeds limits."""
        context = await self.load_context(session_id)
        
        # Add the new message
        context.append({"role": role, "content": content})
        
        # Check for window overflow
        if len(context) > self.MAX_CONTEXT_MESSAGES:
            logger.info("context_limit_reached", session_id=str(session_id), count=len(context))
            context = await self._summarize_context(context, session_id)
            
        # Save back to Redis with TTL refresh
        key = SESSION_CONTEXT_KEY.format(session_id=session_id)
        try:
            await redis_client.set(
                key, 
                json.dumps(context), 
                ex=SESSION_TTL
            )
        except Exception as e:
            logger.error("context_save_failed", session_id=str(session_id), error=str(e))

    async def _summarize_context(self, context: List[Dict[str, str]], session_id: uuid.UUID) -> List[Dict[str, str]]:
        """Compress the oldest part of the conversation into a single system anchor."""
        
        to_summarize = context[:self.SUMMARIZATION_THRESHOLD]
        remaining = context[self.SUMMARIZATION_THRESHOLD:]
        
        # Build concise summarization prompt
        conv_str = "\n".join([f"{m['role']}: {m['content']}" for m in to_summarize])
        summarize_prompt = (
            f"Summarize this interaction between a dementia patient and Clara "
            f"in one short, factual sentence for continuity. Start with 'Earlier: '.\n\n"
            f"{conv_str}"
        )
        
        try:
            # Use non-streaming chat for lighter, cleaner internal logic
            summary_content = await ollama_client.chat(
                [{"role": "user", "content": summarize_prompt}],
                model=settings.ollama.model
            )
            
            summary_message = {"role": "system", "content": summary_content.strip()}
            logger.info("context_summarized", session_id=str(session_id))
            return [summary_message] + remaining
            
        except Exception as e:
            logger.warning("context_summarize_failed", session_id=str(session_id), error=str(e))
            # Graceful fallback: just truncate oldest message to avoid infinite overflow
            return remaining

    async def clear_context(self, session_id: uuid.UUID):
        """Permanently delete conversation history on session end (Privacy/GDPR)."""
        key = SESSION_CONTEXT_KEY.format(session_id=session_id)
        try:
            await redis_client.delete(key)
            logger.info("context_cleared", session_id=str(session_id))
        except Exception as e:
            logger.warning("context_clear_failed", session_id=str(session_id), error=str(e))
