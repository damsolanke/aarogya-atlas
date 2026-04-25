"""Agent tools — the verbs the supervisor can invoke.

Each tool returns a small JSON-serialisable dict so the agent's reasoning
trace stays readable. Geo proximity uses the SQL `haversine_km` helper
(no PostGIS dep).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy import text

from .db import SessionLocal
from .local_llm import chat as local_chat, embed
from .settings import settings


# ---------------------------------------------------------------------------
# Geocoding (Nominatim, free)
# ---------------------------------------------------------------------------

async def geocode(query: str) -> dict[str, Any]:
    s = settings()
    headers = {"User-Agent": s.user_agent, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            f"{s.nominatim_url}/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "in"},
            headers=headers,
        )
        r.raise_for_status()
        results = r.json()
    if not results:
        return {"ok": False, "query": query}
    top = results[0]
    return {
        "ok": True,
        "query": query,
        "display_name": top["display_name"],
        "latitude": float(top["lat"]),
        "longitude": float(top["lon"]),
    }


# ---------------------------------------------------------------------------
# Facility search — proximity + capability filter
# ---------------------------------------------------------------------------

async def facility_search(
    latitude: float,
    longitude: float,
    radius_km: float = 15.0,
    capabilities: list[str] | None = None,
    payer: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Return facilities within `radius_km` matching capabilities + payer."""
    capabilities = [c.strip().lower() for c in (capabilities or []) if c.strip()]

    sql = """
    WITH nearby AS (
        SELECT
            l.id, l.name, l.address_district, l.address_state, l.address_city,
            l.latitude, l.longitude, l.hours_of_operation, l.phone, l.type,
            haversine_km(:lat, :lon, l.latitude, l.longitude) AS distance_km
        FROM fhir_location l
        WHERE
            l.latitude  BETWEEN :lat - :deg_radius AND :lat + :deg_radius
            AND l.longitude BETWEEN :lon - :deg_radius AND :lon + :deg_radius
    ),
    capped AS (
        SELECT * FROM nearby
        WHERE distance_km <= :radius
        ORDER BY distance_km
        LIMIT :hard_limit
    ),
    cap_match AS (
        SELECT
            c.id,
            COALESCE(
                bool_or(LOWER(s.name) = ANY(:caps) OR LOWER(s.speciality) = ANY(:caps)),
                FALSE
            ) AS has_capability,
            ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS services
        FROM capped c
        LEFT JOIN fhir_healthcareservice s ON s.location_id = c.id
        GROUP BY c.id
    ),
    payer_match AS (
        SELECT
            c.id,
            COALESCE(bool_or(p.payer = :payer AND p.accepted), :no_payer_filter) AS payer_ok
        FROM capped c
        LEFT JOIN facility_payer p ON p.location_id = c.id
        GROUP BY c.id
    )
    SELECT
        c.id, c.name, c.address_district, c.address_state, c.address_city,
        c.latitude, c.longitude, c.hours_of_operation, c.phone,
        c.distance_km, m.has_capability, m.services, pm.payer_ok
    FROM capped c
    JOIN cap_match  m  ON m.id  = c.id
    JOIN payer_match pm ON pm.id = c.id
    ORDER BY (CASE WHEN :has_caps AND m.has_capability THEN 0 ELSE 1 END),
             (CASE WHEN pm.payer_ok THEN 0 ELSE 1 END),
             c.distance_km
    LIMIT :limit
    """
    deg_radius = (radius_km / 111.0) + 0.05  # cheap bbox prefilter
    params = {
        "lat": latitude,
        "lon": longitude,
        "radius": radius_km,
        "deg_radius": deg_radius,
        "limit": limit,
        "hard_limit": max(limit * 5, 100),
        "caps": capabilities or [""],
        "has_caps": bool(capabilities),
        "payer": payer or "",
        "no_payer_filter": payer is None,
    }
    async with SessionLocal() as session:
        rows = (await session.execute(text(sql), params)).mappings().all()

    out = []
    for row in rows:
        d = dict(row)
        # JSONB returned as dict already; ARRAY as list
        if isinstance(d.get("hours_of_operation"), str):
            try:
                d["hours_of_operation"] = json.loads(d["hours_of_operation"])
            except Exception:
                pass
        out.append(d)
    return out


