"""Shared test fixtures.

Every test in this suite is hermetic: no network, no Postgres, no Ollama,
no Groq, no Databricks. The fixtures here strip the environment so a
developer's local `.env` / shell exports cannot leak into a test run.
"""

from __future__ import annotations

import pytest

from aarogya_api.settings import Settings, settings

ENV_KEYS = (
    "GROQ_API_KEY",
    "GOOGLE_API_KEY",
    "DATABRICKS_HOST",
    "DATABRICKS_TOKEN",
    "OLLAMA_BASE_URL",
    "DATABASE_URL",
)


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    from aarogya_api import observability

    for k in ENV_KEYS:
        monkeypatch.delenv(k, raising=False)
    # MLflow's lazy init would call load_dotenv() and could pick up a local
    # .env with Databricks credentials. Mark it as already attempted + off.
    monkeypatch.setattr(observability, "_INIT_ATTEMPTED", True)
    monkeypatch.setattr(observability, "_MLFLOW_READY", False)
    settings.cache_clear()
    yield
    settings.cache_clear()


@pytest.fixture
def make_settings(monkeypatch):
    """Return a factory that installs a `Settings` instance into the modules
    that read it (`agent`, `local_llm`, `app`) without touching `.env`."""

    def _install(**overrides) -> Settings:
        s = Settings(_env_file=None, **overrides)
        from aarogya_api import agent, local_llm

        monkeypatch.setattr(agent, "settings", lambda: s)
        monkeypatch.setattr(local_llm, "settings", lambda: s)
        return s

    return _install
