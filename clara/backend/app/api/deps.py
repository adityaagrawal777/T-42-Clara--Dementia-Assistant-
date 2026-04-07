# Clara Backend — FastAPI Dependency Injection
import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.db.redis import get_redis
from app.services.auth_service import CurrentUser, auth_service
from app.config import get_settings

settings = get_settings()

from fastapi import Depends, HTTPException, status, Header
from app.models.organization import Organization
from app.repositories.organization_repo import OrganizationRepository


# Standard Bearer token extraction
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",
    auto_error=False
)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Validator for every authenticated API request. signature and expiry check."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = auth_service.decode_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_active_organization(
    x_organization_id: uuid.UUID = Header(..., alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db_session),
    user: CurrentUser = Depends(get_current_user)
) -> uuid.UUID:
    """
    Mandatory tenant resolution.
    Verifies that the user belongs to the requested organization.
    """
    if user.organization_id != x_organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access violation: You do not belong to this organization."
        )
    return x_organization_id

async def require_caregiver(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Wraps get_current_user to restrict access to caregiver or admin roles."""
    if user.role not in ["caregiver", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires caregiver privileges"
        )
    return user

async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Restrict access to organizational administrators or higher."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires organizational administrator privileges"
        )
    return user

async def require_patient_session(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Ensures the caller is a session-device acting on behalf of a patient."""
    if user.role != "patient_session":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires a valid patient session token"
        )
    return user
