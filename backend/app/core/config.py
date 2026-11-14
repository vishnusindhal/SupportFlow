from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./supportflow.db"
    jwt_secret_key: str = "local-development-only-change-me"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cookie_secure: bool = False
    uploads_dir: str = "uploads"
    max_upload_size_bytes: int = 10_000_000
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    gemini_timeout_seconds: float = 20.0

    # Support both `python` from the repository root and `python` from backend.
    # Docker receives these values from docker-compose.yml as environment vars.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
