"""FastAPI application: REST + Server-Sent Events for the agent stream."""

from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text

from .agent import stream_answer
from .db import SessionLocal
from .local_llm import healthcheck as ollama_healthcheck

app = FastAPI(title="Aarogya Atlas API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for the demo; tighten for prod
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryReq(BaseModel):
    query: str


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    out: dict[str, Any] = {"api": "ok"}
    try:
        async with SessionLocal() as s:
            n = (await s.execute(text("SELECT count(*) FROM fhir_location"))).scalar_one()
            out["facilities"] = int(n)
            ns = (await s.execute(text("SELECT count(*) FROM fhir_healthcareservice"))).scalar_one()
            out["services"] = int(ns)
    except Exception as e:
        out["db_error"] = str(e)
    try:
        out["ollama"] = await ollama_healthcheck()
    except Exception as e:
        out["ollama_error"] = str(e)
    return out


@app.post("/api/query")
async def query(req: QueryReq):
    """SSE stream of trace events + a final answer."""
    async def gen():
        async for evt in stream_answer(req.query):
            yield f"data: {json.dumps(evt)}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/deserts")
async def deserts(specialty: str = "dialysis", state: str | None = None):
    """Return GeoJSON FeatureCollection of district-level medical-desert points.

    Each Feature is a Point at the district centroid (mean lat/lon of facilities
    in that district), with `coverage` (count of facilities offering specialty)
    and `severity` 0..1 (0 = well-covered, 1 = critical desert) for the map
    to render as red circles.
    """
    keyword_map = {
        "dialysis":  ["dialysis", "hemodialysis", "haemodialysis", "renal"],
        "oncology":  ["oncolog", "cancer", "chemotherapy"],
        "trauma":    ["trauma", "emergency", "casualty", "accident"],
        "icu":       ["icu", "intensive care", "ccu", "nicu", "picu"],
        "cardiac":   ["cardio", "cathlab", "angio"],
        "neonatal":  ["neonat", "nicu", "newborn"],
    }
    keywords = keyword_map.get(specialty.lower(), [specialty.lower()])
    likes_in_raw = " OR ".join(
        [f"l.raw::text ILIKE :kw{i}" for i in range(len(keywords))]
    )
    likes_in_svc = " OR ".join(
        [f"s.name ILIKE :kw{i}" for i in range(len(keywords))]
    )
    params: dict[str, Any] = {f"kw{i}": f"%{kw}%" for i, kw in enumerate(keywords)}
    state_filter = ""
    if state:
        state_filter = "AND l.address_state = :state"
        params["state"] = state

    sql = f"""
    WITH cov AS (
      SELECT l.address_district, l.address_state,
             COUNT(*) AS total_facilities,
             AVG(l.latitude) AS c_lat, AVG(l.longitude) AS c_lon,
             SUM(
               CASE WHEN ({likes_in_raw}) OR EXISTS (
                 SELECT 1 FROM fhir_healthcareservice s
                 WHERE s.location_id = l.id AND ({likes_in_svc})
               ) THEN 1 ELSE 0 END
             ) AS coverage_count
      FROM fhir_location l
      WHERE l.address_district IS NOT NULL {state_filter}
      GROUP BY l.address_district, l.address_state
      HAVING COUNT(*) >= 3
    )
    SELECT address_district, address_state, total_facilities,
           coverage_count, c_lat, c_lon
    FROM cov
    ORDER BY (coverage_count::float / NULLIF(total_facilities, 0)) ASC,
             total_facilities DESC
    LIMIT 200
    """
    async with SessionLocal() as session:
        rows = (await session.execute(text(sql), params)).mappings().all()

    features = []
    for r in rows:
        total = r["total_facilities"] or 0
        cov = r["coverage_count"] or 0
        ratio = (cov / total) if total else 1.0
        # severity: 1.0 when zero coverage despite many facilities; 0 when well-covered
        if ratio == 0 and total >= 3:
            severity = min(1.0, 0.4 + total / 100)
        elif ratio < 0.05:
            severity = 0.55
        elif ratio < 0.20:
            severity = 0.30
        else:
            severity = 0.0
        if severity == 0.0:
            continue  # skip well-covered districts
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["c_lon"], r["c_lat"]]},
            "properties": {
                "district": r["address_district"],
                "state": r["address_state"],
                "total_facilities": total,
                "coverage": cov,
                "coverage_ratio": round(ratio, 3),
                "severity": round(severity, 2),
                "specialty": specialty,
            },
        })
    return {"type": "FeatureCollection", "features": features, "specialty": specialty}


@app.get("/api/facilities")
async def list_facilities(state: str | None = None, limit: int = 100):
    """Return facilities for the map. Optional state filter."""
    sql = """
    SELECT id, name, address_district, address_state, latitude, longitude,
           array(SELECT name FROM fhir_healthcareservice s WHERE s.location_id = l.id) AS services
    FROM fhir_location l
    """
    params: dict[str, Any] = {"limit": limit}
    if state:
        sql += " WHERE address_state = :state"
        params["state"] = state
    sql += " LIMIT :limit"
    async with SessionLocal() as s:
        rows = (await s.execute(text(sql), params)).mappings().all()
    return [dict(r) for r in rows]
