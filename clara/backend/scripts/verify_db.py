import asyncio
from sqlalchemy import create_engine, inspect
from app.config import get_settings

def verify():
    settings = get_settings()
    url = settings.database_url.replace("%%", "%")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    
    engine = create_engine(url)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables in DB: {tables}")
    
    if "organizations" in tables:
        print("✅ SUCCESS: Organizations table exists.")
    else:
        print("❌ FAILED: Organizations table missing.")

if __name__ == "__main__":
    verify()
