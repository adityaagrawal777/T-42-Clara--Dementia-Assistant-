import pytest
# Preload all models to ensure SQLAlchemy's declarative registry is fully populated
from app.models.patient import Patient
from app.models.organization import Organization
from app.models.session import ClaraSession
from app.models.alert import Alert
from app.models.message import Message
from app.models.caregiver import Caregiver
from app.models.audit import AuditLog
