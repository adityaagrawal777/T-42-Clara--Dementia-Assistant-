# Clara Backend — Message Schemas
import uuid
from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field

class MessageBase(BaseModel):
    session_id: uuid.UUID
    role: str = Field(..., max_length=50) # patient | clara
    content: str
    mood: Optional[str] = Field(None, max_length=50)
    mood_score: Optional[float] = None
    input_mode: Optional[str] = Field("chat", max_length=50) # voice | chat
    tts_params: Optional[Dict] = None

class MessageCreate(MessageBase):
    """Schema for adding a message to the conversation history."""
    pass

class MessageResponse(MessageBase):
    """Schema for displaying a message in the conversation feed."""
    id: uuid.UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
