# Clara Backend — Application Factory Main Entry
import time
from contextlib import asynccontextmanager
import structlog
import sentry_sdk
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.v1.router import api_router
from app.ai.ollama_client import ollama_client
from app.db.redis import close_redis
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware

settings = get_settings()
logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous Startup and Shutdown lifecycle.
    Manages resource persistence and external health.
    """
    try:
        # 1. Start: Initialize Sentry for error tracking
        if settings.obs.sentry_dsn_backend:
            sentry_sdk.init(
                dsn=settings.obs.sentry_dsn_backend,
                environment=settings.obs.environment,
                traces_sample_rate=0.2
            )
            logger.info("lifecycle_startup", sentry="initialized")

        # 2. Start: AI Service Integrity Check
        ollama_ready = await ollama_client.health_check()
        if not ollama_ready:
            logger.warn("lifecycle_startup", ollama="disconnected", message="AI engine is not reachable on boot.")
        else:
            logger.info("lifecycle_startup", ollama="connected", model=settings.ollama.model)

        logger.info("lifecycle_startup", env=settings.obs.environment)

        yield # --- App is running and serving requests ---

    except Exception as e:
        logger.error("lifecycle_error", error=str(e))
        raise e
    finally:
        # 3. Stop: Graceful Resource Cleanup
        await ollama_client.close()
        await close_redis()
        logger.info("lifecycle_shutdown", message="Backend services successfully finalized.")

# Instantiate main application
app = FastAPI(
    title="Clara AI API",
    description="Empathetic Dementia Care AI Companion backend gateway.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.obs.environment != "production" else None,
    redoc_url=None
)

# ── Middleware Registry (Order Matters: Bottom-Up Process) ────────────────

# 1. Security: Content Security Policies (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Protection: Global Error Handling (Outer Catch)
app.add_middleware(ErrorHandlerMiddleware)

# 3. Performance: Rate Limiting (Flood Protection)
app.add_middleware(RateLimitMiddleware)

# 4. Observability: Structured Logging (Inner Trace)
app.add_middleware(LoggingMiddleware)


# ── Routing Discovery ────────────────────────────────────────────────────────

# Root Health & Discovery
@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def get_system_health():
    """Unauthenticated check: Status of AI, DB, and environment labels."""
    ollama_status = await ollama_client.health_check()
    return {
        "status": "ok",
        "ollama": ollama_status,
        "environment": settings.obs.environment,
        "model": settings.ollama.model
    }

# V1 API Router: auth, patients, sessions, chat, caregiver
app.include_router(api_router, prefix="/api/v1")
