# Clara Backend — Caregiver Note Schemas
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CaregiverNoteCreate(BaseModel):
    """Payload for creating a new clinical note."""
    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Free-text clinical observation. Never exposed to patients or AI.",
    )


class CaregiverNoteResponse(BaseModel):
    """
    Public schema for a caregiver note as returned by the API.
    caregiver_id is included so the UI can enforce edit/delete ownership.
    """
    id: uuid.UUID
    patient_id: uuid.UUID
    caregiver_id: uuid.UUID
    organization_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
