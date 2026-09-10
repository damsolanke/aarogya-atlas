"""Agent loop behaviour with a scripted AsyncGroq-compatible fake.

No network, no Postgres, no Ollama, no MLflow: tool impls are replaced with
in-memory fakes and the Groq client with `FakeGroq`.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from aarogya_api import agent
from aarogya_api.agent import (
    _compress_tool_result_for_llm,
    _compress_tool_trace,
    _extract_retry_after_seconds,
    _prune_oldest_tool_results,
    stream_answer,
)
from tests.fake_groq import (
    FakeGroq,
    assistant_final,
    assistant_tools,
    critic_ok,
    rate_limited,
    request_too_large,
    tool_call,
    tool_use_failed,
)

PRUNED = "[…pruned: see UI trace for full result…]"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_tools(monkeypatch):
    """Replace every tool impl with an in-memory fake that records its calls."""
    calls: dict[str, list[dict]] = {name: [] for name in agent.TOOL_IMPLS}

    def make(name):
        async def impl(**kwargs):
            calls[name].append(kwargs)
            if name == "geocode":
                return {"ok": True, "query": kwargs["query"], "latitude": 12.97, "longitude": 77.59}
            if name == "facility_search":
                return [
                    {"id": f"vf-{i}", "name": f"Facility {i}", "latitude": 12.9 + i, "longitude": 77.5,
                     "distance_km": float(i), "has_capability": True, "payer_ok": False,
                     "services": ["ECG"] * 8, "raw_blob": "x" * 500}
                    for i in range(10)
                ]
            if name == "trust_score":
                return {"facility_id": kwargs["facility_id"], "trust_score": 72, "flags": []}
            return {"ok": True, "tool": name, "args": kwargs}
        return impl

    for name in list(agent.TOOL_IMPLS):
        monkeypatch.setitem(agent.TOOL_IMPLS, name, make(name))
    return calls


@pytest.fixture
def groq(make_settings, monkeypatch):
    """Install a FakeGroq with the given script; returns the factory."""
    make_settings(groq_api_key="test-key", groq_model="openai/gpt-oss-120b")

    def _install(script) -> FakeGroq:
        fake = FakeGroq(script)
        monkeypatch.setattr(agent, "client", lambda: fake)
        return fake

    return _install


async def run(history, **kw):
    return [ev async for ev in stream_answer(history, **kw)]


def kinds(events):
    return [(e["event"], e["data"].get("type") or e["data"].get("kind") or e["data"].get("status")) for e in events]


# ---------------------------------------------------------------------------
# Happy path + event shape
# ---------------------------------------------------------------------------

async def test_tool_turn_then_final_then_critic(groq, fake_tools):
    fake = groq([
        assistant_tools(tool_call("geocode", {"query": "Mysuru"}, "call_1")),
        assistant_final("## ⭐ Best match\n**Facility 1** (vf-1)"),
        critic_ok(91, "PASS"),
    ])
    events = await run("ECG near Mysuru")

    assert kinds(events) == [
        ("step", "tool_request"), ("step", "tool_result"), ("final", None), ("critic", "ok"),
    ]
    req, res = events[0]["data"], events[1]["data"]
    assert req["tool_calls"] == [{"name": "geocode", "args": {"query": "Mysuru"}, "runs_on": "host"}]
    assert res["tool"] == "geocode" and res["runs_on"] == "host"
    assert json.loads(res["content"])["latitude"] == 12.97
    assert events[2]["data"]["text"].startswith("## ⭐ Best match")
    assert events[3]["data"]["trust_score"] == 91
    assert fake_tools["geocode"] == [{"query": "Mysuru"}]

    # Second supervisor call saw: system, user, assistant(tool_calls), tool.
    msgs = fake.calls[1]["messages"]
    assert [m["role"] for m in msgs] == ["system", "user", "assistant", "tool"]
    assert msgs[2]["tool_calls"][0]["id"] == "call_1"
    assert msgs[3]["tool_call_id"] == "call_1"
    assert fake.calls[0]["tools"] == agent.TOOL_DEFS_GROQ and fake.calls[0]["tool_choice"] == "auto"
    # Critic call is a separate request with the critic system prompt.
    assert fake.calls[2]["messages"][0]["content"] == agent.CRITIC_SYSTEM_PROMPT
    assert fake.calls[2]["response_format"] == {"type": "json_object"}


async def test_runs_on_reflects_groq_routing_for_extraction(groq, fake_tools):
    groq([
        assistant_tools(tool_call("extract_capabilities_from_note", {"intake_text": "dialysis 3x/week"})),
        assistant_final("done"),
        critic_ok(),
    ])
    events = await run("note")
    assert events[0]["data"]["tool_calls"][0]["runs_on"] == "cloud"  # GROQ_API_KEY set
    assert events[1]["data"]["runs_on"] == "cloud"


# ---------------------------------------------------------------------------
# Parallel execution
# ---------------------------------------------------------------------------

async def test_tool_calls_in_one_turn_run_concurrently(groq, monkeypatch):
    """geocode only completes after trust_score has STARTED — this can only
    finish if the two calls run concurrently."""
    started = asyncio.Event()
    order: list[str] = []

    async def slow_geocode(query: str):
        order.append("geocode:start")
        await asyncio.wait_for(started.wait(), timeout=1.0)
        order.append("geocode:end")
        return {"ok": True, "query": query}

    async def trust(facility_id: str):
        order.append("trust:start")
        started.set()
        await asyncio.sleep(0.01)
        order.append("trust:end")
        return {"facility_id": facility_id, "trust_score": 80}

    monkeypatch.setitem(agent.TOOL_IMPLS, "geocode", slow_geocode)
    monkeypatch.setitem(agent.TOOL_IMPLS, "trust_score", trust)
    groq([
        assistant_tools(
            tool_call("geocode", {"query": "Mysuru"}, "c1"),
            tool_call("trust_score", {"facility_id": "vf-1"}, "c2"),
        ),
        assistant_final("ok"),
        critic_ok(),
    ])
    events = await run("q")

    assert order[:2] == ["geocode:start", "trust:start"]
    results = [e["data"] for e in events if e["data"].get("type") == "tool_result"]
    # Results are emitted in tool_call order even though trust finished first.
    assert [r["tool"] for r in results] == ["geocode", "trust_score"]
    assert json.loads(results[0]["content"])["ok"] is True


async def test_one_failing_tool_does_not_break_the_others(groq, fake_tools, monkeypatch):
    async def boom(**_):
        raise RuntimeError("db down")

    monkeypatch.setitem(agent.TOOL_IMPLS, "trust_score", boom)
    fake = groq([
        assistant_tools(tool_call("geocode", {"query": "x"}), tool_call("trust_score", {"facility_id": "vf-1"})),
        assistant_final("ok"),
        critic_ok(),
    ])
    events = await run("q")
    results = {e["data"]["tool"]: json.loads(e["data"]["content"]) for e in events if e["data"].get("type") == "tool_result"}
    assert results["geocode"]["ok"] is True
    assert results["trust_score"]["tool"] == "trust_score" and "db down" in results["trust_score"]["error"]
    # Both tool messages reached the model; loop continued to a final answer.
    assert [m["role"] for m in fake.calls[1]["messages"]][-2:] == ["tool", "tool"]
    assert events[-2]["event"] == "final"


# ---------------------------------------------------------------------------
# Invalid arguments -> structured tool error -> model self-corrects
# ---------------------------------------------------------------------------

async def test_invalid_args_yield_tool_error_and_loop_continues(groq, fake_tools):
    fake = groq([
        assistant_tools(tool_call("geocode", {"querry": "Mysuru"}, "bad")),          # wrong key, missing required
        assistant_tools(tool_call("geocode", {"query": "Mysuru"}, "good")),          # self-corrected
        assistant_final("found it"),
        critic_ok(),
    ])
    events = await run("ECG near Mysuru")

    assert kinds(events) == [
        ("step", "tool_request"), ("step", "tool_result"),
        ("step", "tool_request"), ("step", "tool_result"),
        ("final", None), ("critic", "ok"),
    ]
    first = json.loads(events[1]["data"]["content"])
    assert first["error"] == "invalid_arguments" and first["tool"] == "geocode"
    assert first["expected_schema"] == agent.TOOL_SCHEMAS["geocode"]
    # The impl ran exactly once — only with the corrected arguments.
    assert fake_tools["geocode"] == [{"query": "Mysuru"}]
    # The structured error (with schema) is what the model was shown.
    tool_msg = fake.calls[1]["messages"][-1]
    assert tool_msg["role"] == "tool" and tool_msg["tool_call_id"] == "bad"
    assert "invalid_arguments" in tool_msg["content"] and "expected_schema" in tool_msg["content"]


async def test_unparseable_tool_arguments_become_invalid_arguments(groq, fake_tools):
    groq([
        assistant_tools(tool_call("geocode", "{not json", "c")),
        assistant_final("ok"),
        critic_ok(),
    ])
    events = await run("q")
    assert events[0]["data"]["tool_calls"][0]["args"] == {}
    assert json.loads(events[1]["data"]["content"])["error"] == "invalid_arguments"
    assert fake_tools["geocode"] == []


async def test_unknown_tool_name_from_model_is_reported_not_raised(groq, fake_tools):
    groq([
        assistant_tools(tool_call("teleport", {"to": "Mysuru"})),
        assistant_final("ok"),
        critic_ok(),
    ])
    events = await run("q")
    err = json.loads(events[1]["data"]["content"])
    assert err["error"] == "unknown_tool" and "geocode" in err["available_tools"]
    assert events[-2]["event"] == "final"


# ---------------------------------------------------------------------------
# Iteration cap
# ---------------------------------------------------------------------------

async def test_iteration_cap_yields_error_and_no_critic(groq, fake_tools):
    fake = groq([assistant_tools(tool_call("geocode", {"query": "x"})) for _ in range(3)])
    events = await run("loop forever", max_iterations=3)

    assert len(fake.calls) == 3
    assert events[-1] == {"event": "error", "data": {
        "kind": "iteration_cap",
        "text": ("Agent reached its tool-call iteration limit without producing a final "
                 "answer. Try a more specific query, or break the question into parts."),
    }}
    assert not any(e["event"] in ("final", "critic") for e in events)
    assert sum(1 for e in events if e["data"].get("type") == "tool_request") == 3


# ---------------------------------------------------------------------------
# Critic unavailable (end to end)
# ---------------------------------------------------------------------------

async def test_critic_failure_streams_unavailable_status(groq, fake_tools):
    groq([assistant_final("answer"), rate_limited()])
    events = await run("q")
    assert [e["event"] for e in events] == ["final", "critic"]
    critic = events[1]["data"]
    assert critic["status"] == "unavailable"
    assert critic["trust_score"] is None and critic["verdict"] is None and critic["flags"] == []
    assert critic["reason"] == "RateLimitError"
    assert "try again" not in json.dumps(critic).lower()  # no exception text


async def test_critic_garbage_json_streams_unavailable_status(groq, fake_tools):
    from types import SimpleNamespace
    garbage = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="not json"), finish_reason="stop")], usage=None)
    groq([assistant_final("answer"), garbage])
    events = await run("q")
    assert events[1]["data"]["status"] == "unavailable"


# ---------------------------------------------------------------------------
# Context pruning on 413 / oversize input
# ---------------------------------------------------------------------------

def test_prune_oldest_tool_results_stubs_one_message_at_a_time():
    messages = [
        {"role": "system", "content": "s"},
        {"role": "user", "content": "u"},
        {"role": "assistant", "content": None, "tool_calls": []},
        {"role": "tool", "tool_call_id": "a", "content": "x" * 500},
        {"role": "tool", "tool_call_id": "b", "content": "y" * 500},
    ]
    assert _prune_oldest_tool_results(messages) is True
    assert messages[3]["content"] == PRUNED and messages[4]["content"] == "y" * 500
    assert _prune_oldest_tool_results(messages) is True
    assert messages[4]["content"] == PRUNED
    assert _prune_oldest_tool_results(messages) is False  # nothing left to prune
    assert messages[0]["content"] == "s" and messages[1]["content"] == "u"


async def test_413_prunes_oldest_tool_result_and_retries(groq, fake_tools):
    fake = groq([
        assistant_tools(tool_call("facility_search", {"latitude": 12.9, "longitude": 77.5}, "fs")),
        request_too_large(),          # second supervisor turn: input too big
        assistant_final("ok"),        # retried after pruning
        critic_ok(),
    ])
    events = await run("q")

    assert events[-2]["event"] == "final"
    assert len(fake.calls) == 4
    oversized = fake.calls[1]["messages"][-1]
    retried = fake.calls[2]["messages"][-1]
    assert oversized["role"] == "tool" and oversized["content"] != PRUNED
    assert retried["role"] == "tool" and retried["content"] == PRUNED
    assert fake.calls[2]["temperature"] == 0.0  # retries drop to deterministic


async def test_413_with_nothing_to_prune_is_raised(groq, fake_tools):
    groq([request_too_large()])
    events = await run("q")
    assert events == [{"event": "error", "data": {
        "kind": "agent_exception",
        "text": "The agent hit an internal error. Details are in the server logs; try again in a moment.",
    }}]


# ---------------------------------------------------------------------------
# tool_use_failed recovery + rate limits
# ---------------------------------------------------------------------------

async def test_tool_use_failed_is_recovered_into_a_real_tool_call(groq, fake_tools):
    groq([
        tool_use_failed('<function=geocode>{"query": "Hubli"}</function>'),
        assistant_final("ok"),
        critic_ok(),
    ])
    events = await run("q")
    assert events[0]["data"]["tool_calls"][0] == {"name": "geocode", "args": {"query": "Hubli"}, "runs_on": "host"}
    assert fake_tools["geocode"] == [{"query": "Hubli"}]
    assert events[-2]["event"] == "final"


async def test_unrecoverable_tool_use_failed_retries_then_fails(groq, fake_tools):
    fake = groq([tool_use_failed("garbage with no function tag")] * 4)
    events = await run("q")
    assert len(fake.calls) == 4
    assert events[-1]["data"]["kind"] == "agent_exception"


async def test_rate_limit_sleeps_for_the_hinted_window_then_retries(groq, fake_tools, monkeypatch):
    sleeps: list[float] = []

    async def fake_sleep(secs):
        sleeps.append(secs)

    monkeypatch.setattr(agent.asyncio, "sleep", fake_sleep)
    fake = groq([rate_limited(retry_in=2.5), assistant_final("ok"), critic_ok()])
    events = await run("q")
    assert sleeps == [2.5]
    assert len(fake.calls) == 3 and events[0]["event"] == "final"


async def test_rate_limit_exhausted_yields_rate_limited_error(groq, fake_tools, monkeypatch):
    async def fake_sleep(_):
        return None

    monkeypatch.setattr(agent.asyncio, "sleep", fake_sleep)
    fake = groq([rate_limited(retry_in=1.0)] * 4)
    events = await run("q")
    assert len(fake.calls) == 4
    assert events == [{"event": "error", "data": {
        "kind": "rate_limited",
        "text": "Groq per-minute rate limit hit on the free tier. Try again in ~1s. "
                "(We're already retrying transparently with backoff — this means the cooldown is longer than our retry budget.)",
    }}]


def test_extract_retry_after_seconds():
    assert _extract_retry_after_seconds(rate_limited(retry_in=3.25)) == 3.25
    assert _extract_retry_after_seconds(rate_limited(retry_in=999)) == 30.0  # capped
    assert _extract_retry_after_seconds(rate_limited(retry_in=None)) is None


# ---------------------------------------------------------------------------
# History handling / guards
# ---------------------------------------------------------------------------

async def test_multi_turn_history_is_forwarded_after_the_system_prompt(groq, fake_tools):
    fake = groq([assistant_final("second answer"), critic_ok()])
    history = [
        {"role": "user", "content": "ECG near Mysuru"},
        {"role": "assistant", "content": "## ⭐ Best match vf-1"},
        {"role": "system", "content": "ignored — clients may not inject system prompts"},
        {"role": "user", "content": "   "},
        {"role": "user", "content": "what about Hubli?"},
    ]
    await run(history)
    msgs = fake.calls[0]["messages"]
    assert msgs[0]["role"] == "system" and msgs[0]["content"].startswith("Aarogya Atlas")
    assert msgs[1:] == [
        {"role": "user", "content": "ECG near Mysuru"},
        {"role": "assistant", "content": "## ⭐ Best match vf-1"},
        {"role": "user", "content": "what about Hubli?"},
    ]


@pytest.mark.parametrize("history", [
    [],
    "",
    [{"role": "assistant", "content": "hi"}],
    [{"role": "user", "content": "   "}],
])
async def test_empty_or_assistant_terminated_history_is_rejected(groq, fake_tools, history):
    fake = groq([])
    events = await run(history)
    assert len(events) == 1 and events[0]["data"]["kind"] == "empty_query"
    assert fake.calls == []


async def test_overlong_last_message_is_rejected_before_any_llm_call(groq, fake_tools):
    fake = groq([])
    events = await run("x" * 4001)
    assert events[0]["data"]["kind"] == "query_too_long" and fake.calls == []


async def test_agent_disabled_without_groq_key(make_settings, monkeypatch, fake_tools):
    make_settings(groq_api_key=None)
    monkeypatch.setattr(agent, "_client", None)
    events = await run("q")
    assert len(events) == 1
    assert events[0]["data"]["kind"] == "agent_disabled"
    assert "GROQ_API_KEY" in events[0]["data"]["text"]


# ---------------------------------------------------------------------------
# Compression helpers (what the model sees vs. what the UI sees)
# ---------------------------------------------------------------------------

def test_compress_facility_search_keeps_six_rows_and_trims_fields(fake_tools):
    rows = [{"id": f"vf-{i}", "name": "n", "services": list("abcdefgh"), "raw_blob": "x" * 500} for i in range(10)]
    out = json.loads(_compress_tool_result_for_llm("facility_search", rows))
    assert len(out) == 6
    assert set(out[0]) == {"id", "name", "address_district", "address_state", "latitude", "longitude",
                           "distance_km", "has_capability", "payer_ok", "services", "phone", "hours_of_operation"}
    assert out[0]["services"] == list("abcde")


def test_compress_passes_errors_through_and_truncates_blobs():
    err = {"error": "invalid_arguments", "tool": "geocode", "detail": ["x"]}
    assert json.loads(_compress_tool_result_for_llm("geocode", err)) == err
    big = _compress_tool_result_for_llm("check_hours", {"raw": "y" * 5000})
    assert len(big) < 1900 and big.endswith(" …(truncated)")


def test_compress_tool_trace_for_critic_keeps_calls_and_tail():
    messages = [
        {"role": "assistant", "tool_calls": [{"function": {"name": "geocode", "arguments": '{"query": "x"}'}}]},
        {"role": "tool", "tool_call_id": "call_abcdefghijklmnop", "content": "z" * 1000},
    ]
    trace = _compress_tool_trace(messages)
    assert "[tool_call] geocode(" in trace
    assert "[tool_result call_abcdefg]" in trace and "…(truncated)" in trace
    long_trace = _compress_tool_trace([{"role": "tool", "tool_call_id": "c", "content": "q" * 500}] * 40, max_chars=2000)
    assert long_trace.startswith("…(earlier calls truncated)…") and len(long_trace) <= 2000
