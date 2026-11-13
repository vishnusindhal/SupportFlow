from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./supportflow.db"
    jwt_secret_key: str = "local-development-only-change-me"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cookie_secure: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

