"""Agent tools — the verbs the supervisor can invoke.

Each tool returns a small JSON-serialisable dict so the agent's reasoning
trace stays readable. Geo proximity uses the SQL `haversine_km` helper
(no PostGIS dep).

In-memory cache (`_TOOL_CACHE`) wraps deterministic tools (geocode, trust_score,
find_medical_deserts) for the lifetime of the process — the same query within
the same eval run skips the network. This is cheap correctness: arguments are
JSON-serialised and used as the key.
"""

from __future__ import annotations

import json
from collections import OrderedDict
from datetime import datetime
from typing import Any, Awaitable, Callable

import httpx
from sqlalchemy import text

from .db import SessionLocal
from .local_llm import chat as local_chat, embed
from .settings import settings


# ---------------------------------------------------------------------------
# In-memory LRU cache for deterministic tools
# ---------------------------------------------------------------------------

_TOOL_CACHE: OrderedDict[str, Any] = OrderedDict()
_TOOL_CACHE_MAX = 256
_TOOL_CACHE_HITS = {"hits": 0, "misses": 0}


def cache_stats() -> dict[str, Any]:
    total = _TOOL_CACHE_HITS["hits"] + _TOOL_CACHE_HITS["misses"]
    return {
        **_TOOL_CACHE_HITS,
        "size": len(_TOOL_CACHE),
        "hit_rate": round(_TOOL_CACHE_HITS["hits"] / total, 3) if total else 0.0,
    }


def cached(name: str):
    """Decorator: cache the awaitable result of a deterministic async tool."""

    def deco(fn: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
        async def wrapper(**kwargs: Any) -> Any:
            try:
                key = name + ":" + json.dumps(kwargs, sort_keys=True, default=str)
            except Exception:
                # Args not serialisable → bypass cache.
                return await fn(**kwargs)
            if key in _TOOL_CACHE:
                _TOOL_CACHE.move_to_end(key)
                _TOOL_CACHE_HITS["hits"] += 1
                return _TOOL_CACHE[key]
            result = await fn(**kwargs)
            _TOOL_CACHE_HITS["misses"] += 1
            _TOOL_CACHE[key] = result
            if len(_TOOL_CACHE) > _TOOL_CACHE_MAX:
                _TOOL_CACHE.popitem(last=False)
            return result

        return wrapper

    return deco


# ---------------------------------------------------------------------------
# Geocoding (Nominatim, free)
# ---------------------------------------------------------------------------

@cached("geocode")
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
    cell = row[0]
    # JSONB column can come back as dict, str, or None.
    if isinstance(cell, dict):
        hours_raw = cell.get("raw") or cell.get("opening_hours") or json.dumps(cell)
    elif isinstance(cell, str):
        hours_raw = cell
    else:
        hours_raw = None
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

async def databricks_vector_search(query: str, k: int = 5) -> dict[str, Any]:
    """Mosaic AI Vector Search query against `workspace.aarogya.facilities_idx`.

    Delta Sync Index with managed `databricks-bge-large-en` embeddings.
    This is the production-grade retrieval path; semantic_intake_search is the
    on-device backup for PHI / offline use.
    """
    s = settings()
    host = s.databricks_host
    token = s.databricks_token
    if not host or not token:
        return {"error": "Databricks not configured (set DATABRICKS_HOST/TOKEN)"}
    url = f"{host}/api/2.0/vector-search/indexes/workspace.aarogya.facilities_idx/query"
    async with httpx.AsyncClient(timeout=20.0) as c:
        r = await c.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "query_text": query,
                # Index only stores facility_id, name, score (Free Edition managed embeddings).
                # Other facility metadata is joined back via Postgres in subsequent calls.
                "columns": ["facility_id", "name"],
                "num_results": k,
            },
        )
        if r.status_code >= 400:
            return {"error": f"vector-search HTTP {r.status_code}: {r.text[:200]}"}
        j = r.json()
    cols = [c["name"] for c in j.get("manifest", {}).get("columns", [])]
    rows = j.get("result", {}).get("data_array", []) or []
    hits = [dict(zip(cols, row)) for row in rows]
    return {
        "source": "Mosaic AI Vector Search · workspace.aarogya.facilities_idx",
        "embedding_model": "databricks-bge-large-en",
        "hit_count": len(hits),
        "hits": hits,
    }


async def semantic_intake_search(query: str, k: int = 5) -> list[dict[str, Any]]:
    [vec] = await embed([query])
    # Format vector as Postgres array literal: '[0.1,0.2,...]'. pgvector
    # accepts this string form directly via the explicit ::vector cast.
    vec_literal = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
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
            text(sql), {"q": vec_literal, "k": k}
        )).mappings().all()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Feasibility — total cost to the patient, not just km
# ---------------------------------------------------------------------------
#
# Heuristic numbers (verifiable, not made up):
#   - MGNREGA wage floor (FY 2025-26): ~₹260/day average across India.
#     Source: Govt of India MGNREGA portal.
#   - Karnataka KSRTC bus fare ~₹1.5 / km in rural mofussil routes.
#     Auto-rickshaw urban (BMTC area) ~₹25 base + ₹15/km after 1.9km.
#   - Effective rural travel speed (mofussil bus + walk): ~22 km/h.
#     Urban auto/cab inside Bengaluru/Mysuru/Hubli core: ~24 km/h with traffic.
# These are honest stubs — the *shape* of the reasoning is what matters
# in an MVP. Replace with OSRM + GTFS in production.
# ---------------------------------------------------------------------------

