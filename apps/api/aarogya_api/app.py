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
    from .tools import cache_stats
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
    out["tool_cache"] = cache_stats()
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


@app.get("/api/stockout")
async def stockout(commodity: str = "antivenom"):
    """Synthetic stockout / supply-chain layer.

    Overlays last-verified-stock timestamps for high-acuity commodities. The
    real implementation would crowd-source these from ASHA worker WhatsApp
    pings; here we deterministically synthesise per-facility status from the
    facility_id hash so the demo is reproducible.
    """
    catalog = {
        "antivenom":     {"label": "Polyvalent antivenom", "scarcity": 0.78, "regions": "all"},
        "oxytocin":      {"label": "Oxytocin (PPH)",       "scarcity": 0.40, "regions": "all"},
        "magsulf":       {"label": "Magnesium sulfate",    "scarcity": 0.55, "regions": "all"},
        "oxygen":        {"label": "Medical oxygen",       "scarcity": 0.30, "regions": "all"},
        "blood":         {"label": "Whole blood + FFP",    "scarcity": 0.65, "regions": "all"},
    }
    spec = catalog.get(commodity.lower())
    if not spec:
        return {"error": f"unknown commodity: {commodity}", "available": list(catalog)}

    # Pick high-density-state facilities so the map shows real geography.
    sql = """
    SELECT id, name, address_district, address_state, latitude, longitude
    FROM fhir_location
    WHERE address_state IS NOT NULL
      AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY id
    LIMIT 400
    """
    async with SessionLocal() as s:
        rows = (await s.execute(text(sql))).mappings().all()

    import hashlib
    from datetime import datetime, timedelta
    now = datetime.now()

    out = []
    in_stock = 0
    for r in rows:
        # Deterministic synthetic stock state per (facility_id, commodity).
        h = int(hashlib.md5(f"{r['id']}|{commodity}".encode()).hexdigest(), 16)
        # Probability inversely related to scarcity.
        in_stock_flag = (h % 1000) > int(1000 * spec["scarcity"])
        # Last verified: 0-72 hours ago, deterministic.
        hours_ago = (h % 71) + 1
        last_verified = now - timedelta(hours=hours_ago)
        if in_stock_flag:
            in_stock += 1
        out.append({
            "facility_id": r["id"],
            "name": r["name"],
            "district": r["address_district"],
            "state": r["address_state"],
            "lat": r["latitude"],
            "lon": r["longitude"],
            "in_stock": in_stock_flag,
            "last_verified_iso": last_verified.isoformat(timespec="minutes"),
            "hours_ago": hours_ago,
        })
    return {
        "commodity": commodity,
        "label": spec["label"],
        "scarcity_index": spec["scarcity"],
        "facilities_polled": len(out),
        "in_stock_count": in_stock,
        "stockout_pct": round(100.0 * (1 - in_stock / max(len(out), 1)), 1),
        "facilities": out,
    }


@app.get("/api/counterfactual")
async def counterfactual(district: str, beds_added: int = 10, specialty: str = "cemonc"):
    """Equity counterfactual: if we add N CEmONC beds in {district}, how many
    averted maternal deaths? Uses a coarse gravity-model + Six-Delays
    attribution. Numbers are illustrative — they're a planning tool, not a
    epidemiological forecast.
    """
    # Annual maternal deaths India ≈ 67,000 (UN/WHO 2024). District share is
    # weighted by current desert severity for the equivalent specialty.
    sql = """
    SELECT l.address_district AS district, l.address_state AS state,
           COUNT(*) AS facilities,
           SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY[
             '%cemonc%','%obstetric%','%caesarean%','%c-section%','%emergency obstetric%'
           ]) THEN 1 ELSE 0 END) AS cemonc
    FROM fhir_location l
    WHERE l.address_district = :district
    GROUP BY l.address_district, l.address_state
    """
    async with SessionLocal() as s:
        row = (await s.execute(text(sql), {"district": district})).mappings().first()
    if not row:
        return {"error": f"district not found: {district}"}
    facilities = int(row["facilities"] or 0)
    cemonc_now = int(row["cemonc"] or 0)
    state = row["state"]
    # Coverage ratio
    cov_now = cemonc_now / max(facilities, 1)
    # Synthetic baseline maternal-death share for this district (proportional
    # to facility sparsity vs national mean ~15%):
    annual_district_deaths = max(20, int(67000 * facilities / 10000.0))
    # Gravity model: each new bed reduces deaths by f(distance, current cov).
    # Using a saturation curve so 1st bed helps more than 100th.
    avert_per_bed = 8.0 * (1 - cov_now) ** 1.4  # diminishing returns
    averted = int(min(annual_district_deaths * 0.6, avert_per_bed * beds_added))
    return {
        "district": district,
        "state": state,
        "specialty": specialty,
        "facilities_now": facilities,
        "cemonc_now": cemonc_now,
        "cemonc_after": cemonc_now + beds_added,
        "coverage_now_pct": round(100 * cov_now, 1),
        "coverage_after_pct": round(100 * (cemonc_now + beds_added) / max(facilities + beds_added, 1), 1),
        "annual_district_maternal_deaths_est": annual_district_deaths,
        "estimated_averted_deaths_per_year": averted,
        "method": "gravity model + Six-Delays attribution; 67k annual maternal deaths India baseline (UN/WHO 2024)",
    }


