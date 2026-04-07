# Clara Backend — Prompt Builder Unit Tests
import uuid
from app.ai.prompt_builder import PromptBuilder
from app.models.patient import Patient
from app.models.organization import Organization

def test_prompt_injection_success():
    builder = PromptBuilder()
    
    # Create mock patient
    patient = Patient(
        id=uuid.uuid4(),
        name="Henry",
        preferred_name="Hank",
        hometown="Boston",
        occupation_history="Carpenter",
        favourite_topics=["Ships", "Cooking"]
    )
    
    prompt = builder.build_system_prompt(patient)
    
    # Assertions
    assert "Hank" in prompt
    assert "Boston" in prompt
    assert "Carpenter" in prompt
    assert "Ships" in prompt
    assert "You are Clara" in prompt
    assert "Safety Protocol" in prompt
    assert "[DISTRESS_DETECTED]" in prompt

def test_reminiscence_guidelines():
    builder = PromptBuilder()
    patient = Patient(name="Alice", favourite_topics=["Music"])
    prompt = builder.build_system_prompt(patient)
    
    assert "reminiscence therapy" in prompt.lower()
