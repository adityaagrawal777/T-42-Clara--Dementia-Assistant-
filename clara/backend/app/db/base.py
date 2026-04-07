import uuid
from datetime import datetime
from sqlalchemy import DateTime, text, Boolean, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from typing import Optional

class Base(DeclarativeBase):
    """
    Main declarative base for all Clara models.
    All models should inherit from this class.
    """
    pass

class TimestampMixin:
    """Automatic tracking of creation and modification events."""
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=text("now()"), 
        onupdate=text("now()")
    )

class SoftDeleteMixin:
    """Enterprise-grade safety: Records are deactivated rather than purged."""
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class TenantMixin:
    """Foundational Multi-tenancy: Strictly isolates data per organization/clinic."""
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
