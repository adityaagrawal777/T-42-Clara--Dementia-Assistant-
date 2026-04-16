# Clara Backend — FastAPI Dependency Injection
import uuid
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.services.auth_service import CurrentUser, auth_service
from app.config import get_settings

settings = get_settings()

# Standard Bearer token extraction
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token",
    auto_error=False
)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Validator for every authenticated API request. Verifies signature and expiry."""
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
    user: CurrentUser = Depends(get_current_user),
) -> uuid.UUID:
    """
    Mandatory tenant resolution for header-scoped requests.
    Verifies that the authenticated user belongs to the requested organisation.
    """
    if user.organization_id != x_organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access violation: You do not belong to this organization.",
        )
    return x_organization_id


async def require_caregiver(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Restrict endpoint access to caregiver or admin roles."""
    if user.role not in ["caregiver", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires caregiver privileges",
        )
    return user


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Restrict access to organisational administrators or higher."""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires organisational administrator privileges",
        )
    return user


async def require_patient_session(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Ensures the caller is a session-device acting on behalf of a patient."""
    if user.role != "patient_session":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires a valid patient session token",
        )
    return user
