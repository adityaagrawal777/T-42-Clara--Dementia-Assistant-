# Clara Backend — Application Factory Main Entry
import asyncio
from contextlib import asynccontextmanager
import structlog
import sentry_sdk
from fastapi import FastAPI, status
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

        # 2. Start: AI Service Integrity Check & Warmup
        ollama_ready = await ollama_client.health_check()
        if not ollama_ready:
            logger.warning("lifecycle_startup", ollama="disconnected", message="AI engine is not reachable on boot.")
        else:
            logger.info("lifecycle_startup", ollama="connected", model=settings.ollama.model)
            # Warm up BOTH models in parallel — loads weights into VRAM before first user query.
            # The embedding model cold-start is the primary cause of first-query latency because
            # _retrieve_memories() must await embed() before streaming can begin.
            try:
                await asyncio.gather(
                    ollama_client.chat([{"role": "user", "content": "hi"}], model=settings.ollama.model),
                    ollama_client.embed("warmup"),
                )
                logger.info("lifecycle_startup", ollama="warmed_up", models=[settings.ollama.model, settings.ollama.embedding_model])
            except Exception as e:
                logger.warning("lifecycle_startup", ollama="warmup_failed", error=str(e))

        # 3. Start: Database Auto-Provisioning
        # On first run, ensure a default organization exists so patients can register
        # immediately without any manual setup. Fully config-driven via .env.
        try:
            from app.db.session import async_session_factory
            from sqlalchemy import select
            from app.models.organization import Organization

            async with async_session_factory() as db:
                result = await db.execute(select(Organization).limit(1))
                org = result.scalars().first()
                if not org:
                    org = Organization(
                        name=settings.org_name,
                        slug=settings.org_slug,
                        admin_email=settings.org_admin_email,
                        assistant_name=settings.org_assistant_name,
                        is_active=True,
                    )
                    db.add(org)
                    await db.commit()
                    logger.info(
                        "lifecycle_startup",
                        org="auto_provisioned",
                        name=settings.org_name,
                        slug=settings.org_slug,
                    )
                else:
                    logger.info("lifecycle_startup", org="exists", slug=org.slug)
        except Exception as db_err:
            # Non-fatal — the app can still start; patient registration will fail
            # gracefully with a clear message if the DB is truly unavailable.
            logger.error("lifecycle_startup", org="provisioning_failed", error=str(db_err))

        # 4. Start: Email transport validation
        # Confirms SMTP credentials are present so failures are caught at boot,
        # not silently at alert-send time when a patient is already in distress.
        if settings.smtp_user and settings.smtp_password:
            logger.info(
                "lifecycle_startup",
                email="gmail_smtp_ready",
                smtp_user=settings.smtp_user,
                alert_to=settings.alert_email_to,
            )
        else:
            logger.warning(
                "lifecycle_startup",
                email="smtp_credentials_missing",
                detail="Set SMTP_USER and SMTP_PASSWORD in .env — caregiver emails will NOT be sent.",
            )

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
@app.get("/", tags=["System"])
async def root():
    """API discovery: Service identity, version, and available endpoints."""
    return {
        "name": "Clara AI API",
        "version": "1.0.0",
        "description": "Empathetic Dementia Care AI Companion",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "api": "/api/v1",
        },
    }


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
