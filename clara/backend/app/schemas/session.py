# Clara Backend — ClaraSession Schemas
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class SessionBase(BaseModel):
    patient_id: uuid.UUID
    mode: str = Field("chat", max_length=50) # chat | voice | mixed
    mood_summary: Optional[str] = Field(None, max_length=255)
    message_count: int = 0
    alert_count: int = 0

class SessionCreate(BaseModel):
    """Initial session creation schema."""
    patient_id: uuid.UUID
    mode: str = "chat"

class SessionUpdate(BaseModel):
    """Schema for ending a session or manual update."""
    mood_summary: Optional[str] = None
    ended_at: Optional[datetime] = None
    message_count: Optional[int] = None
    alert_count: Optional[int] = None

class SessionResponse(SessionBase):
    """Full ClaraSession API response schema."""
    id: uuid.UUID
    started_at: datetime
    ended_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedSessionsResponse(BaseModel):
    """Paginated response for a patient's session history."""
    sessions: List[SessionResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
