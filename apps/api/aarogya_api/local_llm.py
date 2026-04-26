"""LLM helpers — Ollama (on-device, PHI-safe) + Gemini cloud fallback for vision.

The on-device path is the canonical hospital-VPC enterprise mode: PHI never
leaves the device. The cloud Gemini path exists so the LIVE PUBLIC DEMO works
on hosted infrastructure (Vercel/Railway/Fly) where Ollama isn't available.
"""

from __future__ import annotations

import json as _json
import os
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


def _gemini_available() -> bool:
    """Cloud vision/embeddings are available when GOOGLE_API_KEY is set."""
    s = settings()
    return bool(s.google_api_key or os.environ.get("GOOGLE_API_KEY"))


def _groq_available() -> bool:
    """Cloud chat is available when GROQ_API_KEY is set."""
    s = settings()
    return bool(s.groq_api_key or os.environ.get("GROQ_API_KEY"))


async def _ollama_reachable() -> bool:
    """Quick check whether the local Ollama daemon answers within 1s."""
    s = settings()
    try:
        async with httpx.AsyncClient(timeout=1.0) as c:
            r = await c.get(f"{s.ollama_base_url}/api/tags")
            return r.status_code == 200
    except Exception:
        return False


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed a batch of strings with the on-device embed model.

    Cloud-hosted demo: Ollama may be unavailable. The semantic_intake_search
    tool that uses this embedder will surface the error to the agent, which
    routes around it. We do NOT silently swap to a cloud embedder here
    because the persisted facility embeddings (1024-dim bge-m3) would not
    match a different model's vector space.
    """
    s = settings()
    out: list[list[float]] = []
    for t in texts:
        # ollama-python's embed call takes one input at a time across versions; loop for safety
        r = await client().embeddings(model=s.local_embed_model, prompt=t)
        out.append(r["embedding"])
    return out


async def chat_local(
    system: str,
    user: str,
    *,
    model: str | None = None,
    json_schema: dict | None = None,
) -> str:
    """One-shot chat against on-device Ollama. PHI-safe."""
    s = settings()
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    kwargs: dict[str, Any] = {"model": model or s.local_chat_model, "messages": messages}
    if json_schema:
        kwargs["format"] = json_schema
    r = await client().chat(**kwargs)
    return r["message"]["content"]


async def chat_cloud(
    system: str,
    user: str,
    *,
    json_schema: dict | None = None,
    max_tokens: int = 1024,
) -> str:
    """One-shot chat against Groq (GPT-OSS-120B) — for the public live demo
    when Ollama isn't available. JSON-mode coerced via OpenAI-compatible
    `response_format={"type": "json_object"}` when a schema is requested.
    """
    s = settings()
    api_key = s.groq_api_key or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set; cannot use cloud chat path.")
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    payload: dict[str, Any] = {
        "model": s.groq_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.0,
    }
    if json_schema:
        payload["response_format"] = {"type": "json_object"}
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(
            f"{s.groq_base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        r.raise_for_status()
        data = r.json()
    return data["choices"][0]["message"]["content"]


async def chat(
    system: str,
    user: str,
    *,
    model: str | None = None,
    json_schema: dict | None = None,
) -> str:
    """Dispatch to whichever chat path is available.

    Cloud Groq is preferred for the live deployment (no Ollama required);
    local Ollama is used in the hospital-VPC enterprise mode where PHI
    must not egress.
    """
    if _groq_available():
        return await chat_cloud(system, user, json_schema=json_schema)
    return await chat_local(system, user, model=model, json_schema=json_schema)


_VISION_PROMPT = (
    "You are a clinical triage assistant. Look at this image (could be a "
    "wound, medication, X-ray, prescription, snake, or oxygen-cylinder "
    "gauge). Return JSON with: 'observation' (string, what you literally "
    "see), 'condition' (string, suspected condition or null), 'severity' "
    "(one of: low, moderate, high, critical), 'recommended_specialty' "
    "(one of: emergency, surgery, dermatology, snakebite, obstetrics, "
    "pediatrics, cardiology, dialysis, oncology, general), 'rationale' "
    "(string, ≤30 words). Be terse. Output ONLY valid JSON."
)


def _safe_parse_vision_json(raw: str) -> dict[str, Any]:
    """Parse JSON returned by a vision model. Tolerates markdown code-fence
    wrapping (Gemini frequently emits ```json ... ``` even when asked for raw)."""
    s = (raw or "").strip()
    # Strip ```json ... ``` or ``` ... ``` fences
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s[3:]
        if s.endswith("```"):
            s = s[: -3]
        s = s.strip()
    try:
        return _json.loads(s)
    except _json.JSONDecodeError:
        return {
            "observation": (raw or "")[:200],
            "condition": None,
            "severity": "low",
            "recommended_specialty": "general",
            "rationale": "fallback parse",
        }


async def vision_triage_local(image_b64: str, prompt: str | None = None) -> dict[str, Any]:
    """On-device vision via Ollama medgemma:27b. PHI-safe — image stays on the box."""
    user = prompt or _VISION_PROMPT
    messages = [{"role": "user", "content": user, "images": [image_b64]}]
    r = await client().chat(
        model="medgemma:27b",
        messages=messages,
        format="json",
        options={"num_predict": 400},
    )
    return {
        "model": "medgemma:27b",
        "runs_on": "device",
        "result": _safe_parse_vision_json(r["message"]["content"]),
    }


def _detect_image_mime(image_b64: str) -> str:
    """Detect MIME type from base64-encoded image header bytes."""
    head = image_b64[:16]
    if head.startswith("iVBORw0K"):
        return "image/png"
    if head.startswith("/9j/"):
        return "image/jpeg"
    if head.startswith("UklGR"):
        return "image/webp"
    if head.startswith("R0lGOD"):
        return "image/gif"
    return "image/jpeg"  # safe default; Gemini accepts most JPEG-shaped streams


async def vision_triage_cloud(image_b64: str, prompt: str | None = None) -> dict[str, Any]:
    """Cloud vision via Google Gemini Flash-Lite (multimodal). For the public live demo."""
    s = settings()
    api_key = s.google_api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not set; cannot use cloud vision path.")
    user = prompt or _VISION_PROMPT
    mime_type = _detect_image_mime(image_b64)
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": user},
                {"inline_data": {"mime_type": mime_type, "data": image_b64}},
            ],
        }],
        "generationConfig": {
            "maxOutputTokens": 400,
            # Note: responseMimeType: application/json removed — combining it
            # with certain prompt shapes triggers Gemini 400s. The prompt
            # already asks for JSON and _safe_parse_vision_json handles
            # graceful fallback if the model emits prose.
        },
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/{s.gemini_vision_model}:generateContent?key={api_key}"
    )
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
    try:
        raw = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raw = ""
    return {
        "model": s.gemini_vision_model,
        "runs_on": "cloud",
        "result": _safe_parse_vision_json(raw),
    }


async def vision_triage(image_b64: str, prompt: str | None = None) -> dict[str, Any]:
    """Dispatch vision to whichever path is available.

    Order of preference:
      1. Cloud Gemini (when GOOGLE_API_KEY is set — the live-demo path)
      2. On-device Ollama medgemma (the hospital-VPC enterprise path)

    Pick cloud first because the live deployment won't have Ollama; if
    GOOGLE_API_KEY is missing we fall through to the device path so the
    enterprise scenario keeps working.
    """
    if _gemini_available():
        return await vision_triage_cloud(image_b64, prompt)
    return await vision_triage_local(image_b64, prompt)


async def healthcheck() -> dict[str, Any]:
    s = settings()
    async with httpx.AsyncClient(timeout=5.0) as c:
        r = await c.get(f"{s.ollama_base_url}/api/tags")
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
    return {"ollama_up": True, "models": models}
