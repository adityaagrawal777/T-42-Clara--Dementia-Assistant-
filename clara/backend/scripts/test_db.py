import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import get_settings

async def test_conn():
    settings = get_settings()
    url = settings.database_url.replace("%%", "%")
    print(f"Testing connection to: {url.split('@')[-1]}")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute("SELECT version();")
            print(f"✅ SUCCESS: {result.scalar()}")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_conn())
