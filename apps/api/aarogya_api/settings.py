"""Centralised settings — reads .env, falls back to safe defaults for local dev."""

from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres
    database_url: str = Field(
        default="postgresql+asyncpg://postgres@localhost:5432/aarogya"
    )

    # Anthropic (cloud) — agent supervisor + clinical reasoning
    anthropic_api_key: str | None = None
    supervisor_model: str = "claude-opus-4-7"

    # Ollama (local) — PHI-safe inference
    ollama_base_url: str = "http://localhost:11434"
    local_chat_model: str = "qwen2.5:32b-instruct-q4_K_M"
    local_embed_model: str = "bge-m3"
    embed_dim: int = 1024  # bge-m3

    # OpenStreetMap
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    nominatim_url: str = "https://nominatim.openstreetmap.org"
    user_agent: str = "AarogyaAtlas/0.1 (https://github.com/damsolanke/aarogya-atlas)"

    # Default geographic scope for the demo
    default_state: str = "Karnataka"

    # Databricks (Mosaic AI Vector Search + MLflow tracing)
    databricks_host: str | None = None
    databricks_token: str | None = None


@lru_cache
def settings() -> Settings:
    return Settings()
