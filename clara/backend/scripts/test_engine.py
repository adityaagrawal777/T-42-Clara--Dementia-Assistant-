# Clara Backend — AI Engine Verification Script
import asyncio
import uuid
from app.models.patient import Patient
from app.ai.clara_engine import clara_engine
from app.config import get_settings

settings = get_settings()

async def test_clara_engine_live():
    """Manual verification script for streaming response integrity."""
    print(f"🚀 Initializing Clara Engine Test...")
    print(f"📡 Profile: {settings.obs.environment} | Model: {settings.ollama.model}")

    # 1. Create mock patient context
    patient = Patient(
        id=uuid.uuid4(),
        name="Henry",
        preferred_name="Hank",
        hometown="Boston",
        occupation_history="Carpenter",
        favourite_topics=["Ships", "Cooking"]
    )
    
    session_id = uuid.uuid4()
    user_msg = "Hello Clara, I'm feeling a bit lost today. Can you tell me what we're doing?"

    print(f"\n👤 Patient: {user_msg}")
    print(f"🤖 Clara: ", end="", flush=True)

    try:
        # 2. Process message via Engine stream
        async for chunk in clara_engine.process_message(
            session_id=session_id,
            patient_id=patient.id,
            user_message=user_msg,
            patient=patient
        ):
            if not chunk.is_final:
                print(chunk.token, end="", flush=True)
            else:
                print(f"\n\n✨ Stream Finished ✨")
                print(f"📊 Detected Mood: {chunk.mood.mood if chunk.mood else 'unknown'}")
                print(f"⚠️  Distress Detected: {chunk.distress_detected}")
                
    except Exception as e:
        print(f"\n❌ Error during engine processing: {e}")

if __name__ == "__main__":
    asyncio.run(test_clara_engine_live())
