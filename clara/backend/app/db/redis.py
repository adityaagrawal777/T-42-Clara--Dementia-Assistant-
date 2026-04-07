# Clara Backend — Async Redis Client & Keys
from typing import AsyncGenerator
import redis.asyncio as redis
from app.config import get_settings

settings = get_settings()

# Pattern constants (never use raw strings for keys)
SESSION_CONTEXT_KEY = "clara:session:{session_id}:context"
SESSION_MOOD_KEY    = "clara:session:{session_id}:mood"
PATIENT_PROFILE_KEY = "clara:patient:{patient_id}:profile"
CAREGIVER_FCM_KEY   = "clara:caregiver:{user_id}:fcm_token"
SESSION_SIGNALS_KEY = "clara:session:{session_id}:signals"
SESSION_RECENT_MSGS_KEY = "clara:session:{session_id}:recent_msgs"

# TTLs in seconds
SESSION_TTL = 14400  # 4 hours
PROFILE_TTL = 3600   # 1 hour

# Connection Pool initialization
redis_client = redis.from_url(
    str(settings.redis.url), 
    password=settings.redis.password,
    decode_responses=True,
    max_connections=20
)

async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    """Dependency for yielding an async Redis connection from the pool."""
    async with redis_client.client() as client:
        try:
            yield client
        finally:
            # redis-py handles connection release back to pool
            pass

async def close_redis():
    """Safety shutdown of the connection pool."""
    await redis_client.aclose()
