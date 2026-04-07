# Clara Backend — Patient Schemas
import uuid
from datetime import date, datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, Field

class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    date_of_birth: Optional[date] = None
    hometown: Optional[str] = Field(None, max_length=255)
    occupation_history: Optional[str] = None
    family_names: Optional[Dict] = None
    favourite_topics: Optional[List[str]] = None
    life_memories: Optional[List[Dict]] = None
    preferred_name: Optional[str] = Field(None, max_length=100)
    language: str = "en"
    is_active: bool = True

class PatientCreate(PatientBase):
    """Schema for creating a new patient record."""
    pass

class PatientUpdate(BaseModel):
    """Schema for partial patient profile updates."""
    name: Optional[str] = None
    hometown: Optional[str] = None
    occupation_history: Optional[str] = None
    family_names: Optional[Dict] = None
    favourite_topics: Optional[List[str]] = None
    life_memories: Optional[List[Dict]] = None
    preferred_name: Optional[str] = None
    is_active: Optional[bool] = None

class PatientResponse(PatientBase):
    """Public schema for API responses, including internal IDs."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
