"""
Application configuration loaded from environment variables.

Uses pydantic-settings BaseSettings for validated, type-safe config
with automatic .env file loading.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file and environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GEMINI_RPM_LIMIT: int = 15
    GEMINI_RPD_LIMIT: int = 1500
    BRAVE_SEARCH_API_KEY: str = ""
    DATABASE_URL: str = "debate_arena.db"
    CORS_ORIGINS: str = "http://localhost:5173"
    RATE_LIMIT_PER_MINUTE: int = 30
    ENVIRONMENT: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()