# ---------------------------------------------------------------------------
# LLM extraction over messy free-text — runs LOCALLY (PHI-safe)
# ---------------------------------------------------------------------------

CAPABILITY_EXTRACT_SYSTEM = """You extract structured healthcare-facility capabilities from messy free-text intake notes. \
Return ONLY JSON matching the supplied schema. Do not invent capabilities not supported by the text. \
Capabilities should be common clinical service names (e.g., "Dialysis", "ECG", "MRI", "Cesarean section", "Insulin"). \
Languages may be mixed (English, Hindi, Tamil) — translate to canonical English service names."""

CAPABILITY_SCHEMA = {
    "type": "object",
    "properties": {
        "capabilities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "evidence": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["name", "evidence", "confidence"],
            },
        }
    },
    "required": ["capabilities"],
}


async def extract_capabilities(intake_text: str) -> dict[str, Any]:
    """Local-LLM extraction of capabilities from a single intake note. Zero PHI egress."""
    raw = await local_chat(
        system=CAPABILITY_EXTRACT_SYSTEM,
        user=f"Intake note:\n---\n{intake_text}\n---\n\nReturn JSON only.",
        json_schema=CAPABILITY_SCHEMA,
    )
    try:
        return json.loads(raw)
    except Exception:
        return {"capabilities": [], "raw": raw}


# ---------------------------------------------------------------------------
# Hours-of-operation check
# ---------------------------------------------------------------------------

def _is_open_now(hours_raw: str | None, when: datetime) -> str:
    """Cheap parse of OSM opening_hours strings. Returns 'open'|'closed'|'unknown'."""
    if not hours_raw:
        return "unknown"
    h = hours_raw.lower()
    if "24/7" in h:
        return "open"
    return "unknown"  # honest: full opening_hours grammar is huge; stub returns unknown


async def check_hours(location_id: str, when_iso: str | None = None) -> dict[str, Any]:
    when = datetime.fromisoformat(when_iso) if when_iso else datetime.now()
    sql = "SELECT hours_of_operation FROM fhir_location WHERE id = :id"
    async with SessionLocal() as session:
        row = (await session.execute(text(sql), {"id": location_id})).first()
    if not row:
        return {"location_id": location_id, "open": "unknown", "reason": "not-found"}
    hours_raw = row[0].get("raw") if row[0] else None
    return {"location_id": location_id, "open": _is_open_now(hours_raw, when), "raw": hours_raw}


# ---------------------------------------------------------------------------
# Live status feed (mocked but schema-real)
# ---------------------------------------------------------------------------

async def status_feed(location_id: str, service: str) -> dict[str, Any]:
    sql = """
    SELECT status, reported_by, note, reported_at
    FROM facility_status_event
    WHERE location_id = :id AND lower(service_name) = lower(:svc)
    ORDER BY reported_at DESC LIMIT 1
    """
    async with SessionLocal() as session:
        row = (await session.execute(text(sql), {"id": location_id, "svc": service})).first()
    if not row:
        return {"location_id": location_id, "service": service, "status": "unknown"}
    return {
        "location_id": location_id,
        "service": service,
        "status": row[0],
        "reported_by": row[1],
        "note": row[2],
        "reported_at": row[3].isoformat() if row[3] else None,
    }


# ---------------------------------------------------------------------------
# Semantic search over intake notes (the "10k messy records" angle)
# ---------------------------------------------------------------------------

async def semantic_intake_search(query: str, k: int = 5) -> list[dict[str, Any]]:
    [vec] = await embed([query])
    sql = """
    SELECT n.id, n.location_id, l.name AS facility_name, n.text, n.language,
           1 - (n.embedding <=> CAST(:q AS vector)) AS similarity
    FROM intake_note n
    JOIN fhir_location l ON l.id = n.location_id
    ORDER BY n.embedding <=> CAST(:q AS vector)
    LIMIT :k
    """
    async with SessionLocal() as session:
        rows = (await session.execute(
            text(sql), {"q": str(vec), "k": k}
        )).mappings().all()
    return [dict(r) for r in rows]