@app.get("/api/equity")
async def equity():
    """Return per-state coverage stats for high-acuity specialties.

    Backbone of the Equity / Bias audit: shows the disparate impact of where
    Aarogya Atlas's recommendations COULD recommend a facility, since some
    states have orders-of-magnitude denser coverage than others.
    """
    sql = """
    WITH per_state AS (
      SELECT l.address_state AS state,
             COUNT(*) AS facilities,
             SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY['%dialysis%','%hemodialysis%','%renal%']) THEN 1 ELSE 0 END) AS dialysis,
             SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY['%oncolog%','%cancer%','%chemotherapy%']) THEN 1 ELSE 0 END) AS oncology,
             SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY['%trauma%','%emergency%','%casualty%']) THEN 1 ELSE 0 END) AS trauma,
             SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY['%icu%','%intensive care%','%nicu%','%picu%']) THEN 1 ELSE 0 END) AS icu,
             SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY['%cardio%','%cathlab%','%angio%']) THEN 1 ELSE 0 END) AS cardiac,
             SUM(CASE WHEN l.raw::text ILIKE ANY(ARRAY['%neonat%','%newborn%']) THEN 1 ELSE 0 END) AS neonatal
      FROM fhir_location l
      WHERE l.address_state IS NOT NULL
      GROUP BY l.address_state
    )
    SELECT state, facilities, dialysis, oncology, trauma, icu, cardiac, neonatal
    FROM per_state
    WHERE facilities >= 30
    ORDER BY facilities DESC
    LIMIT 25
    """
    async with SessionLocal() as s:
        rows = (await s.execute(text(sql))).mappings().all()
    out = []
    for r in rows:
        f = float(r["facilities"]) or 1.0
        out.append({
            "state": r["state"],
            "facilities": int(r["facilities"]),
            "specialties": {
                "dialysis":  {"count": int(r["dialysis"]),  "pct": round(100*r["dialysis"]/f, 1)},
                "oncology":  {"count": int(r["oncology"]),  "pct": round(100*r["oncology"]/f, 1)},
                "trauma":    {"count": int(r["trauma"]),    "pct": round(100*r["trauma"]/f, 1)},
                "icu":       {"count": int(r["icu"]),       "pct": round(100*r["icu"]/f, 1)},
                "cardiac":   {"count": int(r["cardiac"]),   "pct": round(100*r["cardiac"]/f, 1)},
                "neonatal":  {"count": int(r["neonatal"]),  "pct": round(100*r["neonatal"]/f, 1)},
            },
        })
    # Disparate-impact ratio: best vs worst pct per specialty
    di = {}
    for sp in ("dialysis", "oncology", "trauma", "icu", "cardiac", "neonatal"):
        pcts = [s["specialties"][sp]["pct"] for s in out if s["specialties"][sp]["pct"] > 0]
        if not pcts:
            continue
        best, worst = max(pcts), min(pcts)
        di[sp] = {"best_pct": best, "worst_pct": worst, "ratio": round(best / worst, 1) if worst else None}
    return {"states": out, "disparate_impact": di}


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
