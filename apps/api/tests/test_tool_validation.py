"""Tool arguments are validated against each tool's declared JSON schema
before `impl(**args)` runs. On failure the model gets a structured error
(`error: invalid_arguments` + the expected schema) so it can self-correct."""

from __future__ import annotations

import pytest

from aarogya_api import agent
from aarogya_api.agent import TOOL_DEFS, TOOL_IMPLS, TOOL_SCHEMAS, _execute_tool, _validate_tool_args


def test_every_registered_tool_has_a_schema_and_an_impl():
    names = {t["name"] for t in TOOL_DEFS}
    assert names == set(TOOL_IMPLS) == set(TOOL_SCHEMAS)
    assert len(names) == 12


def test_valid_args_pass():
    assert _validate_tool_args("geocode", {"query": "Mysuru"}) == []
    assert _validate_tool_args("facility_search", {"latitude": 12.3, "longitude": 76.6, "radius_km": 20}) == []


def test_optional_args_with_defaults_are_not_required():
    # `radius_km`/`limit` carry defaults in the schema but are not `required`.
    assert _validate_tool_args("facility_search", {"latitude": 12.3, "longitude": 76.6}) == []


def test_missing_required_arg_is_reported():
    problems = _validate_tool_args("geocode", {})
    assert problems and "'query' is a required property" in problems[0]


def test_wrong_type_is_reported_with_path():
    problems = _validate_tool_args("facility_search", {"latitude": "12.3", "longitude": 76.6})
    assert any(p.startswith("latitude:") and "is not of type 'number'" in p for p in problems)


def test_wrong_array_item_type_is_reported():
    problems = _validate_tool_args(
        "total_out_of_pocket",
        {"facility_payer_ok": True, "services_required": [1], "journey_inr_round_trip": 10, "travel_time_min_round_trip": 5},
    )
    assert any(p.startswith("services_required.0:") for p in problems)


def test_undeclared_arg_is_rejected():
    problems = _validate_tool_args("geocode", {"query": "x", "open_now": True})
    assert any("unexpected argument(s) ['open_now']" in p for p in problems)


def test_non_object_args_are_rejected():
    assert _validate_tool_args("geocode", ["Mysuru"]) == ["arguments must be a JSON object, got list"]


def test_unknown_tool_name():
    assert _validate_tool_args("teleport", {}) == ["unknown tool: teleport"]


async def test_execute_tool_returns_structured_error_and_does_not_call_impl(monkeypatch):
    calls: list[dict] = []

    async def fake_geocode(**kwargs):
        calls.append(kwargs)
        return {"ok": True}

    monkeypatch.setitem(agent.TOOL_IMPLS, "geocode", fake_geocode)
    out = await _execute_tool("geocode", {"querry": "Mysuru"})

    assert calls == []
    assert out["error"] == "invalid_arguments"
    assert out["tool"] == "geocode"
    assert out["expected_schema"] == TOOL_SCHEMAS["geocode"]
    assert any("'query' is a required property" in p for p in out["detail"])
    assert any("unexpected argument(s) ['querry']" in p for p in out["detail"])


async def test_execute_tool_runs_impl_when_args_are_valid(monkeypatch):
    async def fake_geocode(query: str):
        return {"ok": True, "query": query}

    monkeypatch.setitem(agent.TOOL_IMPLS, "geocode", fake_geocode)
    assert await _execute_tool("geocode", {"query": "Mysuru"}) == {"ok": True, "query": "Mysuru"}


async def test_execute_tool_unknown_tool_lists_available_tools():
    out = await _execute_tool("teleport", {})
    assert out["error"] == "unknown_tool"
    assert "geocode" in out["available_tools"]


async def test_execute_tool_impl_exception_becomes_error_dict(monkeypatch):
    async def boom(query: str):
        raise ValueError("nominatim down")

    monkeypatch.setitem(agent.TOOL_IMPLS, "geocode", boom)
    out = await _execute_tool("geocode", {"query": "Mysuru"})
    assert out["tool"] == "geocode" and "nominatim down" in out["error"]


@pytest.mark.parametrize("name", [t["name"] for t in TOOL_DEFS])
def test_every_schema_is_a_valid_draft2020_schema(name):
    from jsonschema import Draft202012Validator

    Draft202012Validator.check_schema(TOOL_SCHEMAS[name])



async def test_null_optional_arg_is_dropped_not_rejected(monkeypatch):
    # models send `"when_iso": null`; the impl defaults it to None anyway
    seen = {}

    async def fake_check_hours(location_id, when_iso=None):
        seen.update(location_id=location_id, when_iso=when_iso)
        return {"ok": True}

    monkeypatch.setitem(agent.TOOL_IMPLS, "check_hours", fake_check_hours)
    out = await _execute_tool("check_hours", {"location_id": "vf-1", "when_iso": None})
    assert out == {"ok": True}
    assert seen == {"location_id": "vf-1", "when_iso": None}