URBAN_HUBS_DEG: list[tuple[float, float, float]] = [
    # (lat, lon, radius_km) — rough urban catchments
    (12.9716, 77.5946, 25),  # Bengaluru
    (12.2958, 76.6394, 14),  # Mysuru
    (15.3647, 75.1240, 12),  # Hubli-Dharwad
    (12.8703, 74.8806, 12),  # Mangaluru
]


def _is_urban(lat: float, lon: float) -> bool:
    for hlat, hlon, r_km in URBAN_HUBS_DEG:
        # cheap bounding box check; close enough for the heuristic
        if abs(lat - hlat) < r_km / 111 and abs(lon - hlon) < r_km / 111:
            return True
    return False


@cached("estimate_journey")
async def estimate_journey(
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
) -> dict[str, Any]:
    """Honest heuristic for one-way travel time + ₹ cost. Use round-trip = 2×."""
    # Haversine
    import math
    R = 6371.0
    dlat = math.radians(to_lat - from_lat)
    dlon = math.radians(to_lon - from_lon)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(from_lat)) * math.cos(math.radians(to_lat)) *
         math.sin(dlon / 2) ** 2)
    distance_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    urban = _is_urban(to_lat, to_lon) and _is_urban(from_lat, from_lon)
    if urban:
        speed_kmh = 24.0
        # Auto-rickshaw single trip: ₹35 base + ₹15/km
        cost_one_way_inr = round(35 + max(0.0, distance_km - 1.9) * 15)
        mode = "auto-rickshaw"
    else:
        speed_kmh = 22.0
        # KSRTC bus + walk to bus stop
        cost_one_way_inr = round(max(15, distance_km * 1.5))
        mode = "bus + walk"

    travel_minutes_one_way = round((distance_km / speed_kmh) * 60)

    # Multi-modal alternatives — same distance, different speeds + costs.
    # Numbers anchored to Indian transport averages (city + intercity corridors).
    auto_speed = 24.0 if urban else 28.0  # auto-rickshaw OR private taxi
    bus_speed = 18.0  # KSRTC + walk to bus stop, with stops
    # Ambulance: priority routing → ~1.4× the auto speed in city, 1.6× in rural
    ambulance_speed = (auto_speed * 1.4) if urban else (auto_speed * 1.6)

    auto_min = round((distance_km / auto_speed) * 60)
    bus_min = round((distance_km / bus_speed) * 60)
    ambulance_min = round((distance_km / ambulance_speed) * 60)

    auto_cost = round(35 + max(0.0, distance_km - 1.9) * 15)
    bus_cost = round(max(15, distance_km * 1.5))
    ambulance_cost = 0  # 108 ambulance is free in most Indian states

    return {
        "distance_km": round(distance_km, 1),
        "mode": mode,
        "travel_time_min_one_way": travel_minutes_one_way,
        "round_trip_min": travel_minutes_one_way * 2,
        "round_trip_inr": cost_one_way_inr * 2,
        # Phase G item 3: multi-modal comparison
        "modes": {
            "auto": {
                "label": "Auto-rickshaw",
                "minutes_one_way": auto_min,
                "inr_one_way": auto_cost,
                "speed_kmh": auto_speed,
            },
            "bus": {
                "label": "Public bus + walk",
                "minutes_one_way": bus_min,
                "inr_one_way": bus_cost,
                "speed_kmh": bus_speed,
            },
            "ambulance": {
                "label": "108 ambulance (priority)",
                "minutes_one_way": ambulance_min,
                "inr_one_way": ambulance_cost,
                "speed_kmh": ambulance_speed,
                "note": "free in most states · response 5-15 min",
            },
        },
        "assumptions": {
            "speed_kmh": speed_kmh,
            "is_urban_corridor": urban,
            "mgnrega_wage_per_day_inr": 260,
        },
    }


@cached("total_out_of_pocket")
async def total_out_of_pocket(
    facility_payer_ok: bool,
    services_required: list[str],
    journey_inr_round_trip: int,
    travel_time_min_round_trip: int,
    daily_wage_inr: int = 260,
) -> dict[str, Any]:
    """Sum the real out-of-pocket cost a family faces.

    Treatment_inr = 0 when payer (e.g. Ayushman Bharat) is accepted; else
    indicative private fees per service line. Wage loss = (round-trip + ~1h
    waiting) prorated against an 8h MGNREGA day.
    """
    private_fee = {
        "ecg": 350,
        "echo": 1200,
        "dialysis": 2500,
        "mri": 4500,
        "x-ray": 350,
        "consultation": 600,
        "blood test": 500,
        "obstetrics": 4000,
    }
    if facility_payer_ok:
        treatment_inr = 0
        treatment_note = "covered by payer"
    else:
        treatment_inr = sum(
            private_fee.get(s.strip().lower(), 800) for s in services_required
        )
        treatment_note = "private rate (indicative)"

    minutes_off_work = travel_time_min_round_trip + 60  # ~1h waiting
    wage_loss_inr = round(daily_wage_inr * (minutes_off_work / (8 * 60)))

    total_inr = treatment_inr + journey_inr_round_trip + wage_loss_inr
    return {
        "treatment_inr": treatment_inr,
        "treatment_note": treatment_note,
        "journey_inr": journey_inr_round_trip,
        "wage_loss_inr": wage_loss_inr,
        "total_inr": total_inr,
        "breakdown_human": (
            f"₹{treatment_inr} treatment + ₹{journey_inr_round_trip} transport "
            f"+ ₹{wage_loss_inr} wage loss = ₹{total_inr} total"
        ),
    }
