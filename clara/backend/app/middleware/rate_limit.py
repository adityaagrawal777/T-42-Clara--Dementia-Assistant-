# Clara Backend — Redis Rate Limiting Middleware
import time
import structlog
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.db.redis import redis_client
from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Flood protection at the session and IP level.
    Uses Redis as a shared counter across backend workers.

    Fails open when Redis is unavailable (e.g. local dev without network)
    so that the rest of the application continues to work normally.
    """

    # Quotas
    SESSION_LIMIT = 30   # req/min
    IP_LIMIT = 100       # req/min
    WINDOW = 60          # 1 minute

    async def dispatch(self, request: Request, call_next):

        # 0. Exempt health / docs routes
        exempt = {"/health", "/docs", "/openapi.json"}
        if request.url.path in exempt:
            return await call_next(request)

        # 1. Identify context
        session_id = request.headers.get("X-Session-Id", "anonymous")
        client_ip = request.client.host if request.client else "unknown"

        try:
            # 2. Check IP Limit
            ip_key = f"rate:ip:{client_ip}"
            ip_count = await self._increment_and_check(ip_key)
            if ip_count > self.IP_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="IP-level rate limit exceeded.",
                )

            # 3. Check Session Limit (if a session header is present)
            if session_id != "anonymous":
                sess_key = f"rate:session:{session_id}"
                sess_count = await self._increment_and_check(sess_key)
                if sess_count > self.SESSION_LIMIT:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Session-level rate limit exceeded.",
                        headers={"Retry-After": "60"},
                    )

        except HTTPException:
            # Re-raise genuine 429s so they reach the client
            raise
        except Exception as exc:
            # Redis unavailable (no network, Upstash unreachable, etc.)
            # Fail-open: log a warning and let the request through.
            log.warning(
                "rate_limit_redis_unavailable",
                path=request.url.path,
                error=str(exc),
            )

        return await call_next(request)

    async def _increment_and_check(self, key: str) -> int:
        """
        Atomically increment a 1-minute bucketed counter in Redis and return
        the new value.  Uses a single pipeline round-trip (INCR + EXPIRE).
        """
        now = int(time.time() // self.WINDOW)   # 1-minute bucket
        full_key = f"{key}:{now}"

        pipe = redis_client.pipeline()
        pipe.incr(full_key)
        pipe.expire(full_key, self.WINDOW * 2)  # 2-window TTL for cleanup
        results = await pipe.execute()

        # results[0] = new count after INCR
        return int(results[0])
