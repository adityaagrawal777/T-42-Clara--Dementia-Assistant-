import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = "postgresql+asyncpg://postgres.bmvdcwqwwsnxtvsjgblc:%40Dityaji_11@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
engine = create_async_engine(url, echo=False, pool_timeout=15, connect_args={"server_settings": {"jit": "off"}})

async def test():
    async with engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT id, name, preferred_name, hashed_passphrase IS NOT NULL as has_pass FROM patients ORDER BY created_at DESC LIMIT 15"
        ))
        rows = result.fetchall()
        print("Recent patients:")
        for r in rows:
            print(f"  name={r[1]!r}  preferred={r[2]!r}  has_pass={r[3]}")
    await engine.dispose()

asyncio.run(test())
