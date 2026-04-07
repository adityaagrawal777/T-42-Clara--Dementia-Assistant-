# Clara Backend — Mood Classifier Unit Tests
import pytest
from app.ai.mood_classifier import MoodClassifier, MoodResult

@pytest.fixture
def classifier():
    return MoodClassifier()

@pytest.mark.asyncio
async def test_distressed_matching(classifier):
    # DISTRESSED Priority
    res = await classifier.classify("I'm scared and confused")
    assert res.mood == "distressed"
    assert res.matched_pattern == "scared"
    
    res = await classifier.classify("help me please")
    assert res.mood == "distressed"
    assert res.matched_pattern == "help me"

@pytest.mark.asyncio
async def test_confused_matching(classifier):
    res = await classifier.classify("who are you?")
    assert res.mood == "confused"
    
    res = await classifier.classify("what day is it today?")
    assert res.mood == "confused"

@pytest.mark.asyncio
async def test_happy_matching(classifier):
    res = await classifier.classify("What a lovely day!")
    assert res.mood == "happy"
    
    res = await classifier.classify("Thank you for being so kind.")
    assert res.mood == "happy"

@pytest.mark.asyncio
async def test_default_calm(classifier):
    res = await classifier.classify("The weather is nice.")
    assert res.mood == "calm"
    assert res.confidence == 0.5

@pytest.mark.asyncio
async def test_case_insensitivity(classifier):
    res = await classifier.classify("SCARED")
    assert res.mood == "distressed"
