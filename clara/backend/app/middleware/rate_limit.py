# Clara Backend — Redis Rate Limiting Middleware
import time
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.redis import redis_client
from app.config import get_settings

settings = get_settings()

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Flood protection at the session and IP level.
    Uses Redis as a shared counter across backend workers.
    """
    
    # Quotas
    SESSION_LIMIT = 30   # req/min
    IP_LIMIT = 100       # req/min
    WINDOW = 60          # 1 minute

    async def dispatch(self, request: Request, call_next):
        
        # 0. Exempt /health checks
        if request.url.path == "/health" or request.url.path == "/docs" or request.url.path == "/openapi.json":
            return await call_next(request)

        # 1. Identify context (Session (X-Session-Id header) or IP)
        session_id = request.headers.get("X-Session-Id", "anonymous")
        client_ip = request.client.host if request.client else "unknown"
        
        # 2. Check IP Limit
        ip_key = f"rate:ip:{client_ip}"
        ip_count = await self._increment_and_check(ip_key, self.IP_LIMIT)
        if ip_count > self.IP_LIMIT:
             raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                detail="IP-level rate limit exceeded."
            )

        # 3. Check Session Limit (if provided)
        if session_id != "anonymous":
            sess_key = f"rate:session:{session_id}"
            sess_count = await self._increment_and_check(sess_key, self.SESSION_LIMIT)
            if sess_count > self.SESSION_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                    detail="Session-level rate limit exceeded.",
                    headers={"Retry-After": "60"}
                )

        return await call_next(request)

    async def _increment_and_check(self, key: str, limit: int) -> int:
        """Atomic increment and TTL management in Redis."""
        pipe = redis_client.pipeline()
        now = int(time.time() // self.WINDOW) # 1-minute bucketing
        full_key = f"{key}:{now}"
        
        # Set expiry for cleanup (2 windows = 2 minutes)
        await pipe.incr(full_key).expire(full_key, 120).execute()
        results = await pipe.get(full_key).execute() # Re-verify count
        
        # Incremented value is the first result of the pipeline execution usually
        # But we'll just parse the result from pipe.execute()
        return int(results[0])
