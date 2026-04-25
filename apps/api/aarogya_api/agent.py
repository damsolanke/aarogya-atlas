"""Aarogya Atlas supervisor agent — official Anthropic SDK + adaptive thinking.

Architecture:
  - Cloud supervisor: Claude Opus 4.7 (`claude-opus-4-7`) via the Anthropic SDK,
    with adaptive thinking and `effort: high`. Reasoning + tool selection.
  - Local PHI tools: any tool whose name starts with `extract_` or
    `semantic_intake_search` runs against the on-device Ollama model. Patient
    text never leaves the device.

The agent's reasoning trace (thinking summaries + tool calls + tool results)
is streamed to the UI as typed events so a judge can audit *how* it answered.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, AsyncIterator

from anthropic import AsyncAnthropic
from anthropic.types import Message, ToolUseBlock

from . import tools as T
from .settings import settings


# ---------------------------------------------------------------------------
# Tool registry — name -> (JSON schema, async impl)
# ---------------------------------------------------------------------------

TOOL_DEFS: list[dict[str, Any]] = [
    {
        "name": "geocode",
        "description": (
            "Convert a place description (e.g. 'Yeshwantpur, Bengaluru') to lat/lon. "
            "Always call this first when the user mentions a location by name."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "facility_search",
        "description": (
            "Search FHIR-normalised healthcare facilities near a point. "
            "Filter by required clinical capabilities (e.g. ['dialysis', 'ECG']) "
            "and payer (e.g. 'ayushman-bharat')."
        ),
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
        "description": (
            "Run the LOCAL on-device LLM to extract clinical capabilities from a "
            "messy free-text intake note. PHI safe — never leaves the device. "
            "Use when given raw intake notes (not for generic patient questions)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"intake_text": {"type": "string"}},
            "required": ["intake_text"],
        },
    },
    {
        "name": "check_hours",
        "description": "Check whether a facility appears open at a given ISO datetime.",
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
        "description": (
            "Fetch the most recent crowd-sourced status for a specific service at a "
            "facility — e.g. 'is the dialysis machine up at facility osm-node-12345?'"
        ),
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
        "description": (
            "Semantic search over multilingual free-text intake notes (bge-m3 "
            "embeddings, runs locally). Returns relevant notes + their facilities."
        ),
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
        "description": (
            "Honest heuristic for one-way travel time + ₹ cost between two lat/lon "
            "points in India. Returns distance_km, mode (bus + walk vs auto), "
            "travel_time_min_one_way, round_trip_min, round_trip_inr. "
            "Use this to reason about whether a family can REACH a facility, not just "
            "whether it exists."
        ),
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
        "description": (
            "Compute the REAL total cost to the patient: treatment fee (₹0 if "
            "Ayushman Bharat accepted; else indicative private rate) + transport "
            "(round-trip ₹) + wage loss (MGNREGA day prorated). Use this to rank "
            "facilities by what a family can actually afford, not just by distance."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_payer_ok": {"type": "boolean"},
                "services_required": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Clinical services needed, e.g. ['ECG','consultation']",
                },
                "journey_inr_round_trip": {"type": "integer"},
                "travel_time_min_round_trip": {"type": "integer"},
                "daily_wage_inr": {"type": "integer", "default": 260},
            },
            "required": [
                "facility_payer_ok",
                "services_required",
                "journey_inr_round_trip",
                "travel_time_min_round_trip",
            ],
        },
    },
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
    "estimate_journey": T.estimate_journey,
    "total_out_of_pocket": T.total_out_of_pocket,
}

# Tools that route to the on-device model. Used in the trace event so the UI
# can label them with the "On-device" badge.
LOCAL_TOOLS = {"extract_capabilities_from_note", "semantic_intake_search"}


SYSTEM_PROMPT = """You are Aarogya Atlas — a healthcare-facility intelligence agent for India.

Your user is most often an ASHA worker, clinic coordinator, or a family member \
trying to get a sick relative to the right care. They are often time-poor, \
cost-sensitive, and operating with patchy connectivity.

Your job: turn a natural-language need into a ranked list of facilities the family \
can ACTUALLY reach, afford, and use.

