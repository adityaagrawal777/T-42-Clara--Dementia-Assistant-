# Clara Backend — Structured Logging Middleware
import time
import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import get_settings

settings = get_settings()

# Initialize structlog context logger
logger = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured logging for every HTTP turn.
    Ensures safe logs without exposing sensitive bodies or tokens.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        
        # 1. Capture request metadata
        method = request.method
        path = request.url.path
        client_host = request.client.host if request.client else "unknown"
        
        try:
            # 2. Process request through the chain
            response = await call_next(request)
            
            # 3. Finalize duration analytics
            process_time = (time.perf_counter() - start_time) * 1000
            
            # 4. Log the result
            logger.info(
                "request_complete",
                method=method,
                path=path,
                status_code=response.status_code,
                duration_ms=round(process_time, 2),
                client_host=client_host,
                environment=settings.obs.environment
            )
            
            return response
            
        except Exception as e:
            # Re-raise for error_handler middleware to capture
            raise e
