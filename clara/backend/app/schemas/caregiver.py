# Clara Backend — Caregiver Schemas
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class CaregiverBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    associated_patient_ids: Optional[List[uuid.UUID]] = None

class CaregiverCreate(CaregiverBase):
    """Schema for manual or system registration of a care professional."""
    password: str = Field(..., min_length=8)

class CaregiverResponse(CaregiverBase):
    """Public schema for API responses for a registered caregiver."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
