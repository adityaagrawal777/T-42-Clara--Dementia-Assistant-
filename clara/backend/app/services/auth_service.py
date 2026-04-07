# Clara Backend — JWT Authentication Service
import uuid
import datetime
import bcrypt
from typing import Optional, List, Dict, Any
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from app.config import get_settings

settings = get_settings()

class CurrentUser(BaseModel):
    """Decoded JWT payload data for identity propagation."""
    user_id: uuid.UUID
    organization_id: uuid.UUID
    role: str # caregiver | admin | super_admin | patient_session
    patient_id: Optional[uuid.UUID] = None
    exp: Optional[datetime.datetime] = None
    iat: Optional[datetime.datetime] = None

class AuthService:
    """
    Secure token lifecycle management.
    Handles bcrypt hashing and JWT signing/verification.
    """
    
    SECRET_KEY = settings.auth.jwt_secret
    ALGORITHM = settings.auth.jwt_algorithm
    ACCESS_TOKEN_EXPIRE_MINUTES = settings.auth.jwt_expiry_minutes

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Standard Bcrypt verification using the raw bcrypt library."""
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False

    def get_password_hash(self, password: str) -> str:
        """Standard Bcrypt hashing using the raw bcrypt library."""
        # bcrypt.hashpw returns bytes, we decode to str for DB storage
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def hash_password(self, password: str) -> str:
        """Alias for get_password_hash — used by bootstrap and admin tools."""
        return self.get_password_hash(password)


    def create_access_token(
        self, 
        user_id: uuid.UUID, 
        organization_id: uuid.UUID,
        role: str, 
        patient_id: Optional[uuid.UUID] = None,
        expires_delta: Optional[datetime.timedelta] = None
    ) -> str:
        """Generate a signed JWT for API access."""
        to_encode = {
            "sub": str(user_id),
            "org_id": str(organization_id),
            "role": role,
            "patient_id": str(patient_id) if patient_id else None,
            "iat": datetime.datetime.utcnow()
        }
        
        if expires_delta:
            expire = datetime.datetime.utcnow() + expires_delta
        else:
            expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
        return encoded_jwt

    def decode_token(self, token: str) -> Optional[CurrentUser]:
        """Validate signature and return decoded payload objects."""
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            user_id: str = payload.get("sub")
            org_id: str = payload.get("org_id")
            role: str = payload.get("role")
            
            if user_id is None or role is None or org_id is None:
                return None
                
            return CurrentUser(
                user_id=uuid.UUID(user_id),
                organization_id=uuid.UUID(org_id),
                role=role,
                patient_id=uuid.UUID(payload.get("patient_id")) if payload.get("patient_id") else None,
                exp=datetime.datetime.fromtimestamp(payload.get("exp")),
                iat=datetime.datetime.fromtimestamp(payload.get("iat"))
            )
        except (JWTError, ValueError, AttributeError):
            return None

# Singleton authentication service
auth_service = AuthService()
