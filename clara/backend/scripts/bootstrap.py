"""
Clara Bootstrap Script — Seeds the database with initial org, admin, and demo patient.
Run from: d:\\ClaraCompanion\\clara\\backend
Command:  python -m scripts.bootstrap
"""
import sys, uuid, json
sys.path.insert(0, ".")


from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.organization import Organization
from app.models.caregiver import Caregiver
from app.models.patient import Patient
from app.services.auth_service import auth_service
from app.config import get_settings

settings = get_settings()

DEMO_PASSWORD = "clara2026"


def get_sync_url() -> str:
    url = settings.database_url or ""
    url = url.replace("%%", "%")
    # Swap asyncpg driver back to psycopg2 for sync operations
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


def bootstrap():
    """Seed the initial organization, admin caregiver, and demo patient."""
    engine = create_engine(
        get_sync_url(),
        connect_args={"options": "-c statement_timeout=15000"},
    )
    Session = sessionmaker(bind=engine, expire_on_commit=False)


    with Session() as session:
        # ── 1. Organization ──────────────────────────────────────────────────
        org = session.query(Organization).filter_by(slug="clara-main").first()
        if not org:
            org = Organization(
                name="Clara Memory Care",
                slug="clara-main",
                admin_email="admin@clara-ai.com",
                assistant_name="Clara",
            )
            session.add(org)
            session.flush()
            print(f"✅ Created org: {org.name}")
        else:
            print(f"   Org exists: {org.slug}")

        # ── 2. Admin Caregiver ───────────────────────────────────────────────
        admin = session.query(Caregiver).filter_by(email="doctor@clara-ai.com").first()
        if not admin:
            hashed_pw = auth_service.hash_password(DEMO_PASSWORD)
            admin = Caregiver(
                organization_id=org.id,
                email="doctor@clara-ai.com",
                hashed_password=hashed_pw,
                full_name="Dr. Elena Rossi",
                associated_patient_ids=[],
            )
            session.add(admin)
            session.flush()
            print(f"✅ Created admin: {admin.email} / password: {DEMO_PASSWORD}")
        else:
            # Ensure the password hash is valid (old bootstrap used a dummy hash)
            if not admin.hashed_password.startswith("$2b$"):
                admin.hashed_password = auth_service.hash_password(DEMO_PASSWORD)
                print(f"   Fixed admin password hash for: {admin.email}")
            else:
                print(f"   Admin exists: {admin.email}")

        # ── 3. Demo Patient ──────────────────────────────────────────────────
        patient = session.query(Patient).filter_by(name="Alice Thompson").first()
        if not patient:
            patient = Patient(
                organization_id=org.id,
                name="Alice Thompson",
                preferred_name="Alice",
                hometown="Silver Spring, Maryland",
                occupation_history="Piano teacher for 30 years at Westbrook Academy",
                favourite_topics=["Classical Music", "Baking", "Gardening", "Her grandchildren"],
                life_memories=[
                    {"year": "1985", "event": "Won the regional piano competition"},
                    {"year": "1990", "event": "Married Robert Thompson"},
                    {"year": "1995", "event": "Daughter Emma was born"},
                ],
                family_names={"spouse": "Robert", "daughter": "Emma", "grandchildren": ["Lily", "Jack"]},
                language="en",
                is_active=True,
            )
            session.add(patient)
            session.flush()
            print(f"✅ Created patient: {patient.name} (id: {patient.id})")
        else:
            print(f"   Patient exists: {patient.name} (id: {patient.id})")

        # ── 4. Associate Alice with admin ────────────────────────────────────
        # Read scalar IDs *inside* the live session before any detachment
        admin_id = str(admin.id)
        patient_id_str = str(patient.id)
        current_ids = list(admin.associated_patient_ids or [])

        if patient_id_str not in current_ids:
            current_ids.append(patient_id_str)
            session.execute(
                text("UPDATE caregivers SET associated_patient_ids = :ids WHERE id = :cid"),
                {"ids": json.dumps(current_ids), "cid": admin_id}
            )
            print(f"   Linked {patient.name} to doctor@clara-ai.com")

        session.commit()



    print()
    print("═" * 50)
    print("  🚀  CLARA BOOTSTRAP COMPLETE")
    print("═" * 50)
    print(f"  Org:       {org.name}  ({org.slug})")
    print(f"  Admin:     {admin.email}")
    print(f"  Password:  {DEMO_PASSWORD}")
    print(f"  Patient:   {patient.name}  (id: {patient.id})")
    print("═" * 50)
    print()


if __name__ == "__main__":
    bootstrap()