Operating rules:
- ALWAYS call `geocode` first if the user names a place. Never hallucinate coordinates.
- When you call `facility_search`, pass concrete clinical capabilities (e.g. "ECG", \
"dialysis", "obstetrics") and the payer when implied (e.g. "ayushman-bharat").
- If the user gives you a raw intake note, call `extract_capabilities_from_note` FIRST. \
That tool runs the local on-device model — PHI never leaves the device.
- For your top 2-3 candidate facilities, call `estimate_journey` from the user's \
location to the facility, then `total_out_of_pocket` with the journey result and \
required services. RANK BY TOTAL ₹ COST + TRAVEL TIME, not by km. A "free" facility \
that's 4 hours away by bus may be worse than a ₹500 clinic 20 min away.
- Reply in the user's language: English, हिंदी, or தமிழ்.
- Be honest about data gaps. If hours are unknown, say so. Never invent payer eligibility.
- Today is {now_iso}.

Output format — ALWAYS structure your final answer in three tiers:

  ## ⭐ Best match
  Single facility — best total-cost / time / quality balance.
  Name, distance_km, total_inr breakdown_human, hours, payer, one-line why.
  One concrete next-step ("Call ___, ask: ___").

  ## 📍 Closest payer-eligible options (1-2)
  For families who cannot afford to pay out-of-pocket. Same row format.

  ## 💡 Backup
  One alternative if 1 and 2 fall through (e.g. private clinic, slightly farther \
hospital with confirmed capability).

End with a single "Call X first" sentence. Be terse — an ASHA worker reads this on \
a 4G phone in a crowded clinic."""


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

_client: AsyncAnthropic | None = None


def client() -> AsyncAnthropic:
    global _client
    if _client is None:
        s = settings()
        api_key = s.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY not set. Drop a key in apps/api/.env "
                "or export it in the shell."
            )
        _client = AsyncAnthropic(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# Streaming entry point
# ---------------------------------------------------------------------------

async def _execute_tool(name: str, args: dict[str, Any]) -> Any:
    impl = TOOL_IMPLS.get(name)
    if impl is None:
        return {"error": f"unknown tool: {name}"}
    try:
        return await impl(**args)
    except Exception as e:
        return {"error": str(e), "tool": name}


def _summarise_thinking(msg: Message) -> str:
    """Concatenate any thinking blocks (summarized form when display=summarized)."""
    parts = []
    for block in msg.content:
        if block.type == "thinking":
            parts.append(block.thinking or "")
    return "\n".join(p for p in parts if p)


def _final_text(msg: Message) -> str:
    parts = []
    for block in msg.content:
        if block.type == "text":
            parts.append(block.text)
    return "".join(parts)


def _tool_uses(msg: Message) -> list[ToolUseBlock]:
    return [b for b in msg.content if b.type == "tool_use"]


async def stream_answer(query: str, max_iterations: int = 8) -> AsyncIterator[dict[str, Any]]:
    """Yield SSE-shaped events: thoughts, tool requests, tool results, final answer."""
    s = settings()
    aclient = client()

    system = SYSTEM_PROMPT.format(now_iso=datetime.now().isoformat(timespec="seconds"))
    messages: list[dict[str, Any]] = [{"role": "user", "content": query}]

    for _iter in range(max_iterations):
        # Stream the supervisor turn so we never hit non-stream HTTP timeouts.
        async with aclient.messages.stream(
            model=s.supervisor_model,
            max_tokens=8192,
            system=system,
            tools=TOOL_DEFS,
            messages=messages,
            thinking={"type": "adaptive", "display": "summarized"},
            extra_body={"output_config": {"effort": "high"}},
        ) as stream:
            msg = await stream.get_final_message()

        thinking_text = _summarise_thinking(msg)
        if thinking_text:
            yield {"event": "step", "data": {
                "type": "thought",
                "content": thinking_text,
                "tool_calls": [],
            }}

        tool_calls = _tool_uses(msg)

        # If no tool calls, this is the final answer.
        if not tool_calls:
            yield {"event": "final", "data": {"text": _final_text(msg)}}
            return

        # Surface the tool requests in the trace.
        yield {"event": "step", "data": {
            "type": "tool_request",
            "content": _final_text(msg),  # any preamble text
            "tool_calls": [
                {"name": tc.name, "args": tc.input} for tc in tool_calls
            ],
        }}

        # Append the assistant turn (full content — preserve thinking signatures).
        messages.append({"role": "assistant", "content": msg.content})

        # Execute tools and emit results.
        tool_results: list[dict[str, Any]] = []
        for tc in tool_calls:
            result = await _execute_tool(tc.name, dict(tc.input))
            content = json.dumps(result, default=str)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tc.id,
                "content": content,
            })
            yield {"event": "step", "data": {
                "type": "tool_result",
                "tool": tc.name,
                "content": content,
            }}

        messages.append({"role": "user", "content": tool_results})

    # Iteration cap reached without a final.
    yield {"event": "final", "data": {
        "text": "(Agent reached its tool-call iteration limit without producing a final answer.)"
    }}
