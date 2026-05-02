# Clara Backend — Alert Schemas
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class AlertBase(BaseModel):
    session_id: uuid.UUID
    patient_id: uuid.UUID
    severity: str = Field("low", max_length=50) # low | medium | high | critical
    trigger_phrase: Optional[str] = Field(None, max_length=255)
    rule_name: Optional[str] = None
    message_content: Optional[str] = None
    mood_at_trigger: Optional[str] = Field(None, max_length=50)

class AlertCreate(AlertBase):
    """Schema for manual or system-triggered alert creation."""
    pass

class AlertResolve(BaseModel):
    """Schema for resolving an existing caregiver alert."""
    resolved_by: str = Field(..., min_length=1, max_length=100)
    resolved_at: datetime = Field(default_factory=datetime.utcnow)

class AlertResponse(AlertBase):
    """Schema for caregiver dashboard alert views."""
    id: uuid.UUID
    notified_at: Optional[datetime]
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
