# Clara Backend — Async Database Session
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _build_db_url() -> str:
    """
    Build a clean asyncpg-compatible URL from settings.
    
    Supabase provides two connection endpoints:
      - Port 5432:  Direct PostgreSQL — best for persistent server-side pools (this app)
      - Port 6543:  PgBouncer transaction-mode — designed for serverless/edge functions ONLY
    
    We use the direct connection (5432) because FastAPI keeps a persistent async pool.
    PgBouncer transaction-mode does not support asyncpg prepared statements and should
    never be used with long-lived connection pools.
    """
    url = settings.database_url or "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    # Normalize %% encoding from .env readers
    url = url.replace("%%", "%")
    # Ensure the asyncpg dialect prefix
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


db_url = _build_db_url()

# ── Engine ───────────────────────────────────────────────────────────────────
engine = create_async_engine(
    db_url,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=300,    # Recycle connections every 5 minutes
    pool_pre_ping=True,  # Health-check before reusing a connection from the pool
    connect_args={
        # Disable JIT compilation — reduces startup latency on Supabase
        "server_settings": {"jit": "off"},
    },
)

# ── Session factory ──────────────────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
    autoflush=True,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields a scoped AsyncSession per request."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
