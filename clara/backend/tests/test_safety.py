import pytest
from app.safety.distress_detector import DistressDetector

def test_distress_detector_phrases():
    detector = DistressDetector()
    
    # Critical - medical emergency (can't breathe matches CRITICAL_PATTERNS)
    is_distressed, categories = detector.analyze("I can't breathe, please help")
    assert is_distressed
    assert "medical_emergency" in categories

    # High - acute fear
    is_distressed, categories = detector.analyze("I am scared and lost")
    assert is_distressed
    assert "acute_fear" in categories
    
    # Low/Emotional
    is_distressed, categories = detector.analyze("nobody cares about me anymore")
    assert is_distressed
    assert "emotional_distress" in categories
    
    # No match
    is_distressed, categories = detector.analyze("Hello Clara, how are you?")
    assert not is_distressed
    assert len(categories) == 0
