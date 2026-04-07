"""
One-time migration: Add hashed_passphrase and caregiver_phone to patients table.
Run: python migrate_add_auth_fields.py
"""
import asyncio
import asyncpg

DB_URL = "postgresql://postgres.bmvdcwqwwsnxtvsjgblc:%40Dityaji_11@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

async def migrate():
    conn = await asyncpg.connect(DB_URL)
    try:
        await conn.execute("""
            ALTER TABLE patients
            ADD COLUMN IF NOT EXISTS hashed_passphrase TEXT,
            ADD COLUMN IF NOT EXISTS caregiver_phone VARCHAR(50);
        """)
        print("✅ Migration complete: hashed_passphrase and caregiver_phone columns added.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
