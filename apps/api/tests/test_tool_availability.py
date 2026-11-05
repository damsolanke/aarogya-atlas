"""The model is offered only the tools whose backend can answer on this server."""

from __future__ import annotations

import httpx
import pytest
from starlette.testclient import TestClient

from aarogya_api import agent, local_llm, tools
from aarogya_api.agent import TOOL_IMPLS, _execute_tool, offered_tool_names, stream_answer
from aarogya_api.local_llm import ollama_up as real_ollama_up
from aarogya_api.settings import Settings
from tests.fake_groq import FakeGroq, assistant_final, critic_ok

# conftest leaves both backends down for every test.
DOWN = {"semantic_intake_search", "databricks_vector_search"}


async def _up() -> bool:
    return True


async def test_tools_with_missing_backends_are_not_offered():
    assert await offered_tool_names() == set(TOOL_IMPLS) - DOWN


async def test_all_tools_offered_when_backends_answer(monkeypatch):
    monkeypatch.setattr(local_llm, "ollama_up", _up)
    monkeypatch.setattr(tools, "databricks_vs_usable", _up)
    assert await offered_tool_names() == set(TOOL_IMPLS)


async def test_stream_answer_sends_only_offered_tools_and_names_the_rest(make_settings, monkeypatch):
    make_settings(groq_api_key="test-key")
    fake = FakeGroq([assistant_final("## ⭐ Best match\n**Facility 1** (vf-1)"), critic_ok()])
    monkeypatch.setattr(agent, "client", lambda: fake)

    [ev async for ev in stream_answer("ECG near Mysuru")]

    assert {t["function"]["name"] for t in fake.calls[0]["tools"]} == set(TOOL_IMPLS) - DOWN
    system = fake.calls[0]["messages"][0]["content"]
    assert "semantic_intake_search`." not in system  # rule 2 drops its fallback
    assert system.endswith(
        "Not available on this server: semantic_intake_search, databricks_vector_search. Do not call them."
    )


async def test_rule_2_keeps_its_fallback_when_semantic_search_is_offered(make_settings, monkeypatch):
    make_settings(groq_api_key="test-key")
    monkeypatch.setattr(local_llm, "ollama_up", _up)
    fake = FakeGroq([assistant_final("done"), critic_ok()])
    monkeypatch.setattr(agent, "client", lambda: fake)

    [ev async for ev in stream_answer("ECG near Mysuru")]

    system = fake.calls[0]["messages"][0]["content"]
    assert agent.SEMANTIC_FALLBACK in system
    assert system.endswith("Not available on this server: databricks_vector_search. Do not call them.")


async def test_execute_tool_refuses_a_tool_that_was_not_offered(monkeypatch):
    async def must_not_run(**kwargs):
        raise AssertionError("impl ran for a tool that was not offered")

    monkeypatch.setitem(TOOL_IMPLS, "semantic_intake_search", must_not_run)
    out = await _execute_tool("semantic_intake_search", {"query": "dialysis"}, offered={"geocode"})
    assert out["error"] == "tool_unavailable"
    assert out["available_tools"] == ["geocode"]


async def test_unknown_tool_lists_only_the_offered_tools():
    out = await _execute_tool("teleport", {}, offered={"geocode", "facility_search"})
    assert out["error"] == "unknown_tool"
    assert out["available_tools"] == ["facility_search", "geocode"]


def test_runtime_endpoint_marks_tools_not_offered(make_settings):
    make_settings(groq_api_key=None)
    from aarogya_api.app import app

    with TestClient(app) as client:
        body = client.get("/api/runtime").json()
    assert {t["name"] for t in body["tools"] if not t["offered"]} == DOWN
    assert body["tool_count"] == len(TOOL_IMPLS)


async def test_ollama_check_is_cached(monkeypatch):
    calls: list[int] = []

    async def reachable() -> bool:
        calls.append(1)
        return True

    monkeypatch.setattr(local_llm, "_ollama_reachable", reachable)
    monkeypatch.setattr(local_llm, "_ollama_up_cache", None)
    assert await real_ollama_up() is True
    assert await real_ollama_up() is True
    assert len(calls) == 1


# ---------------------------------------------------------------------------
# Databricks Vector Search probe
# ---------------------------------------------------------------------------

@pytest.fixture
def vs(monkeypatch):
    """Vector Search configured, nothing cached, HTTP answered in memory.
    Returns (requests seen, mutable response: status code and JSON body)."""
    s = Settings(_env_file=None, databricks_host="https://dbc.example", databricks_token="t")
    monkeypatch.setattr(tools, "settings", lambda: s)
    monkeypatch.setattr(tools, "_vs_usable_cache", None)
    seen: list[httpx.Request] = []
    reply = {"code": 200, "json": {"status": {"ready": True}}}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(reply["code"], json=reply["json"])

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        tools.httpx, "AsyncClient",
        lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw),
    )
    return seen, reply


async def test_vs_probe_accepts_a_working_token(vs):
    seen, _ = vs
    assert await tools.databricks_vs_usable() is True
    assert seen[0].method == "GET"
    assert seen[0].url.path == "/api/2.0/vector-search/indexes/workspace.aarogya.facilities_idx"
    assert seen[0].headers["authorization"] == "Bearer t"
    assert tools._vs_usable_cache[2] == tools._VS_USABLE_TTL_S


async def test_vs_probe_rejects_a_dead_token_and_remembers(vs):
    seen, reply = vs
    reply["code"] = 403
    assert await tools.databricks_vs_usable() is False
    assert await tools.databricks_vs_usable() is False
    assert len(seen) == 1
    assert tools._vs_usable_cache[2] == tools._VS_USABLE_TTL_S


async def test_vs_probe_rechecks_soon_after_a_transient_failure(vs):
    _, reply = vs
    reply["code"] = 503
    assert await tools.databricks_vs_usable() is False
    assert tools._vs_usable_cache[2] == tools._VS_RETRY_TTL_S


async def test_vs_probe_without_a_status_field_counts_200_as_usable(vs):
    _, reply = vs
    reply["json"] = {"name": "workspace.aarogya.facilities_idx"}
    assert await tools.databricks_vs_usable() is True


async def test_vs_probe_treats_an_index_still_syncing_as_unusable(vs):
    _, reply = vs
    reply["json"] = {"status": {"ready": False, "detailed_state": "PROVISIONING_INITIAL_SNAPSHOT"}}
    assert await tools.databricks_vs_usable() is False
    assert tools._vs_usable_cache[2] == tools._VS_RETRY_TTL_S


async def test_vs_unconfigured_is_unusable_without_a_request(monkeypatch):
    monkeypatch.setattr(tools, "settings", lambda: Settings(_env_file=None))
    monkeypatch.setattr(tools, "_vs_usable_cache", None)
    assert await tools.databricks_vs_usable() is False


async def test_vs_query_refused_for_auth_marks_tool_unusable(vs):
    seen, reply = vs
    reply["code"] = 403
    out = await tools.databricks_vector_search("dialysis Mysuru")
    assert out["error"].startswith("vector-search HTTP 403")
    assert await tools.databricks_vs_usable() is False
    assert len(seen) == 1
