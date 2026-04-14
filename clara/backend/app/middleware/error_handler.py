# Clara Backend — Global Exception Middleware
import traceback
import structlog
import sentry_sdk
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.config import get_settings
from app.ai.exceptions import ClaraAIError

settings = get_settings()
logger = structlog.get_logger()


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Catch-all for internal failures and domain exceptions.
    Returns FastAPI-compatible {"detail": "..."} JSON for all error responses
    so the frontend always gets valid, parseable JSON regardless of error type.
    """

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response

        except ClaraAIError as ai_ex:
            # Domain-specific AI error — surface a safe user message
            logger.warning(
                "ai_engine_failure",
                message=str(ai_ex),
                context=getattr(ai_ex, "log_context", {}),
                path=request.url.path,
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": ai_ex.user_safe_message},
            )

        except HTTPException as http_ex:
            # FastAPI/Starlette documented HTTP errors — pass detail through as-is
            logger.info(
                "http_exception",
                status=http_ex.status_code,
                detail=http_ex.detail,
                path=request.url.path,
            )
            return JSONResponse(
                status_code=http_ex.status_code,
                content={"detail": http_ex.detail},
            )

        except Exception as e:
            # Unhandled crash — log full traceback, never leak internals to the client
            tb = traceback.format_exc()
            logger.error(
                "system_unhandled_exception",
                error=str(e),
                traceback=tb,
                path=request.url.path,
            )

            # Ship to Sentry when configured
            if settings.obs.sentry_dsn_backend:
                sentry_sdk.capture_exception(e)

            # In development, surface the raw error so engineers can debug quickly
            if settings.obs.environment == "development":
                detail = f"{type(e).__name__}: {str(e)}"
            else:
                detail = "An internal error occurred. Our team has been notified."

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": detail},
            )
