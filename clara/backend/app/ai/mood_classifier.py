# Clara Backend — AI Mood Classification
import json
from dataclasses import dataclass
from typing import List, Literal, Optional
from app.ai.ollama_client import ollama_client
from app.config import get_settings

settings = get_settings()

class MoodSignals:
    """Keyword patterns for rule-based mood detection."""
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
    Prioritizes distress signals over neutral or positive tones.
    """
    
    def __init__(self):
        self.signals = MoodSignals()

    async def classify(self, content: str) -> MoodResult:
        """EntryPoint: Run either pattern or async LLM classification."""
        strategy = settings.obs.environment if settings.obs.environment == "production" else "StrategyA"
        
        if strategy == "production":
            return await self._classify_ollama(content)
        return self._classify_patterns(content)

    def _classify_patterns(self, content: str) -> MoodResult:
        """Strategy A: Zero-latency substring pattern matching."""
        content_low = content.lower()
        
        # Priority order: DISTRESSED > CONFUSED > HAPPY > CALM
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
            f"Analyze the mood of the following message from a dementia patient. "
            f"Respond with ONLY one word from this list: [distressed, confused, happy, calm]. "
            f"No explanations.\n\nMessage: \"{content}\""
        )
        
        try:
            full_response = ""
            async for chunk in ollama_client.chat_stream(
                [{"role": "user", "content": prompt}], 
                model=settings.ollama.model
            ):
                full_response += chunk
            
            clean_resp = full_response.strip().lower()
            if clean_resp in ["distressed", "confused", "happy", "calm"]:
                return MoodResult(clean_resp, 0.9) # type: ignore
                
            raise ValueError("Invalid Ollama classification result.")
            
        except Exception:
            # Fallback to Strategy A on error
            return self._classify_patterns(content)
