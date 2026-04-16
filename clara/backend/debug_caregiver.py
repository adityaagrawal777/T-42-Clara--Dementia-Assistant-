"""Debug script to verify caregiver account and password hash."""
import sys
sys.path.insert(0, ".")

from sqlalchemy import create_engine, text, select
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
    # Check if caregiver exists
    caregiver = session.query(Caregiver).filter_by(email="doctor@clara-ai.com").first()
    
    if not caregiver:
        print("❌ Caregiver not found in database!")
        sys.exit(1)
    
    print(f"✅ Caregiver found:")
    print(f"   Email: {caregiver.email}")
    print(f"   Full Name: {caregiver.full_name}")
    print(f"   Hash: {caregiver.hashed_password[:60]}...")
    
    # Test password verification
    test_password = "clara2026"
    is_valid = auth_service.verify_password(test_password, caregiver.hashed_password)
    
    print(f"\n🔐 Password verification for '{test_password}':")
    print(f"   Result: {'✅ VALID' if is_valid else '❌ INVALID'}")
    
    if not is_valid:
        print(f"\n   Hash starts with: {caregiver.hashed_password[:10]}")
        print(f"   Hash length: {len(caregiver.hashed_password)}")
        
        # Try to re-hash and compare
        new_hash = auth_service.hash_password(test_password)
        print(f"\n   Generated new hash: {new_hash[:60]}...")
        verify_new = auth_service.verify_password(test_password, new_hash)
        print(f"   New hash verifies: {verify_new}")
