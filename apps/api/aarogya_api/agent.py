"""Aarogya Atlas supervisor agent — Groq SDK (OpenAI-compatible) + tool calling.

Architecture:
  - Cloud supervisor: GPT-OSS-120B via Groq's OpenAI-compatible API.
    Reasoning + tool selection. Free tier (30 RPM / 1,000 RPD).
  - Local PHI tools: any tool whose name starts with `extract_` or
    `semantic_intake_search` runs against the on-device Ollama model. Patient
    text never leaves the device.

The agent's tool calls + tool results are streamed to the UI as typed events
so a judge can audit *how* it answered.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from datetime import datetime
from types import SimpleNamespace
from typing import Any, AsyncIterator

from groq import AsyncGroq, BadRequestError, APIStatusError, RateLimitError

from . import tools as T
from . import trust as TR
from .observability import maybe_span, mlflow_enabled
from .settings import settings


# ---------------------------------------------------------------------------
# Tool registry — name -> (JSON schema, async impl)
# ---------------------------------------------------------------------------

TOOL_DEFS: list[dict[str, Any]] = [
    {
        "name": "geocode",
        "description": "Place name → lat/lon. Call first when user names a location.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "facility_search",
        "description": "Search facilities near a point. Filter by capabilities (e.g. ['ECG','dialysis']) + payer (e.g. 'ayushman-bharat').",
        "input_schema": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number"},
                "longitude": {"type": "number"},
                "radius_km": {"type": "number", "default": 15.0},
                "capabilities": {"type": "array", "items": {"type": "string"}},
                "payer": {"type": "string"},
                "limit": {"type": "integer", "default": 10},
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "extract_capabilities_from_note",
        "description": "Extract clinical capabilities from a free-text intake note (PHI-safe path).",
        "input_schema": {
            "type": "object",
            "properties": {"intake_text": {"type": "string"}},
            "required": ["intake_text"],
        },
    },
    {
        "name": "check_hours",
        "description": "Is a facility open at a given ISO datetime?",
        "input_schema": {
            "type": "object",
            "properties": {
                "location_id": {"type": "string"},
                "when_iso": {"type": "string"},
            },
            "required": ["location_id"],
        },
    },
    {
        "name": "status_feed",
        "description": "Latest crowd-sourced status for a service at a facility (e.g. 'dialysis machine up at osm-node-12345').",
        "input_schema": {
            "type": "object",
            "properties": {
                "location_id": {"type": "string"},
                "service": {"type": "string"},
            },
            "required": ["location_id", "service"],
        },
    },
    {
        "name": "semantic_intake_search",
        "description": "Semantic search over multilingual intake notes (bge-m3, on-device). Returns relevant notes + facilities.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "databricks_vector_search",
        "description": "Mosaic AI Vector Search over 10k VF facility descriptions. Production-grade retrieval; semantic_intake_search is the on-device fallback.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "estimate_journey",
        "description": "One-way travel time + ₹ between two India lat/lon points. Returns distance_km, modes (auto/bus/108-ambulance), times, costs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "from_lat": {"type": "number"},
                "from_lon": {"type": "number"},
                "to_lat": {"type": "number"},
                "to_lon": {"type": "number"},
            },
            "required": ["from_lat", "from_lon", "to_lat", "to_lon"],
        },
    },
    {
        "name": "total_out_of_pocket",
        "description": "Real total ₹ cost: treatment (₹0 if Ayushman OK) + transport + MGNREGA wage-loss. Rank by what a family can afford, not km.",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_payer_ok": {"type": "boolean"},
                "services_required": {"type": "array", "items": {"type": "string"}},
                "journey_inr_round_trip": {"type": "integer"},
                "travel_time_min_round_trip": {"type": "integer"},
                "daily_wage_inr": {"type": "integer", "default": 260},
            },
            "required": ["facility_payer_ok", "services_required", "journey_inr_round_trip", "travel_time_min_round_trip"],
        },
    },
    {
        "name": "trust_score",
        "description": "0-100 Trust Score + contradiction flags (claims surgery w/o anesthesia, ICU w/o critical-care staff, etc). MANDATORY on top recommendation.",
        "input_schema": {
            "type": "object",
            "properties": {"facility_id": {"type": "string"}},
            "required": ["facility_id"],
        },
    },
    {
        "name": "find_medical_deserts",
        "description": "Districts where a high-acuity specialty has no facilities. For NGO-planner queries. Specialties: oncology, dialysis, trauma, icu, cardiac, neonatal, obstetrics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "specialty": {"type": "string"},
                "state": {"type": "string"},
                "min_facilities_per_district": {"type": "integer", "default": 1},
            },
            "required": ["specialty"],
        },
    },
    {
        "name": "validate_recommendation",
        "description": "Confirm facility evidence for a claimed capability. Returns PASS/WARN/FAIL + supporting text snippet. Use before recommending high-stakes services.",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_id": {"type": "string"},
                "claimed_capability": {"type": "string"},
            },
            "required": ["facility_id", "claimed_capability"],
        },
    },
]


# OpenAI/Groq function-calling format (derived from the canonical TOOL_DEFS above).
TOOL_DEFS_GROQ: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["input_schema"],
        },
    }
    for t in TOOL_DEFS
]


# Tool name -> impl. Anything routed through `T.extract_*` or
# `T.semantic_intake_search` runs against local Ollama.
TOOL_IMPLS = {
    "geocode": T.geocode,
    "facility_search": T.facility_search,
    "extract_capabilities_from_note": T.extract_capabilities,
    "check_hours": T.check_hours,
    "status_feed": T.status_feed,
    "semantic_intake_search": T.semantic_intake_search,
    "databricks_vector_search": T.databricks_vector_search,
    "estimate_journey": T.estimate_journey,
    "total_out_of_pocket": T.total_out_of_pocket,
    "trust_score": TR.trust_score,
    "find_medical_deserts": TR.find_medical_deserts,
    "validate_recommendation": TR.validate_recommendation,
}

# Tools that route to the on-device model. Used in the trace event so the UI
# can label them with the "On-device" badge.
LOCAL_TOOLS = {"extract_capabilities_from_note", "semantic_intake_search"}


SYSTEM_PROMPT = """Aarogya Atlas — agentic healthcare-facility intelligence for India. \
Search the Virtue Foundation 10k-facility dataset; reduce Discovery-to-Care time \
for NGO planners, ASHA workers, clinic coordinators, families. Data is messy.

