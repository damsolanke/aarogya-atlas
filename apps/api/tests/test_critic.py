"""The critic never fabricates a score: any failure -> status="unavailable"."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from aarogya_api.agent import (
    CRITIC_UNAVAILABLE_SUMMARY,
    CriticVerdict,
    _normalise_critic_verdict,
    _run_critic,
)


class _FakeCompletions:
    def __init__(self, content=None, exc=None):
        self.content, self.exc, self.calls = content, exc, []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.exc is not None:
            raise self.exc
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=self.content))])


def _client(**kw):
    comp = _FakeCompletions(**kw)
    return SimpleNamespace(chat=SimpleNamespace(completions=comp)), comp


@pytest.fixture
def s(make_settings):
    return make_settings(groq_api_key="test-key")


async def test_critic_ok_path_is_normalised(s):
    payload = {
        "trust_score": 88.6,
        "verdict": "PASS",
        "flags": [{"severity": "low", "issue": "hours not checked", "evidence": "no check_hours call"}],
        "summary": "Well supported.",
    }
    aclient, comp = _client(content=json.dumps(payload))
    out = await _run_critic("q", "trace", "answer", aclient, s)

    assert out["status"] == "ok"
    assert out["trust_score"] == 88 and out["verdict"] == "PASS"
    assert out["flags"][0]["issue"] == "hours not checked"
    assert comp.calls[0]["response_format"] == {"type": "json_object"}
    assert comp.calls[0]["messages"][1]["content"].endswith("Return JSON only.")
    CriticVerdict.model_validate(out)  # round-trips through the declared schema


async def test_critic_api_failure_returns_unavailable_without_exception_text(s):
    secret = "sk-SECRET-should-not-leak"
    aclient, _ = _client(exc=RuntimeError(f"boom {secret}"))
    out = await _run_critic("q", "trace", "answer", aclient, s)

    assert out["status"] == "unavailable"
    assert out["trust_score"] is None and out["verdict"] is None
    assert out["flags"] == []
    assert out["summary"] == CRITIC_UNAVAILABLE_SUMMARY
    assert out["reason"] == "RuntimeError"
    assert secret not in json.dumps(out)


async def test_critic_non_json_is_unavailable(s):
    aclient, _ = _client(content="I cannot score this.")
    out = await _run_critic("q", "trace", "answer", aclient, s)
    assert out["status"] == "unavailable" and out["trust_score"] is None
    assert out["reason"] == "JSONDecodeError"


async def test_critic_json_without_score_is_unavailable(s):
    aclient, _ = _client(content=json.dumps({"verdict": "PASS"}))
    out = await _run_critic("q", "trace", "answer", aclient, s)
    assert out["status"] == "unavailable" and out["reason"] == "ValueError"


async def test_critic_json_array_is_unavailable(s):
    aclient, _ = _client(content="[1, 2, 3]")
    out = await _run_critic("q", "trace", "answer", aclient, s)
    assert out["status"] == "unavailable"


def test_normalise_clamps_and_derives_verdict():
    assert _normalise_critic_verdict({"trust_score": 140})["trust_score"] == 100
    assert _normalise_critic_verdict({"trust_score": -3})["trust_score"] == 0
    assert _normalise_critic_verdict({"trust_score": 80, "verdict": "MEH"})["verdict"] == "PASS"
    assert _normalise_critic_verdict({"trust_score": 60})["verdict"] == "WARN"
    assert _normalise_critic_verdict({"trust_score": 20})["verdict"] == "FAIL"
    out = _normalise_critic_verdict({"trust_score": 70, "flags": ["junk", {"severity": "severe", "issue": 3}], "summary": 5})
    assert out["flags"] == [{"severity": "low", "issue": "3", "evidence": ""}]
    assert out["summary"] == ""


def test_unavailable_verdict_cannot_carry_a_score():
    with pytest.raises(ValueError):
        CriticVerdict(status="ok", trust_score=101)
    v = CriticVerdict(status="unavailable")
    assert v.trust_score is None and v.verdict is None
