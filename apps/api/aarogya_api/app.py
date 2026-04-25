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
