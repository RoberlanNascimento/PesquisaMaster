"""Configurações globais da aplicação validadas via Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variáveis de ambiente e parâmetros operacionais da API."""

    model_config = SettingsConfigDict(
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "PesquisaMaster API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production", "test"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:123456@localhost:5432/pesquisas"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    jwt_secret_key: str = Field(
        default="dev-only-secret-key-change-in-production-at-least-32-chars",
        min_length=32,
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    hmac_field_secret: str = Field(
        default="dev-only-hmac-field-secret-change-in-production-32-chars",
        min_length=32,
    )

    # Google Cloud Storage (GCS)
    gcs_project_id: str | None = "Pesquisas"
    gcs_bucket_name: str | None = "pesquisas_candidatos"
    gcs_credentials_path: str | None = None
    google_application_credentials: str | None = None
    gcs_signed_url_expiration_minutes: int = 60


@lru_cache
def get_settings() -> Settings:
    """Retorna instância singleton das configurações da aplicação."""
    return Settings()
