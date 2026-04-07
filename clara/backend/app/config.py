# Clara Backend — Configuration Management
from functools import lru_cache
from typing import List, Literal, Optional
from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Unified application configuration.
    Loads from .env if present. All values have documented defaults.
    No magic numbers may appear in application code — every tuneable
    parameter lives here, so operators can change behaviour via environment
    variables alone without touching source files.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: Optional[str] = Field(None, validation_alias="DATABASE_URL")
    supabase_url: Optional[str] = Field(None, validation_alias="SUPABASE_URL")
    supabase_service_key: Optional[str] = Field(None, validation_alias="SUPABASE_SERVICE_KEY")

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = Field("redis://localhost:6379/0", validation_alias="REDIS_URL")
    redis_password: Optional[str] = Field(None, validation_alias="REDIS_PASSWORD")

    # ── Security ──────────────────────────────────────────────────────────────
    jwt_secret: str = Field("development_secret_only", validation_alias="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", validation_alias="JWT_ALGORITHM")
    jwt_expiry_minutes: int = Field(480, validation_alias="JWT_EXPIRY_MINUTES")

    # ── AI — Model selection ──────────────────────────────────────────────────
    ollama_base_url: str = Field("http://localhost:11434", validation_alias="OLLAMA_BASE_URL")
    ollama_model: str = Field("llama3.1:8b", validation_alias="OLLAMA_MODEL")
    ollama_embedding_model: str = Field("nomic-embed-text", validation_alias="OLLAMA_EMBEDDING_MODEL")

    # ── AI — Generation parameters ────────────────────────────────────────────
    # All Ollama sampling parameters are configurable via env. Defaults are tuned
    # for clinical reliability: lower temperature for consistency, moderate top_k/p
    # for vocabulary breadth, gentle repeat_penalty to avoid robotic loops.
    ollama_temperature: float = Field(0.65, validation_alias="OLLAMA_TEMPERATURE")
    ollama_num_predict: int = Field(400, validation_alias="OLLAMA_NUM_PREDICT")
    ollama_top_k_sampling: int = Field(50, validation_alias="OLLAMA_TOP_K_SAMPLING")
    ollama_top_p: float = Field(0.92, validation_alias="OLLAMA_TOP_P")
    ollama_repeat_penalty: float = Field(1.1, validation_alias="OLLAMA_REPEAT_PENALTY")
    ollama_num_ctx: int = Field(4096, validation_alias="OLLAMA_NUM_CTX")

    # ── AI — Long-term memory (pgvector) ─────────────────────────────────────
    # Controls how many past interaction turns are retrieved per query and the
    # minimum cosine similarity required to surface a memory. Increasing top_k
    # enriches context at the cost of token budget; lowering threshold surfaces
    # more but noisier memories.
    memory_top_k: int = Field(4, validation_alias="MEMORY_TOP_K")
    memory_similarity_threshold: float = Field(0.65, validation_alias="MEMORY_SIMILARITY_THRESHOLD")

    # ── Chat runtime ──────────────────────────────────────────────────────────
    # Timeout (seconds) for loading a patient profile from the DB before the
    # WebSocket connection is rejected. Increase on slow/geographically distant
    # database connections.
    patient_load_timeout: float = Field(5.0, validation_alias="PATIENT_LOAD_TIMEOUT")
    # Default mood_score used when the mood classifier returns no result.
    default_mood_score: float = Field(0.5, validation_alias="DEFAULT_MOOD_SCORE")

    # ── Safety Notifications ──────────────────────────────────────────────────
    firebase_project_id: Optional[str] = Field(None, validation_alias="FIREBASE_PROJECT_ID")
    firebase_server_key: Optional[str] = Field(None, validation_alias="FIREBASE_SERVER_KEY")
    resend_api_key: Optional[str] = Field(None, validation_alias="RESEND_API_KEY")
    alert_email_from: str = Field("alerts@clara-ai.com", validation_alias="ALERT_EMAIL_FROM")
    alert_email_to: str = Field("caregiver@example.com", validation_alias="ALERT_EMAIL_TO")
    frontend_url: str = Field("http://localhost:3000", validation_alias="FRONTEND_URL")

    # ── Observability ─────────────────────────────────────────────────────────
    sentry_dsn_backend: Optional[str] = Field(None, validation_alias="SENTRY_DSN_BACKEND")
    environment: Literal["development", "staging", "production"] = Field(
        "development", validation_alias="ENVIRONMENT"
    )

    # ── App ───────────────────────────────────────────────────────────────────
    allowed_origins: List[str] = ["http://localhost:3000"]

    # ── Property-style access for backwards compatibility ─────────────────────

    @property
    def db(self):
        class DB:
            url = self.database_url.replace("%%", "%") if self.database_url else None
            supabase_url = self.supabase_url
            supabase_service_key = self.supabase_service_key
        return DB()

    @property
    def redis(self):
        class Redis:
            url = self.redis_url
            password = self.redis_password
        return Redis()

    @property
    def auth(self):
        class Auth:
            jwt_secret = self.jwt_secret
            jwt_algorithm = self.jwt_algorithm
            jwt_expiry_minutes = self.jwt_expiry_minutes
        return Auth()

    @property
    def ollama(self):
        class Ollama:
            base_url = self.ollama_base_url
            model = self.ollama_model
            embedding_model = self.ollama_embedding_model
            # Generation parameters
            temperature = self.ollama_temperature
            num_predict = self.ollama_num_predict
            top_k_sampling = self.ollama_top_k_sampling
            top_p = self.ollama_top_p
            repeat_penalty = self.ollama_repeat_penalty
            num_ctx = self.ollama_num_ctx
        return Ollama()

    @property
    def memory(self):
        class Memory:
            top_k = self.memory_top_k
            similarity_threshold = self.memory_similarity_threshold
        return Memory()

    @property
    def chat(self):
        class Chat:
            patient_load_timeout = self.patient_load_timeout
            default_mood_score = self.default_mood_score
        return Chat()

    @property
    def alert(self):
        class Alert:
            fcm_project_id = self.firebase_project_id
            fcm_server_key = self.firebase_server_key
            resend_api_key = self.resend_api_key
            email_from = self.alert_email_from
            email_to = self.alert_email_to
            frontend_url = self.frontend_url
        return Alert()

    @property
    def obs(self):
        class OBS:
            environment = self.environment
            sentry_dsn_backend = self.sentry_dsn_backend
        return OBS()


@lru_cache
def get_settings() -> Settings:
    """Singleton pattern to instantiate Settings once and reuse."""
    return Settings()
