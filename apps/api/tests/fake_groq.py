"""A scripted stand-in for `groq.AsyncGroq`.

Only the call shape the agent uses is implemented:
`await client.chat.completions.create(**kwargs)`. Each script item is either
a response object (returned), an exception (raised), or a callable taking
the kwargs (its return value is used — handy for asserting on the
messages the agent sent in that turn).
"""

from __future__ import annotations

import copy
import json
import uuid
from types import SimpleNamespace
from typing import Any

import httpx
from groq import BadRequestError, RateLimitError

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class FakeCompletions:
    def __init__(self, script: list[Any]):
        self.script = list(script)
        self.calls: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any):
        # Deep-copy so later in-place edits to `messages` (pruning) don't
        # rewrite the history we captured for this call.
        self.calls.append(copy.deepcopy(kwargs))
        if not self.script:
            raise AssertionError("FakeGroq script exhausted — the agent made more calls than scripted")
        item = self.script.pop(0)
        if isinstance(item, BaseException):
            raise item
        if callable(item):
            item = item(kwargs)
        return item


class FakeGroq:
    """Quacks like AsyncGroq for `client.chat.completions.create`."""

    def __init__(self, script: list[Any]):
        self.chat = SimpleNamespace(completions=FakeCompletions(script))

    @property
    def calls(self) -> list[dict[str, Any]]:
        return self.chat.completions.calls


# --- response builders -------------------------------------------------------

def tool_call(name: str, args: dict[str, Any] | str, call_id: str | None = None):
    arguments = args if isinstance(args, str) else json.dumps(args)
    return SimpleNamespace(
        id=call_id or f"call_{uuid.uuid4().hex[:8]}",
        type="function",
        function=SimpleNamespace(name=name, arguments=arguments),
    )


def _response(message, finish_reason: str, usage: dict[str, int] | None = None):
    usage_obj = None
    if usage is not None:
        usage_obj = SimpleNamespace(model_dump=lambda: dict(usage))
    return SimpleNamespace(choices=[SimpleNamespace(message=message, finish_reason=finish_reason)], usage=usage_obj)


def assistant_tools(*calls, content: str | None = None):
    return _response(SimpleNamespace(content=content, tool_calls=list(calls)), "tool_calls")


def assistant_final(text: str):
    return _response(SimpleNamespace(content=text, tool_calls=None), "stop", usage={"total_tokens": 42})


def critic_ok(score: int = 90, verdict: str = "PASS", flags: list | None = None, summary: str = "fine"):
    payload = {"trust_score": score, "verdict": verdict, "flags": flags or [], "summary": summary}
    return _response(SimpleNamespace(content=json.dumps(payload), tool_calls=None), "stop")


# --- error builders ----------------------------------------------------------

def groq_error(cls, status: int, message: str, body: dict[str, Any] | None = None):
    req = httpx.Request("POST", GROQ_URL)
    body = body if body is not None else {"error": {"message": message}}
    resp = httpx.Response(status, request=req, json=body)
    return cls(message, response=resp, body=body)


def tool_use_failed(failed_generation: str):
    body = {"error": {"code": "tool_use_failed", "message": "Failed to call a function", "failed_generation": failed_generation}}
    return groq_error(BadRequestError, 400, "Failed to call a function", body)


def request_too_large():
    return groq_error(BadRequestError, 413, "Request too large for model: reduce your message size")


def rate_limited(retry_in: float | None = 2.5):
    msg = "Rate limit reached." + (f" Please try again in {retry_in}s." if retry_in is not None else "")
    return groq_error(RateLimitError, 429, msg)
