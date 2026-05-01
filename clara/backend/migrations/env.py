# Clara Backend — Async Alembic env.py
from logging.config import fileConfig
from sqlalchemy import pool, engine_from_config
from alembic import context

# Project imports for metadata discovery
from app.config import get_settings
from app.db.base import Base

# Import all models to ensure they are registered for migrations
from app.models.organization import Organization
from app.models.patient import Patient
from app.models.session import ClaraSession
from app.models.message import Message
from app.models.alert import Alert
from app.models.caregiver import Caregiver
from app.models.caregiver_note import CaregiverNote
from app.models.audit import AuditLog


settings = get_settings()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Database metadata for autogenerate support
target_metadata = Base.metadata

def get_url():
    """Extract and format sync URL for migration."""
    url = str(settings.db.url) if settings.db.url else "postgresql://postgres:postgres@localhost:5432/postgres"
    # Convert async schema back to sync for psycopg2
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    # Ensure escaped characters are ready for sync connect
    return url.replace("%%", "%")

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "pyformat"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
