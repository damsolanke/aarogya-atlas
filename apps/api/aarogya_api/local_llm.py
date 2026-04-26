"""Local-LLM helpers via Ollama. PHI processing never leaves the device."""

from __future__ import annotations

from typing import Any

import httpx
from ollama import AsyncClient

from .settings import settings


_client: AsyncClient | None = None


def client() -> AsyncClient:
    global _client
    if _client is None:
        _client = AsyncClient(host=settings().ollama_base_url)
    return _client


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed a batch of strings with the configured local embed model."""
    s = settings()
    out: list[list[float]] = []
    for t in texts:
        # ollama-python's embed call takes one input at a time across versions; loop for safety
        r = await client().embeddings(model=s.local_embed_model, prompt=t)
        out.append(r["embedding"])
    return out


async def chat(
    system: str,
    user: str,
    *,
    model: str | None = None,
    json_schema: dict | None = None,
) -> str:
    """One-shot chat. PHI-safe: stays on device."""
    s = settings()
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    kwargs: dict[str, Any] = {"model": model or s.local_chat_model, "messages": messages}
    if json_schema:
        kwargs["format"] = json_schema
    r = await client().chat(**kwargs)
    return r["message"]["content"]


async def vision_triage(image_b64: str, prompt: str | None = None) -> dict[str, Any]:
    """Run a vision-LM (medgemma 27B) on an image client-side.

    PHI-safe: image and analysis stay on the device. Returns a structured
    dict the agent can use to seed a facility query.
    """
    user = prompt or (
        "You are a clinical triage assistant. Look at this image (could be a "
        "wound, medication, X-ray, prescription, snake, or oxygen-cylinder "
        "gauge). Return JSON with: 'observation' (string, what you literally "
        "see), 'condition' (string, suspected condition or null), 'severity' "
        "(one of: low, moderate, high, critical), 'recommended_specialty' "
        "(one of: emergency, surgery, dermatology, snakebite, obstetrics, "
        "pediatrics, cardiology, dialysis, oncology, general), 'rationale' "
        "(string, ≤30 words). Be terse. Output ONLY valid JSON."
    )
    messages = [{"role": "user", "content": user, "images": [image_b64]}]
    r = await client().chat(
        model="medgemma:27b",
        messages=messages,
        format="json",
        options={"num_predict": 400},
    )
    raw = r["message"]["content"]
    import json as _json
    try:
        parsed = _json.loads(raw)
    except _json.JSONDecodeError:
        parsed = {"observation": raw[:200], "condition": None, "severity": "low",
                  "recommended_specialty": "general", "rationale": "fallback parse"}
    return {
        "model": "medgemma:27b",
        "runs_on": "device",
        "result": parsed,
    }


async def healthcheck() -> dict[str, Any]:
    s = settings()
    async with httpx.AsyncClient(timeout=5.0) as c:
        r = await c.get(f"{s.ollama_base_url}/api/tags")
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
    return {"ollama_up": True, "models": models}
