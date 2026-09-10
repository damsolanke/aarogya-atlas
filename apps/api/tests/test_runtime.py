"""`/api/runtime` and `tool_runs_on` are the source of truth for UI badges."""

from __future__ import annotations

from starlette.testclient import TestClient

from aarogya_api import agent
from aarogya_api.agent import TOOL_IMPLS, runtime_info, tool_runs_on


def test_runtime_without_groq_key_reports_agent_disabled(make_settings):
    make_settings(groq_api_key=None, google_api_key=None)
    info = runtime_info()
    assert info["agent"] == {
        "enabled": False, "backend": "disabled", "model": None, "runs_on": None,
        "max_iterations": 8, "multi_turn": True,
    }
    assert info["critic"]["enabled"] is False
    assert info["capability_extraction"]["runs_on"] == "device"
    assert info["vision"] == {"backend": "ollama", "model": "medgemma:27b", "runs_on": "device"}
    assert info["tracing"] == {"mlflow": False, "experiment": None}


def test_runtime_with_keys_reports_cloud_routing(make_settings):
    make_settings(groq_api_key="k", google_api_key="g", groq_model="openai/gpt-oss-120b")
    info = runtime_info()
    assert info["agent"]["enabled"] and info["agent"]["backend"] == "groq"
    assert info["agent"]["model"] == "openai/gpt-oss-120b"
    assert info["critic"] == {"enabled": True, "model": "openai/gpt-oss-120b", "same_model_as_supervisor": True}
    assert info["capability_extraction"]["runs_on"] == "cloud"
    assert info["vision"]["backend"] == "gemini" and info["vision"]["runs_on"] == "cloud"


def test_runtime_tool_registry_is_derived_not_hardcoded(make_settings):
    make_settings()
    info = runtime_info()
    assert info["tool_count"] == len(TOOL_IMPLS) == len(info["tools"])
    assert [t["name"] for t in info["tools"]] == list(TOOL_IMPLS)
    assert set(info["simulated_endpoints"]) == {"/api/stockout", "/api/counterfactual"}


def test_tool_runs_on_flips_extraction_with_groq_key(make_settings):
    make_settings(groq_api_key=None)
    assert tool_runs_on("extract_capabilities_from_note") == "device"
    make_settings(groq_api_key="k")
    assert tool_runs_on("extract_capabilities_from_note") == "cloud"
    # These never change with the key.
    assert tool_runs_on("semantic_intake_search") == "device"
    assert tool_runs_on("databricks_vector_search") == "cloud"
    assert tool_runs_on("geocode") == "host" and tool_runs_on("trust_score") == "host"


def test_runtime_endpoint(make_settings):
    make_settings(groq_api_key=None)
    from aarogya_api.app import app

    with TestClient(app) as client:
        r = client.get("/api/runtime")
    assert r.status_code == 200
    body = r.json()
    assert body["tool_count"] == len(agent.TOOL_IMPLS)
    assert body["agent"]["backend"] == "disabled"
