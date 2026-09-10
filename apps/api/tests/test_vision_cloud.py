"""The Gemini API key must never reach a client.

Regression tests for the key-in-URL leak: `vision_triage_cloud` used to put
`GOOGLE_API_KEY` in the request query string, `raise_for_status()` embeds
the URL in the exception, and `/api/triage_photo` returned `str(e)`.
"""

from __future__ import annotations

import logging

import httpx
import pytest
from starlette.testclient import TestClient

from aarogya_api import local_llm

FAKE_KEY = "AIzaSy-FAKE-TEST-KEY-0123456789abcdef"


def _install_transport(monkeypatch, handler):
    """Route every `httpx.AsyncClient` built inside local_llm through a
    MockTransport; return the list of captured requests."""
    captured: list[httpx.Request] = []
    real_client = httpx.AsyncClient

    def wrapped(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return handler(request)

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(wrapped)
        return real_client(*args, **kwargs)

    monkeypatch.setattr(local_llm.httpx, "AsyncClient", factory)
    return captured


@pytest.fixture
def gemini_settings(make_settings):
    return make_settings(google_api_key=FAKE_KEY, groq_api_key=None)


async def test_gemini_key_is_sent_in_header_not_url(monkeypatch, gemini_settings):
    def ok(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            request=request,
            json={"candidates": [{"content": {"parts": [{"text": '{"observation": "x", "severity": "low"}'}]}}]},
        )

    captured = _install_transport(monkeypatch, ok)
    out = await local_llm.vision_triage_cloud("iVBORw0KGgo=", None)

    assert len(captured) == 1
    req = captured[0]
    assert req.headers["x-goog-api-key"] == FAKE_KEY
    assert FAKE_KEY not in str(req.url)
    assert "key=" not in str(req.url)
    assert out["runs_on"] == "cloud"
    assert out["result"]["observation"] == "x"


async def test_failed_gemini_call_exception_does_not_contain_key(monkeypatch, gemini_settings):
    def bad_request(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, request=request, json={"error": {"message": "bad"}})

    _install_transport(monkeypatch, bad_request)
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await local_llm.vision_triage_cloud("iVBORw0KGgo=", None)

    assert FAKE_KEY not in str(exc_info.value)
    assert FAKE_KEY not in repr(exc_info.value)


def test_triage_endpoint_error_is_generic_and_key_free(monkeypatch, gemini_settings, caplog):
    def bad_request(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, request=request, json={"error": {"message": "quota exceeded"}})

    _install_transport(monkeypatch, bad_request)
    from aarogya_api.app import TRIAGE_ERROR_TEXT, app

    with caplog.at_level(logging.ERROR, logger="aarogya_api.app"):
        with TestClient(app) as client:
            r = client.post("/api/triage_photo", json={"image_b64": "iVBORw0KGgo="})

    assert r.status_code == 200
    body = r.json()
    raw = r.text
    assert body["error"] == TRIAGE_ERROR_TEXT
    assert body["runs_on"] == "cloud"
    assert FAKE_KEY not in raw
    # No exception text (status code, URL, "Client error") reaches the client…
    assert "400" not in raw and "generativelanguage" not in raw and "Client error" not in raw
    # …but the failure was logged server-side.
    assert any("vision triage failed" in rec.getMessage() for rec in caplog.records)
    assert any(rec.exc_info for rec in caplog.records)
