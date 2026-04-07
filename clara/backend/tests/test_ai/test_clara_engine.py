# Clara Backend — AI Engine Unit Tests
import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from app.ai.clara_engine import ClaraEngine, EngineResponse
from app.models.patient import Patient
from app.models.organization import Organization

@pytest.fixture
def engine():
    return ClaraEngine()

@pytest.mark.asyncio
async def test_engine_streaming(engine):
    patient_id = uuid.uuid4()
    session_id = uuid.uuid4()
    patient = Patient(id=patient_id, name="Test Patient")
    
    # Mock OllamaClient stream
    async def mock_stream(*args, **kwargs):
        yield "Hello"
        yield " "
        yield "Patient"
        yield "!"
        
    with patch.object(engine.ollama, "chat_stream", side_effect=mock_stream):
        # Mock ContextManager and MoodClassifier
        with patch.object(engine.context_manager, "load_context", return_value=[]):
            with patch.object(engine.context_manager, "add_message", return_value=None):
                with patch.object(engine.mood_classifier, "classify", 
                                  return_value=MagicMock(mood="calm", confidence=0.9)):
                                  
                    responses = []
                    async for chunk in engine.process_message(AsyncMock(), patient, session_id, "hi"):
                        responses.append(chunk)
                    
                    # Verify chunks arrive
                    assert any(c.token == "Hello" for c in responses)
                    assert any(c.is_final is True for c in responses)
                    
                    # Verify final metadata
                    final = responses[-1]
                    assert final.is_final is True
                    assert final.full_response == "Hello Patient!"
                    assert final.mood.mood == "calm"

@pytest.mark.asyncio
async def test_distress_stripping(engine):
    patient_id = uuid.uuid4()
    session_id = uuid.uuid4()
    patient = Patient(id=patient_id, name="Test Patient")
    
    # Mock stream with distress marker
    async def mock_distress_stream(*args, **kwargs):
        yield "I'm concerned. "
        yield engine.prompt_builder.DISTRESS_MARKER
        
    with patch.object(engine.ollama, "chat_stream", side_effect=mock_distress_stream), patch("app.ai.clara_engine.AlertService.create_and_notify", new_callable=AsyncMock):
        with patch.object(engine.context_manager, "load_context", return_value=[]):
            with patch.object(engine.context_manager, "add_message", return_value=None):
                with patch.object(engine.mood_classifier, "classify", 
                                  return_value=MagicMock(mood="distressed", confidence=1.0)):
                                  
                    responses = []
                    async for chunk in engine.process_message(AsyncMock(), patient, session_id, "I'm scared"):
                        responses.append(chunk)
                    
                    final = responses[-1]
                    assert final.is_final is True
                    assert final.distress_detected is True
                    # Marker must be stripped from patient-facing full_response
                    assert engine.prompt_builder.DISTRESS_MARKER not in final.full_response
                    assert "I'm concerned." in final.full_response
