# Clara Backend — Async Ollama HTTP Client
import json
import httpx
from typing import List, Dict, AsyncGenerator, Any, Optional
import structlog

from app.ai.exceptions import OllamaUnavailableError, OllamaTimeoutError
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class OllamaClient:
    """
    Direct async communicator for the Ollama REST API.
    Uses httpx with a shared connection pool for efficiency.
    """
    def __init__(self):
        # Initialise shared connection pool with industry-standard limits
        self.limits = httpx.Limits(max_connections=50, max_keepalive_connections=10)
        self.timeout = httpx.Timeout(120.0, connect=5.0)
        self.base_url = settings.ollama.base_url
        self._async_client = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy-loaded async client for connection reuse."""
        if self._async_client is None or self._async_client.is_closed:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                limits=self.limits,
                timeout=self.timeout
            )
        return self._async_client

    async def chat_stream(
        self, 
        messages: List[Dict[str, str]], 
        model: str, 
        options: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Streaming chat interface via /api/chat.
        Yields content delta strings as they arrive from the model.
        """
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": options or {}
        }
        
        try:
            async with self.client.stream("POST", "/api/chat", json=payload) as response:
                if response.status_code != 200:
                    error_detail = await response.aread()
                    raise OllamaUnavailableError(
                        f"Ollama server returned HTTP {response.status_code}",
                        {"status_code": response.status_code, "detail": error_detail.decode()}
                    )
                
                async for chunk in response.aiter_lines():
                    if not chunk:
                        continue
                    
                    try:
                        data = json.loads(chunk)
                        if "message" in data:
                            yield data["message"].get("content", "")
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
                        
        except (httpx.ConnectError, httpx.PoolTimeout) as e:
            raise OllamaUnavailableError(f"Connection error: {str(e)}")
        except httpx.ReadTimeout:
            raise OllamaTimeoutError("Timed out while reading from Ollama stream.")

    async def chat(
        self, 
        messages: List[Dict[str, str]], 
        model: str, 
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Non-streaming chat interface. Useful for internal tasks like 
        mood classification or summarization.
        """
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": options or {}
        }
        
        try:
            response = await self.client.post("/api/chat", json=payload)
            if response.status_code != 200:
                raise OllamaUnavailableError(f"Ollama error: HTTP {response.status_code}")
            
            data = response.json()
            return data.get("message", {}).get("content", "").strip()
        except Exception as e:
            logger.error("ollama_chat_failed", error=str(e))
            raise OllamaUnavailableError(str(e))

    async def embed(self, text: str) -> List[float]:
        """
        Generate a semantic embedding vector for the given text.
        Uses the configured embedding model (e.g. nomic-embed-text).

        Returns a list of floats ready for pgvector insertion or search.
        """
        payload = {
            "model": settings.ollama.embedding_model,
            "prompt": text,
        }
        try:
            response = await self.client.post("/api/embeddings", json=payload)
            if response.status_code != 200:
                raise OllamaUnavailableError(
                    f"Ollama embeddings returned HTTP {response.status_code}"
                )
            
            data = response.json()
            embedding = data.get("embedding")
            if not embedding:
                raise KeyError("Response missing 'embedding' field")
                
            return embedding
        except Exception as e:
            logger.error("ollama_embed_failed", error=str(e))
            raise OllamaUnavailableError(f"Embedding failed: {str(e)}")

    async def health_check(self) -> bool:
        """Lightweight endpoint check for Ollama availability."""
        try:
            response = await self.client.get("/api/tags", timeout=2.0)
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        """Graceful shutdown of the underlying connection pool."""
        if self._async_client and not self._async_client.is_closed:
            await self._async_client.aclose()

# Singleton instance
ollama_client = OllamaClient()