RULES
1. Named place → ALWAYS `geocode` first. Never hallucinate coords.
2. Facility search → `facility_search(lat,lon,capabilities,payer)`. If structured miss but real need, also `semantic_intake_search`.
3. Raw intake notes → `extract_capabilities_from_note` first.
4. Top 2-3 candidates → `estimate_journey` + `total_out_of_pocket`. Rank by ₹+time, not km. Urgency (PPH,MI,stroke,trauma,snakebite,anaphylaxis,neonatal sepsis) → surface AMBULANCE (108 free). Else show: 🚗 auto · 🚌 bus · 🚑 108.
5. MANDATORY before recommending → `trust_score(id)`. <60 or high-severity flag → switch facility or surface the contradiction.
6. High-stakes (surgery,oncology,dialysis,trauma) → also `validate_recommendation(id,capability)`.
7. "Where is X weakest" planner queries → `find_medical_deserts(specialty,state)` not facility_search.
8. Reply in user's language: English, हिंदी, தமிழ்.
9. Clinical pathway routing (apply BEFORE facility_search):
   - Obstetric emergency → CEmONC (surgery+blood-bank+24/7 anesthesia)
   - Snakebite → polyvalent antivenom + region-correct species coverage
   - Neonatal sepsis → SNCU/NICU only (general peds without ventilation = wrong)
   - Acute MI/stroke → cathlab+thrombolytics ("cardiology consult" ≠ "STEMI-capable")
   State which pathway you applied.
