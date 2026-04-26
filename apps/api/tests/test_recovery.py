"""Tests for the Llama Pythonic tool-call recovery layer.

The Groq API parser sometimes 400s with `tool_use_failed` even though the
underlying model emitted perfectly valid Llama-Pythonic function calls. The
agent.py recovery layer parses `failed_generation` and synthesises OpenAI-
shaped tool_calls so the loop continues. Regressing the regex would silently
break every multi-tool query, so it gets unit-tested here.
"""

from __future__ import annotations

import json

import pytest

from aarogya_api.agent import (
    _recover_tool_calls_from_failed_generation,
    _synthesize_assistant_message,
)


def test_recovers_single_function_tag():
    raw = '<function=geocode>{"query": "Yeshwantpur Bengaluru"}</function>'
    out = _recover_tool_calls_from_failed_generation(raw)
    assert len(out) == 1
    name, args = out[0]
    assert name == "geocode"
    assert json.loads(args) == {"query": "Yeshwantpur Bengaluru"}


def test_recovers_pythonic_brace_variant():
    # The Llama 3.1+ Pythonic format sometimes drops the closing tag and
    # writes `<function=name{...}>` — the regex must still extract.
    raw = '<function=facility_search{"latitude": 13.022, "longitude": 77.553, "radius_km": 15}>'
    out = _recover_tool_calls_from_failed_generation(raw)
    assert len(out) == 1
    name, args = out[0]
    assert name == "facility_search"
    parsed = json.loads(args)
    assert parsed["latitude"] == 13.022
    assert parsed["radius_km"] == 15


def test_recovers_multiple_function_tags_in_one_response():
    raw = (
        "Let me look up that facility and check capacity.\n"
        '<function=geocode>{"query": "Mumbai"}</function>\n'
        'and then <function=facility_search>{"latitude": 19.07, "longitude": 72.87, "radius_km": 10}</function>'
    )
    out = _recover_tool_calls_from_failed_generation(raw)
    assert len(out) == 2
    assert [name for name, _ in out] == ["geocode", "facility_search"]
    assert json.loads(out[1][1])["latitude"] == 19.07


def test_returns_empty_on_unparseable_input():
    # Pure prose with no tool tag and no JSON object should yield nothing —
    # the supervisor then retries with reduced temperature.
    raw = "I'm not sure I understand the request, please clarify."
    out = _recover_tool_calls_from_failed_generation(raw)
    assert out == []


def test_falls_back_to_bare_json_object():
    # Last-ditch: some models emit `{"name": "...", "arguments": {...}}` with
    # no surrounding tags. The recovery layer should still pick that up.
    raw = json.dumps({"name": "trust_score", "arguments": {"facility_id": "vf-1234"}})
    out = _recover_tool_calls_from_failed_generation(raw)
    assert len(out) == 1
    name, args = out[0]
    assert name == "trust_score"
    assert json.loads(args)["facility_id"] == "vf-1234"


def test_synthesised_message_quacks_like_groq_choice_message():
    recovered = [
        ("geocode", json.dumps({"query": "Bengaluru"})),
        ("facility_search", json.dumps({"latitude": 12.97, "longitude": 77.59})),
    ]
    msg = _synthesize_assistant_message(recovered)
    assert msg.content is None
    assert len(msg.tool_calls) == 2
    assert msg.tool_calls[0].type == "function"
    assert msg.tool_calls[0].function.name == "geocode"
    # The id must be a string the OpenAI message-list shape expects.
    assert isinstance(msg.tool_calls[0].id, str)
    assert msg.tool_calls[0].id.startswith("call_recovered_")


@pytest.mark.parametrize("garbage", ["", None, "   ", "<function=>{}</function>"])
def test_recover_is_safe_on_garbage_inputs(garbage):
    # Should never raise; should return [] (caller handles fallback).
    out = _recover_tool_calls_from_failed_generation(garbage)
    assert out == []
