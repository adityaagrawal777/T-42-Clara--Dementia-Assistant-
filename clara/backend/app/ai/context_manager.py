# Clara Backend — Redis Context Management
import json
import uuid
from typing import List, Dict, Optional
from app.db.redis import redis_client, SESSION_CONTEXT_KEY, SESSION_TTL
from app.ai.ollama_client import ollama_client
from app.config import get_settings

settings = get_settings()

class ContextManager:
    """
    State manager for conversation history in Redis.
    Handles memory compression via Ollama summarization.
    """
    
    # Configurable limits
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
            # Catch Redis connection errors or JSON decode errors gracefully
            print(f"[ContextManager] Warning: Could not load context from Redis: {e}")
            return []

    async def add_message(self, session_id: uuid.UUID, role: str, content: str):
        """Append a new interaction turn to the history and manage overflow."""
        context = await self.load_context(session_id)
        
        # Add the new message
        context.append({"role": role, "content": content})
        
        # Check for window overflow
        if len(context) > self.MAX_CONTEXT_MESSAGES:
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
            print(f"[ContextManager] Warning: Could not save context to Redis: {e}")

    async def _summarize_context(self, context: List[Dict[str, str]], session_id: uuid.UUID) -> List[Dict[str, str]]:
        """Truncate and compress the oldest messages into a single summary block."""
        
        # Prepare messages to be summarized (the oldest SUMMARIZATION_THRESHOLD messages)
        to_summarize: List[Dict[str, str]] = list(context[:self.SUMMARIZATION_THRESHOLD])
        remaining: List[Dict[str, str]] = list(context[self.SUMMARIZATION_THRESHOLD:])

        
        # Build summarization prompt
        conv_str = "\n".join([f"{m['role']}: {m['content']}" for m in to_summarize])
        summarize_prompt = (
            f"Please summarize the following part of a conversation between a dementia patient "
            f"and their AI companion Clara in one short, factual sentence. Focus only on relevant history "
            f"needed for future interactions. Start with 'Earlier in this conversation: '.\n\n"
            f"{conv_str}"
        )
        
        # Call Ollama for summary
        try:
            # Note: We use a non-streaming call here for simplicity in internal logic
            # Since we didn't implement a non-streaming method in OllamaClient yet, 
            # I'll iterate through a stream to build the result.
            summary_content = ""
            async for chunk in ollama_client.chat_stream(
                [{"role": "user", "content": summarize_prompt}],
                model=settings.ollama.model
            ):
                summary_content += chunk
            
            summary_message = {"role": "system", "content": summary_content.strip()}
            return [summary_message] + remaining
            
        except Exception as e:
            # Fail gracefully by just truncating and logging
            print(f"Summarization failed for session {session_id}: {e}")
            return remaining

    async def clear_context(self, session_id: uuid.UUID):
        """Permanently delete conversation history on session end."""
        key = SESSION_CONTEXT_KEY.format(session_id=session_id)
        try:
            await redis_client.delete(key)
        except Exception as e:
            print(f"[ContextManager] Warning: Could not clear context from Redis: {e}")