10. Honesty: surface data gaps; never invent payer eligibility; if trust_score flags, show them.
11. No-location query (e.g. "trauma now" with no city) → `find_medical_deserts(specialty)` + `facility_search` at Bengaluru proxy (12.97, 77.59) + ask which city. Always cite real vf-* ids.
12. STOP-RETRYING RULE: at most TWO `facility_search` calls per query. If the second still has no capability match, write the answer with what you have plus an honest "no facilities matching X were in the dataset within Y km — here are the closest by proximity" caveat. Never call facility_search 3+ times.
13. CONTEXT REUSE: if a prior turn already produced a geocode result (lat/lon in conversation history), DO NOT call geocode again — reuse those coordinates directly.

Time: {now_iso}

OUTPUT — 3 tiers, omit empty:
  ## ⭐ Best match
  One facility — best balance of evidence + ₹ + time + Trust. Show: name (id), distance_km, total_inr (breakdown), hours, payer, Trust Score, one-line why. End with "Call ___, ask: ___".
  ## 📍 Closest payer-eligible (1-2)  — same row format
  ## 💡 Backup  — one alternative
  ## ⚠️ Trust flags (only if fired) — severity + evidence

End with one "Call X first" sentence. Terse — readers on 4G phones."""


# ---------------------------------------------------------------------------
# Critic — mandatory second-pass verification on every final answer.
# ---------------------------------------------------------------------------
#
# The critic is the architectural moat. Every supervisor answer goes through
# a separate LLM call with a strict critic system prompt. This produces a
# deterministic 0–100 Trust Score and structured flags for every response,
# which the UI surfaces as the hero metric on every recommendation card.
#
# The brief's open research question — "Real-world data is messy — how would
# you take this into account when framing conclusions?" — is answered here:
# every conclusion is critic-verified before it reaches the user.

CRITIC_SYSTEM_PROMPT = """You are a strict clinical-recommendation critic for an Indian healthcare facility intelligence system. \
Your job is to score the trustworthiness of an answer 0–100 based ONLY on whether the recommendations are supported by the tool results that were collected.

GRADING RUBRIC

Start at 100. Subtract for each issue you find. Be honest — under-confident scores are better than over-confident ones.

  -25  A facility was recommended without `trust_score` being called on it
  -25  A high-stakes service (surgery, dialysis, oncology, trauma, ICU, obstetric emergency) was recommended without `validate_recommendation`
  -20  A claimed clinical capability has no supporting evidence in any tool result
  -15  Cost or payer eligibility was claimed without `total_out_of_pocket` results to back it
  -15  A travel time / distance was given without `estimate_journey` or `geocode` results
  -10  A trust_score result returned high-severity flags but the answer recommended the facility anyway without surfacing them
  -10  The answer states data the agent never retrieved (hallucinated facility name, phone, address)
   -5  Hours of operation claimed but `check_hours` was never called

Add back up to +10 for excellent practices: surfacing data gaps explicitly, citing specific facility ids (vf-*), recommending the 108 ambulance for urgent pathways.

VERDICT MAPPING
  PASS   trust_score >= 75  AND no high-severity flag
  WARN   trust_score 50–74  OR  one high-severity flag
  FAIL   trust_score < 50   OR  two+ high-severity flags

