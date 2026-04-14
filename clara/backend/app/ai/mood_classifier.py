# Clara Backend — AI Mood Classification
import structlog
from dataclasses import dataclass
from typing import List, Literal, Optional
from app.ai.ollama_client import ollama_client
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

class MoodSignals:
    """Keyword patterns for rule-based mood detection (Strategy A)."""
    DISTRESSED: List[str] = [
        "scared", "frightened", "help me", "where am i",
        "i don't know where", "i want to go home",
        "i'm lost", "pain", "it hurts", "something is wrong",
        "i can't remember", "i'm confused",
    ]
    CONFUSED: List[str] = [
        "what day is it", "where are we", "who are you",
        "i don't understand", "what's happening",
        "i forget", "i can't think",
    ]
    HAPPY: List[str] = [
        "wonderful", "lovely", "i remember", "that reminds me",
        "happy", "glad", "thank you", "you're so kind",
        "i love", "beautiful",
    ]

@dataclass
class MoodResult:
    mood: Literal["distressed", "confused", "happy", "calm"]
    confidence: float
    matched_pattern: Optional[str] = None

class MoodClassifier:
    """
    Emotion detection for proactive patient safety.
    Optimizes for speed by using patterns first and then an async LLM check.
    """
    
    def __init__(self):
        self.signals = MoodSignals()

    async def classify(self, content: str) -> MoodResult:
        """EntryPoint: Use patterns for speed, fallback to LLM for accuracy if needed."""
        # Always check patterns first as it's free (0ms)
        pattern_result = self._classify_patterns(content)
        if pattern_result.mood != "calm":
            return pattern_result
            
        # In non-production, avoid extra LLM calls to save costs/time
        if settings.obs.environment != "production":
            return pattern_result

        # High-accuracy LLM check
        try:
            return await self._classify_ollama(content)
        except Exception as e:
            logger.warning("mood_classification_llm_failed", error=str(e))
            return pattern_result

    def _classify_patterns(self, content: str) -> MoodResult:
        """Strategy A: Substring pattern matching (O(1) latency)."""
        content_low = content.lower()
        
        for pattern in self.signals.DISTRESSED:
            if pattern in content_low:
                return MoodResult("distressed", 1.0, pattern)
        
        for pattern in self.signals.CONFUSED:
            if pattern in content_low:
                return MoodResult("confused", 1.0, pattern)
        
        for pattern in self.signals.HAPPY:
            if pattern in content_low:
                return MoodResult("happy", 1.0, pattern)
                
        return MoodResult("calm", 0.5, None)

    async def _classify_ollama(self, content: str) -> MoodResult:
        """Strategy B: High-accuracy async LLM-based classification."""
        prompt = (
            f"Classify the following message from a dementia patient. "
            f"Respond with ONLY one word: [distressed, confused, happy, calm].\n\n"
            f"Message: \"{content}\""
        )
        
        clean_resp = await ollama_client.chat(
            [{"role": "user", "content": prompt}], 
            model=settings.ollama.model
        )
        
        clean_resp = clean_resp.strip().lower()
        # Accept only valid labels
        for label in ["distressed", "confused", "happy", "calm"]:
            if label in clean_resp:
                return MoodResult(label, 0.9) # type: ignore
                
        return MoodResult("calm", 0.5)
