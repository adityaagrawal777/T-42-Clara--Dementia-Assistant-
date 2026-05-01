import asyncio
from app.db.session import async_session_factory
from sqlalchemy import select
from app.models.session import ClaraSession
from app.models.message import Message

async def run():
    async with async_session_factory() as db:
        sessions = (await db.execute(select(ClaraSession).order_by(ClaraSession.started_at.desc()).limit(1))).scalars().all()
        for s in sessions:
            print(f"Session {s.id} (org: {s.organization_id}), message_count: {s.message_count}")
            msgs = (await db.execute(select(Message).where(Message.session_id == s.id))).scalars().all()
            print(f"  -> Found {len(msgs)} messages in DB")
            for m in msgs:
                print(f"    - {m.id} | {m.role} | org: {m.organization_id} | content: {m.content[:20]}")

if __name__ == "__main__":
    asyncio.run(run())