OUTPUT — return STRICT JSON only, no prose:
{
  "trust_score": <integer 0-100>,
  "verdict": "PASS" | "WARN" | "FAIL",
  "flags": [
    {"severity": "high"|"med"|"low", "issue": "<short description>", "evidence": "<quote from answer or tool result>"}
  ],
  "summary": "<one sentence explaining the score>"
}"""


def _compress_tool_result_for_llm(tool_name: str, result: Any) -> str:
    """Trim tool results before they're appended to the supervisor's message
    history. Aims to keep enough signal for the model to reason while staying
    inside Groq's free-tier 8000 TPM input budget across multi-tool turns.

    The UI still receives the full, untrimmed tool result via the streamed
    `step` event, so the trace stays auditable for the user.
    """
    if isinstance(result, dict) and "error" in result:
        return json.dumps(result, default=str)
    if tool_name in ("facility_search", "databricks_vector_search") and isinstance(result, list):
        keep = []
        for f in result[:6]:
            if not isinstance(f, dict):
                continue
            keep.append({
                "id": f.get("id"),
                "name": f.get("name"),
                "address_district": f.get("address_district"),
                "address_state": f.get("address_state"),
                "latitude": f.get("latitude"),
                "longitude": f.get("longitude"),
                "distance_km": f.get("distance_km"),
                "has_capability": f.get("has_capability"),
                "payer_ok": f.get("payer_ok"),
                "services": (f.get("services") or [])[:5],
                "phone": f.get("phone"),
                "hours_of_operation": f.get("hours_of_operation"),
            })
        return json.dumps(keep, default=str)
    if tool_name == "semantic_intake_search" and isinstance(result, list):
        return json.dumps(
            [
                {
                    "facility_id": r.get("facility_id") if isinstance(r, dict) else None,
                    "score": r.get("score") if isinstance(r, dict) else None,
                    "snippet": (r.get("text") or r.get("snippet") or "")[:160] if isinstance(r, dict) else None,
                }
                for r in result[:5]
            ],
            default=str,
        )
    blob = json.dumps(result, default=str)
    if len(blob) > 1800:
        blob = blob[:1800] + " …(truncated)"
    return blob


def _compress_tool_trace(messages: list[dict[str, Any]], max_chars: int = 6000) -> str:
    """Compress the tool-call trace for the critic so we don't blow the context budget."""
    parts: list[str] = []
    for m in messages:
        if m.get("role") == "tool":
            tool_call_id = m.get("tool_call_id", "?")[:12]
            content = m.get("content", "")
            if isinstance(content, str) and len(content) > 600:
                content = content[:600] + " …(truncated)"
            parts.append(f"[tool_result {tool_call_id}] {content}")
        elif m.get("role") == "assistant" and m.get("tool_calls"):
            for tc in m.get("tool_calls", []):
                fn = tc.get("function", {})
                parts.append(f"[tool_call] {fn.get('name')}({fn.get('arguments', '')[:240]})")
    blob = "\n".join(parts)
    if len(blob) > max_chars:
        # keep the tail — the most recent tool calls are most relevant to the final answer
        blob = "…(earlier calls truncated)…\n" + blob[-(max_chars - 60):]
    return blob


