# Clara Backend — Async Ollama HTTP Client
import json
import httpx
from typing import List, Dict, AsyncGenerator, Any, Optional
import structlog

logger = structlog.get_logger()

from app.ai.exceptions import OllamaUnavailableError, OllamaTimeoutError
from app.config import get_settings

settings = get_settings()

class OllamaClient:
    """
    Direct async communicator for the Ollama REST API.
    Uses httpx and custom streaming generators.
    """
    def __init__(self):
        # Initialise shared connection pool
        self.limits = httpx.Limits(max_connections=50, max_keepalive_connections=10)
        self.timeout = httpx.Timeout(120.0, connect=5.0)
        self.base_url = settings.ollama.base_url
        self._async_client = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._async_client is None or self._async_client.is_closed:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                limits=self.limits,
                timeout=self.timeout
            )
        return self._async_client

    async def chat_stream(self, messages: List[Dict[str, str]], model: str, options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:


        """
        Streaming chat interface via /api/chat.
        Yields content delta strings per chunk.
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
                    raise OllamaUnavailableError(
                        f"Ollama server returned HTTP {response.status_code}",
                        {"status_code": response.status_code}
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
            raise OllamaUnavailableError(str(e))
        except httpx.ReadTimeout:
            raise OllamaTimeoutError("Timed out while reading from Ollama.")

    async def embed(self, text: str, model: str) -> Optional[List[float]]:
        """
        Generate a semantic embedding vector for the given text.

        Uses the /api/embeddings endpoint (dedicated embedding models
        like nomic-embed-text are far more efficient than asking the
        generative model to produce embeddings).

        Returns None on any failure — embedding is a non-critical background
        operation. Clara must continue functioning even if Ollama is slow.
        """
        try:
            response = await self.client.post(
                "/api/embeddings",
                json={"model": model, "prompt": text},
                timeout=30.0
            )
            if response.status_code != 200:
                return None
            data = response.json()
            return data.get("embedding")
        except Exception:
            # Embedding failures are non-fatal. Log but never raise.
            return None

    async def health_check(self) -> bool:
        """Lightweight endpoint check for /api/tags."""
        try:
            response = await self.client.get("/api/tags", timeout=2.0)
            return response.status_code == 200
        except Exception:
            return False

    async def embed(self, text: str) -> List[float]:
        """
        Generate a semantic embedding vector for the given text.
        Calls the /api/embeddings endpoint using the dedicated
        OLLAMA_EMBEDDING_MODEL (e.g. nomic-embed-text, 768-dim).

        Returns a list of floats ready for pgvector insertion.
        Raises OllamaUnavailableError if Ollama cannot be reached.
        """
        payload = {
            "model": settings.ollama.embedding_model,
            "prompt": text,
        }
        try:
            response = await self.client.post("/api/embeddings", json=payload)
            if response.status_code != 200:
                raise OllamaUnavailableError(
                    f"Ollama embeddings endpoint returned HTTP {response.status_code}",
                    {"status_code": response.status_code}
                )
            data = response.json()
            embedding: List[float] = data["embedding"]
            logger.debug(
                "ollama_embed_ok",
                model=settings.ollama.embedding_model,
                dims=len(embedding)
            )
            return embedding
        except (httpx.ConnectError, httpx.PoolTimeout) as exc:
            raise OllamaUnavailableError(
                f"Cannot reach Ollama for embeddings: {exc}"
            ) from exc
        except KeyError as exc:
            raise OllamaUnavailableError(
                "Ollama embeddings response missing 'embedding' key"
            ) from exc

    async def close(self):
        """Cleanup the async client connection pool."""
        if self._async_client and not self._async_client.is_closed:
            await self._async_client.aclose()

# Instantiate singleton client
ollama_client = OllamaClient()
