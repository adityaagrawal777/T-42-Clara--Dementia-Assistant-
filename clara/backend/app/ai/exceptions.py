# Clara Backend — AI Exceptions
from typing import Dict, Any, Optional

class ClaraAIError(Exception):
    """Base exception for all AI-related failures."""
    def __init__(self, message: str, user_safe_message: str, log_context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.user_safe_message = user_safe_message
        self.log_context = log_context or {}

class OllamaUnavailableError(ClaraAIError):
    """Ollama service is unreachable or not responding."""
    def __init__(self, message: str, log_context: Optional[Dict[str, Any]] = None):
        super().__init__(
            message, 
            "The AI engine is temporarily unavailable. Clara is attempting to reconnect.",
            log_context
        )

class OllamaTimeoutError(ClaraAIError):
    """Ollama request timed out."""
    def __init__(self, message: str, log_context: Optional[Dict[str, Any]] = None):
        super().__init__(
            message,
            "The AI engine is taking longer than usual to respond.",
            log_context
        )

class OllamaModelNotFoundError(ClaraAIError):
    """Requested LLM model is not available or not pulled."""
    def __init__(self, model_name: str, log_context: Optional[Dict[str, Any]] = None):
        super().__init__(
            f"Model '{model_name}' not found in Ollama.",
            "The requested AI model is missing. Please contact support.",
            log_context
        )

class ContextWindowError(ClaraAIError):
    """Failure in conversation history management or summarization."""
    def __init__(self, session_id: str, log_context: Optional[Dict[str, Any]] = None):
        super().__init__(
            f"Failed to manage context for session {session_id}.",
            "An error occurred while retrieving conversation history.",
            log_context
        )

class ClassificationError(ClaraAIError):
    """Mood analysis failure."""
    def __init__(self, message: str, log_context: Optional[Dict[str, Any]] = None):
        super().__init__(
            message,
            "Failed to analyze the emotional state of the message.",
            log_context
        )