async def _run_critic(
    user_query: str,
    tool_trace: str,
    final_answer: str,
    aclient: AsyncGroq,
    s,
) -> dict[str, Any]:
    """Run the mandatory second-pass critic. Returns the parsed verdict dict
    (or a defensive default if the critic call fails — never let the critic
    break the user-facing flow)."""
    prompt = (
        f"USER QUERY:\n{user_query}\n\n"
        f"TOOL CALLS + RESULTS:\n{tool_trace}\n\n"
        f"SUPERVISOR FINAL ANSWER:\n{final_answer}\n\n"
        f"Score per the rubric. Return JSON only."
    )
    try:
        response = await aclient.chat.completions.create(
            model=s.groq_model,
            max_tokens=900,
            temperature=0.0,
            messages=[
                {"role": "system", "content": CRITIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            **_model_kwargs(s),
        )
        raw = response.choices[0].message.content or "{}"
        verdict = json.loads(raw)
    except Exception as e:
        # Never let the critic break the response. Return a neutral fallback.
        return {
            "trust_score": 50,
            "verdict": "WARN",
            "flags": [{"severity": "low", "issue": "critic_unavailable", "evidence": f"{type(e).__name__}: {str(e)[:120]}"}],
            "summary": "Critic verification could not complete — score defaulted to neutral.",
        }
    # Normalise + clamp
    score = verdict.get("trust_score", 50)
    if not isinstance(score, (int, float)):
        score = 50
    score = max(0, min(100, int(score)))
    verdict["trust_score"] = score
    if verdict.get("verdict") not in ("PASS", "WARN", "FAIL"):
        verdict["verdict"] = "WARN" if score < 75 else "PASS"
    if not isinstance(verdict.get("flags"), list):
        verdict["flags"] = []
    if not isinstance(verdict.get("summary"), str):
        verdict["summary"] = ""
    return verdict


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

_client: AsyncGroq | None = None


def client() -> AsyncGroq:
    global _client
    if _client is None:
        s = settings()
        api_key = s.groq_api_key or os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY not set. Drop a key in apps/api/.env or export it "
                "in the shell. Free key at https://console.groq.com/keys."
            )
        _client = AsyncGroq(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

async def _execute_tool(name: str, args: dict[str, Any]) -> Any:
    impl = TOOL_IMPLS.get(name)
    if impl is None:
        return {"error": f"unknown tool: {name}"}
    is_local = name in LOCAL_TOOLS
    with maybe_span(
        f"tool.{name}",
        span_type="TOOL",
        inputs={"args": args},
        attributes={"runs_on": "device" if is_local else "host", "tool_name": name},
    ) as span:
        try:
            result = await impl(**args)
            span.set_outputs({"result": result})
            return result
        except Exception as e:
            err = {"error": str(e), "tool": name}
            span.set_outputs(err)
            return err


def _parse_tool_args(raw: Any) -> dict[str, Any]:
    """Groq returns tool arguments as a JSON-encoded string. Parse defensively."""
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return {}


# ---------------------------------------------------------------------------
# Streaming entry point
# ---------------------------------------------------------------------------

async def stream_answer(
    history: list[dict[str, Any]] | str,
    max_iterations: int = 8,
) -> AsyncIterator[dict[str, Any]]:
    """Yield SSE-shaped events: tool requests, tool results, final answer.

    `history` is the conversation so far as an ordered list of
    `{"role": "user"|"assistant", "content": str}` messages, ending in a user
    message. (A bare string is accepted as a one-turn shortcut.)
    """
    # One-turn shortcut for callers (tests, scripts) that still pass a string.
    if isinstance(history, str):
        history = [{"role": "user", "content": history}]

    if not history:
        yield {"event": "error", "data": {
            "kind": "empty_query",
            "text": "Conversation is empty. Send a user message to start.",
        }}
        return

    # Normalise + last-must-be-user-with-content
    norm: list[dict[str, Any]] = []
    for m in history:
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        norm.append({"role": role, "content": content})
    if not norm or norm[-1]["role"] != "user":
        yield {"event": "error", "data": {
            "kind": "empty_query",
            "text": "Last message must be from the user with non-empty content.",
        }}
        return

    last_user = norm[-1]["content"]
    if len(last_user) > 4000:
        yield {"event": "error", "data": {
            "kind": "query_too_long",
            "text": f"Last user message is {len(last_user)} chars; max is 4000. Trim and try again.",
        }}
        return

    s = settings()
    aclient = client()

    system = SYSTEM_PROMPT.format(now_iso=datetime.now().isoformat(timespec="seconds"))
    # OpenAI-style: system goes first, then the full conversation history.
    messages: list[dict[str, Any]] = [{"role": "system", "content": system}, *norm]

    with maybe_span(
        "agent.aarogya_atlas",
        span_type="AGENT",
        inputs={"query": last_user, "history_len": len(norm)},
        attributes={"model": s.groq_model, "max_iterations": max_iterations, "turns": sum(1 for m in norm if m["role"] == "user")},
    ) as agent_span:
        final_text: str | None = None
        try:
            async for ev in _agent_loop(s, aclient, messages, max_iterations, agent_span):
                yield ev
                if ev.get("event") == "final":
                    final_text = ev.get("data", {}).get("text", "")
        except RateLimitError as e:
            wait = _extract_retry_after_seconds(e)
            wait_msg = f" Try again in ~{int(wait)}s." if wait else " Try again in a minute."
            body = getattr(e, "body", None) or {}
            err = body.get("error", {}) if isinstance(body, dict) else {}
            limit_kind = "daily" if "TPD" in str(err.get("message", "")) else "per-minute"
            yield {"event": "error", "data": {
                "kind": "rate_limited",
                "text": f"Groq {limit_kind} rate limit hit on the free tier.{wait_msg} (We're already retrying transparently with backoff — this means the cooldown is longer than our retry budget.)",
            }}
            return
        except Exception as e:
            yield {"event": "error", "data": {
                "kind": "agent_exception",
                "text": f"{type(e).__name__}: {str(e)[:300]}",
            }}
            return

        # Mandatory critic pass — every supervisor answer is verified by a
        # separate LLM call before reaching the user. This is the architectural
        # moat: deterministic Trust Score + flags on every recommendation.
        if final_text:
            with maybe_span(
                "critic.verify",
                span_type="LLM",
                inputs={"final_text_chars": len(final_text)},
                attributes={"model": s.groq_model, "role": "critic"},
            ) as critic_span:
                tool_trace = _compress_tool_trace(messages)
                verdict = await _run_critic(last_user, tool_trace, final_text, aclient, s)
                critic_span.set_outputs({
                    "trust_score": verdict.get("trust_score"),
                    "verdict": verdict.get("verdict"),
                    "flag_count": len(verdict.get("flags", [])),
                })
            yield {"event": "critic", "data": verdict}


def _model_kwargs(s) -> dict[str, Any]:
    """Per-model parameter quirks.

    GPT-OSS reasoning models need a low reasoning effort to keep their
    response shape close to what Groq's parser expects. Without it, the
    `<analysis>` reasoning blob can confuse the tool_calls extraction.
    """
    extra: dict[str, Any] = {}
    if "gpt-oss" in s.groq_model:
        extra["reasoning_effort"] = "low"
    return extra


# ---------------------------------------------------------------------------
# Tool-use-failed recovery
#
# Groq's API parses model output and tries to extract OpenAI-shaped tool_calls.
# Llama 3.1+, Llama 4, GPT-OSS-120B all sometimes emit Llama "Pythonic"
# tool-call format: `<function=name>{json_args}</function>` (or variants).
# When the parser fails it returns 400 `tool_use_failed` with the raw model
# text in `failed_generation`. We catch that, parse the function calls
# ourselves, and synthesize the OpenAI-shape tool_calls so the agent loop
# continues. Documented community workaround for 2026 (pydantic-ai #4350).
# ---------------------------------------------------------------------------

# Match `<function=name>{...}</function>` and `<function=name{...}>` and tolerant variants
_FUNC_TAG_RE = re.compile(
    r"<function\s*=\s*(?P<name>[\w.\-]+)\s*[>{]?\s*(?P<args>\{[\s\S]*?\})\s*(?:</function>)?",
    re.MULTILINE,
)


def _recover_tool_calls_from_failed_generation(failed: str) -> list[tuple[str, str]]:
    """Parse Llama Pythonic tool-call output into [(name, json_args_str), ...].

    Returns an empty list when nothing parseable is found, in which case the
    caller should retry with reduced temperature (Groq's official guidance)
    or surface the error.
    """
    if not failed or not isinstance(failed, str):
        return []
    out: list[tuple[str, str]] = []
    for m in _FUNC_TAG_RE.finditer(failed):
        name = m.group("name")
        args = m.group("args")
        try:
            json.loads(args)  # validate
            out.append((name, args))
        except json.JSONDecodeError:
            continue
    if out:
        return out
    # Last-ditch: maybe the whole blob is a JSON tool-call object {"name", "arguments"}
    try:
        d = json.loads(failed.strip())
        if isinstance(d, dict) and "name" in d:
            args = d.get("arguments", "{}")
            if isinstance(args, dict):
                args = json.dumps(args)
            return [(d["name"], args)]
    except json.JSONDecodeError:
        pass
    return []


def _synthesize_assistant_message(recovered: list[tuple[str, str]]):
    """Build a SimpleNamespace that quacks like Groq's `choice.message` so the
    rest of the loop can consume it without branching."""
    tool_calls = [
        SimpleNamespace(
            id=f"call_recovered_{uuid.uuid4().hex[:8]}",
            type="function",
            function=SimpleNamespace(name=name, arguments=args),
        )
        for name, args in recovered
    ]
    return SimpleNamespace(content=None, tool_calls=tool_calls)


_RATE_RETRY_HINT_RE = re.compile(r"try again in\s+([\d.]+)\s*s", re.IGNORECASE)


def _extract_retry_after_seconds(exc: BaseException) -> float | None:
    """Pull a wait hint out of a Groq 413/429 error.

    Groq returns messages like 'Please try again in 1.234s'. We use that hint
    to sleep just long enough for the TPM window to refresh, with a sane cap.
    """
    msg = str(getattr(exc, "message", "") or exc)
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        err = body.get("error", {})
        if isinstance(err, dict):
            msg += " " + str(err.get("message", ""))
    m = _RATE_RETRY_HINT_RE.search(msg)
    if m:
        try:
            return min(float(m.group(1)), 30.0)
        except ValueError:
            return None
    return None


def _prune_oldest_tool_results(messages: list[dict[str, Any]]) -> bool:
    """Replace the oldest still-full tool result content with a stub so the
    next supervisor turn fits inside the input budget. Returns True if a
    message was pruned, False if there is nothing left to compress."""
    PRUNED_MARKER = "[…pruned: see UI trace for full result…]"
    for m in messages:
        if m.get("role") == "tool" and m.get("content") not in (None, "", PRUNED_MARKER):
            content = m.get("content") or ""
            if len(content) > len(PRUNED_MARKER):
                m["content"] = PRUNED_MARKER
                return True
    return False


async def _supervisor_turn(
    s,
    aclient: AsyncGroq,
    messages: list[dict[str, Any]],
):
    """One supervisor iteration with `tool_use_failed` recovery + self-correcting
    rate-limit / payload-size handling.

    Returns (assistant_msg, finish_reason, usage_dict, recovered_flag).
    """
    extra = _model_kwargs(s)
    last_err: BaseException | None = None

    # Up to 4 attempts: original, one reduced-temp, one after sleeping for the
    # TPM window, one after pruning the oldest tool result. Each layer addresses
    # a distinct failure mode (parser glitch → cooldown → input bloat).
    for attempt in range(4):
        try:
            response = await aclient.chat.completions.create(
                model=s.groq_model,
                # Groq's TPM rate-limit counts (input_tokens + max_tokens), not
                # actual usage — so a high max_tokens reserves the whole minute.
                # 1200 is plenty for either a tool-call turn or a final answer.
                max_tokens=1200,
                messages=messages,
                tools=TOOL_DEFS_GROQ,
                tool_choice="auto",
                temperature=0.0 if attempt > 0 else 0.2,
                **extra,
            )
            choice = response.choices[0]
            usage = {}
            if response.usage is not None:
                try:
                    usage = response.usage.model_dump()
                except AttributeError:
                    usage = dict(response.usage)
            return choice.message, choice.finish_reason, usage, False
        except BadRequestError as e:
            body = getattr(e, "body", None) or {}
            err = body.get("error", {}) if isinstance(body, dict) else {}
            code = err.get("code") if isinstance(err, dict) else None
            if code == "tool_use_failed":
                failed = err.get("failed_generation", "") if isinstance(err, dict) else ""
                recovered = _recover_tool_calls_from_failed_generation(failed)
                if recovered:
                    fake = _synthesize_assistant_message(recovered)
                    return fake, "tool_calls", {"recovered": True, "calls": len(recovered)}, True
                last_err = e
                continue
            # 413 "Request too large" comes back as BadRequestError on Groq.
            status = getattr(e, "status_code", None)
            if status == 413 or "too large" in str(e).lower() or "tokens per minute" in str(e).lower():
                if _prune_oldest_tool_results(messages):
                    last_err = e
                    continue
            raise
        except RateLimitError as e:
            wait = _extract_retry_after_seconds(e) or 5.0
            await asyncio.sleep(wait)
            last_err = e
            continue
        except APIStatusError as e:
            if getattr(e, "status_code", None) in (413, 429):
                wait = _extract_retry_after_seconds(e)
                if wait is not None:
                    await asyncio.sleep(wait)
                else:
                    _prune_oldest_tool_results(messages)
                last_err = e
                continue
            raise

    # All attempts exhausted — re-raise the last error.
    if last_err is not None:
        raise last_err
    raise RuntimeError("supervisor turn: unreachable state")


async def _agent_loop(s, aclient, messages, max_iterations, agent_span) -> AsyncIterator[dict[str, Any]]:
    for _iter in range(max_iterations):
        with maybe_span(
            f"supervisor.turn_{_iter}",
            span_type="LLM",
            inputs={"messages_len": len(messages)},
            attributes={"iteration": _iter},
        ) as turn_span:
            assistant_msg, finish_reason, usage, recovered = await _supervisor_turn(
                s, aclient, messages
            )
            turn_span.set_outputs({
                "finish_reason": finish_reason,
                "usage": usage,
                "has_tool_calls": bool(assistant_msg.tool_calls),
                "tool_use_failed_recovered": recovered,
            })

        tool_calls = assistant_msg.tool_calls or []

        # If no tool calls, this is the final answer.
        if not tool_calls:
            final_text = assistant_msg.content or ""
            agent_span.set_outputs({"final_text": final_text, "iterations": _iter + 1})
            yield {"event": "final", "data": {"text": final_text}}
            return

        # Parse args once so we can reuse them in both the trace event and execution.
        parsed_args_list = [_parse_tool_args(tc.function.arguments) for tc in tool_calls]

        # Surface the tool requests in the trace.
        yield {"event": "step", "data": {
            "type": "tool_request",
            "content": assistant_msg.content or "",  # any preamble text
            "tool_calls": [
                {"name": tc.function.name, "args": parsed_args_list[i]}
                for i, tc in enumerate(tool_calls)
            ],
        }}

        # Append the assistant turn — must include tool_calls so the next
        # message-list snapshot is valid for OpenAI-shaped APIs.
        messages.append({
            "role": "assistant",
            "content": assistant_msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in tool_calls
            ],
        })

        # Execute tools in PARALLEL — most of our tools (geocode, facility_search,
        # trust_score, validate_recommendation, journey, cost) are independent IO.
        # asyncio.gather collapses the wall-clock.
        results = await asyncio.gather(
            *(_execute_tool(tc.function.name, args) for tc, args in zip(tool_calls, parsed_args_list)),
            return_exceptions=True,
        )

        for tc, result in zip(tool_calls, results):
            if isinstance(result, BaseException):
                result = {"error": f"{type(result).__name__}: {result}"}
            full_content = json.dumps(result, default=str)
            # Compress what we send back to the LLM so multi-turn + multi-tool
            # turns stay under Groq's free-tier 8000 TPM input budget. The UI
            # still sees the full content via the trace event below.
            llm_content = _compress_tool_result_for_llm(tc.function.name, result)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": llm_content,
            })
            yield {"event": "step", "data": {
                "type": "tool_result",
                "tool": tc.function.name,
                "content": full_content,
            }}

    # Iteration cap reached without a final.
    agent_span.set_outputs({"final_text": None, "iterations": max_iterations, "hit_cap": True})
    yield {"event": "error", "data": {
        "kind": "iteration_cap",
        "text": (
            "Agent reached its tool-call iteration limit without producing a final "
            "answer. Try a more specific query, or break the question into parts."
        ),
    }}
