# Clara Backend — Multi-stage Build Process
# STAGE 1: Builder (Install dependencies)
FROM python:3.12-slim as builder

# Set build arguments and envs
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /install
COPY requirements.txt .

# Install dependencies into /install
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# STAGE 2: Runner (Production runtime)
FROM python:3.12-slim as runner

WORKDIR /app

# Create non-root user for security (uid 1001)
RUN groupadd -g 1001 appuser && \
    useradd -r -u 1001 -g appuser appuser

# Copy installed dependencies from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Set ownership to non-root
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the API port
EXPOSE 8000

# Metadata
LABEL maintainer="Clara AI Team"
LABEL version="1.0.0"

# Main runtime command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
