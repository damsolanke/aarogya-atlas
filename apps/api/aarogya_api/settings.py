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

    # Groq (cloud) — OpenAI-compatible LLM, supervisor reasoning + tool calling.
    # GPT-OSS-120B is OpenAI's open-weight MoE (120B total / 5.1B active),
    # purpose-built for agentic workflows. Groq's official replacement for
    # Llama 4 Maverick + Kimi K2 (both deprecated in favor of this).
    # - 131k context, lowest TTFT on Groq (0.58s)
    # - Reasoning model — extended thinking for multi-step tool orchestration
    # - Reliable OpenAI-style tool_calls (Llama 4 family emits broken `<function=...>` tags)
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
    groq_base_url: str = "https://api.groq.com/openai/v1"

    # Google Gemini — multimodal (vision triage) + embeddings (cloud query path).
    # Free tier: 15 RPM / 1,000 RPD on gemini-2.5-flash-lite.
    google_api_key: str | None = None
    gemini_vision_model: str = "gemini-2.5-flash-lite"
    gemini_embed_model: str = "text-embedding-004"

    # Ollama (local) — PHI-safe enterprise-deployment mode (hospital VPC)
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
