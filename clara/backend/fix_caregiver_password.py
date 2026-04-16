"""Fix the corrupted caregiver password hash."""
import sys
sys.path.insert(0, ".")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.organization import Organization
from app.models.caregiver import Caregiver
from app.models.patient import Patient
from app.services.auth_service import auth_service
from app.config import get_settings

settings = get_settings()

def get_sync_url() -> str:
    url = settings.database_url or ""
    url = url.replace("%%", "%")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url

engine = create_engine(get_sync_url())
Session = sessionmaker(bind=engine)

with Session() as session:
    # Find caregiver
    caregiver = session.query(Caregiver).filter_by(email="doctor@clara-ai.com").first()
    
    if not caregiver:
        print("❌ Caregiver not found!")
        sys.exit(1)
    
    # Generate correct password hash
    password = "clara2026"
    correct_hash = auth_service.hash_password(password)
    
    print(f"🔄 Updating password hash for {caregiver.email}...")
    print(f"   Old hash: {caregiver.hashed_password[:60]}...")
    print(f"   New hash: {correct_hash[:60]}...")
    
    # Update the hash
    caregiver.hashed_password = correct_hash
    session.commit()
    
    # Verify
    is_valid = auth_service.verify_password(password, caregiver.hashed_password)
    print(f"\n✅ Password hash updated and verified: {is_valid}")
    print(f"\n🔓 Caregiver login credentials:")
    print(f"   Email: {caregiver.email}")
    print(f"   Password: {password}")
