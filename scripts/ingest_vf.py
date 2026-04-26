"""Ingest the Virtue Foundation Hack-Nation 2026 dataset.

VF_Hackathon_Dataset_India_Large.xlsx → Postgres `fhir_location` +
`fhir_healthcareservice` + `intake_note` (with bge-m3 embeddings of the
unstructured text fields the spec calls "deep unstructured notes":
description, specialties, procedure, equipment, capability).

Replaces OSM Overpass as the authoritative source per the official
Hack-Nation Challenge 3 brief.
"""

from __future__ import annotations

import asyncio
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)
from sqlalchemy import text

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

from aarogya_api.db import SessionLocal  # noqa: E402
from aarogya_api.local_llm import embed  # noqa: E402

import os

XLSX_PATH = Path(
    os.environ.get(
        "VF_DATASET_PATH",
        ROOT / "data" / "raw" / "VF_Hackathon_Dataset_India_Large.xlsx",
    )
)

console = Console()


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def _clean(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    s = str(v).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a", "na"}:
        return None
    return s


def _split_listy(s: str | None) -> list[str]:
    """Many columns hold JSON-array-as-string OR comma/semicolon lists."""
    if not s:
        return []
    s = s.strip()
    # try JSON
    if s.startswith("[") and s.endswith("]"):
        try:
            arr = json.loads(s)
            return [str(x).strip() for x in arr if str(x).strip()]
        except Exception:
            pass
    # split on common delimiters
    parts = re.split(r"[;,|]\s*", s)
    return [p.strip() for p in parts if p.strip()]


def _row_to_facility(row: pd.Series) -> dict[str, Any] | None:
    name = _clean(row.get("name"))
    if not name:
        return None
    lat = row.get("latitude")
    lon = row.get("longitude")
    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None

    facility_type = _clean(row.get("facilityTypeId")) or "facility"
    fid = f"vf-{int(row.name)}"  # row.name = pandas index

    addr_parts = [
        _clean(row.get("address_line1")),
        _clean(row.get("address_line2")),
        _clean(row.get("address_line3")),
    ]
    address_text = ", ".join(p for p in addr_parts if p)

    capacity_raw = _clean(row.get("capacity"))
    try:
        capacity = int(float(capacity_raw)) if capacity_raw else None
    except ValueError:
        capacity = None

    n_docs_raw = _clean(row.get("numberDoctors"))
    try:
        n_docs = int(float(n_docs_raw)) if n_docs_raw else None
    except ValueError:
        n_docs = None

    return {
        "id": fid,
        "source": "vf",
        "source_id": str(int(row.name)),
        "name": name,
        "type_arr": [facility_type],  # asyncpg binds Python list as TEXT[]
        "address_line": address_text or None,
        "address_city": _clean(row.get("address_city")),
        "address_district": _clean(row.get("address_city")),  # VF lacks district
        "address_state": _clean(row.get("address_stateOrRegion")),
        "address_postal_code": _clean(row.get("address_zipOrPostcode")),
        "latitude": lat,
        "longitude": lon,
        "phone": _clean(row.get("officialPhone")) or _clean(row.get("phone_numbers")),
        "raw_json": json.dumps({
            "operator_type": _clean(row.get("operatorTypeId")),
            "year_established": _clean(row.get("yearEstablished")),
            "capacity_beds": capacity,
            "doctors_listed": n_docs,
            "facility_type_id": facility_type,
            "social_signals": {
                "fb_followers": _safe_int(row.get("engagement_metrics_n_followers")),
                "post_count": _safe_int(row.get("post_metrics_post_count")),
                "page_recency_days": _safe_int(row.get("recency_of_page_update")),
                "facts_count": _safe_int(row.get("number_of_facts_about_the_organization")),
                "affiliated_staff_listed": _safe_bool(row.get("affiliated_staff_presence")),
            },
            "fields": {
                "specialties": _split_listy(_clean(row.get("specialties"))),
                "procedure": _split_listy(_clean(row.get("procedure"))),
                "equipment": _split_listy(_clean(row.get("equipment"))),
                "capability": _split_listy(_clean(row.get("capability"))),
                "description": _clean(row.get("description")),
            },
        }),
    }


def _safe_int(v: Any) -> int | None:
    try:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return None
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _safe_bool(v: Any) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    if s in {"true", "yes", "1"}:
        return True
    if s in {"false", "no", "0"}:
        return False
    return None


def _row_to_services(facility_id: str, row: pd.Series) -> list[dict[str, Any]]:
    """Each capability/specialty/procedure becomes a HealthcareService row."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for col in ("specialties", "capability", "procedure"):
        for item in _split_listy(_clean(row.get(col))):
            key = item.lower().strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append({
                "facility_id": facility_id,
                "name": item,
                "speciality": item if col == "specialties" else None,
                "category": col,
            })
    return out


def _row_to_intake_text(row: pd.Series) -> str | None:
    """Concatenate the unstructured fields into a single 'intake note' for embedding."""
    parts: list[str] = []
    for col in ("description", "specialties", "procedure", "equipment", "capability"):
        v = _clean(row.get(col))
        if v:
            parts.append(f"{col.upper()}: {v}")
    n_docs = _safe_int(row.get("numberDoctors"))
    capacity = _safe_int(row.get("capacity"))
    if n_docs is not None:
        parts.append(f"DOCTORS_LISTED: {n_docs}")
    if capacity is not None:
        parts.append(f"CAPACITY: {capacity} beds")
    if not parts:
        return None
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

UPSERT_LOCATION = """
INSERT INTO fhir_location (
    id, source, source_id, name, type, address_line, address_city,
    address_district, address_state, address_postal_code,
    latitude, longitude, phone, raw
) VALUES (
    :id, :source, :source_id, :name, :type_arr,
    :address_line, :address_city, :address_district, :address_state,
    :address_postal_code, :latitude, :longitude, :phone,
    CAST(:raw_json AS JSONB)
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    address_line = EXCLUDED.address_line,
    address_city = EXCLUDED.address_city,
    address_district = EXCLUDED.address_district,
    address_state = EXCLUDED.address_state,
    address_postal_code = EXCLUDED.address_postal_code,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    phone = EXCLUDED.phone,
    raw = EXCLUDED.raw
"""

INSERT_SERVICE = """
INSERT INTO fhir_healthcareservice
    (location_id, name, speciality, category, evidence_source, confidence)
VALUES
    (:facility_id, :name, :speciality, :category, 'vf-dataset', 0.9)
"""

INSERT_NOTE = """
INSERT INTO intake_note (location_id, text, language, embedding)
VALUES (:location_id, :text, :language, CAST(:embedding AS vector))
"""

WIPE_OLD = [
    "DELETE FROM fhir_healthcareservice",
    "DELETE FROM intake_note WHERE location_id LIKE 'osm-%' OR location_id LIKE 'vf-%'",
    "DELETE FROM facility_status_event WHERE location_id LIKE 'osm-%' OR location_id LIKE 'vf-%'",
    "DELETE FROM facility_payer WHERE location_id LIKE 'osm-%' OR location_id LIKE 'vf-%'",
    "DELETE FROM fhir_location WHERE id LIKE 'osm-%' OR id LIKE 'vf-%'",
]


async def ingest():
    console.log(f"Reading {XLSX_PATH.name}")
    df = pd.read_excel(XLSX_PATH)
    console.log(f"Loaded {len(df):,} rows")

    facilities: list[dict[str, Any]] = []
    services: list[dict[str, Any]] = []
    intake_payloads: list[tuple[str, str]] = []  # (facility_id, text)

    for _, row in df.iterrows():
        f = _row_to_facility(row)
        if not f:
            continue
        facilities.append(f)
        services.extend(_row_to_services(f["id"], row))
        note = _row_to_intake_text(row)
        if note:
            intake_payloads.append((f["id"], note))

    console.log(
        f"Parsed {len(facilities):,} valid facilities, "
        f"{len(services):,} services, {len(intake_payloads):,} intake-note candidates"
    )

    async with SessionLocal() as session:
        async with session.begin():
            for sql in WIPE_OLD:
                await session.execute(text(sql))
        console.log("Wiped previous OSM/VF rows")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("{task.completed}/{task.total}"),
            TimeElapsedColumn(),
            console=console,
        ) as progress:
            t1 = progress.add_task("Upserting facilities", total=len(facilities))
            BATCH = 500
            async with session.begin():
                for i in range(0, len(facilities), BATCH):
                    chunk = facilities[i : i + BATCH]
                    for f in chunk:
                        await session.execute(text(UPSERT_LOCATION), f)
                    progress.update(t1, advance=len(chunk))

            t2 = progress.add_task("Inserting services", total=len(services))
            async with session.begin():
                for i in range(0, len(services), BATCH):
                    chunk = services[i : i + BATCH]
                    if chunk:
                        await session.execute(text(INSERT_SERVICE), chunk)
                    progress.update(t2, advance=len(chunk))

            # Embed in batches; bge-m3 is fast on M-series GPU.
            t3 = progress.add_task("Embedding intake notes", total=len(intake_payloads))
            EMBED_BATCH = 32
            async with session.begin():
                for i in range(0, len(intake_payloads), EMBED_BATCH):
                    chunk = intake_payloads[i : i + EMBED_BATCH]
                    texts = [c[1] for c in chunk]
                    vecs = await embed(texts)
                    rows = [
                        {
                            "location_id": fid,
                            "text": txt[:4000],  # safety cap
                            "language": "en",
                            "embedding": str(vec),
                        }
                        for (fid, txt), vec in zip(chunk, vecs)
                    ]
                    await session.execute(text(INSERT_NOTE), rows)
                    progress.update(t3, advance=len(chunk))

    console.log(
        f"[bold green]Ingest complete[/]: {len(facilities):,} facilities, "
        f"{len(services):,} services, {len(intake_payloads):,} embedded notes"
    )


if __name__ == "__main__":
    asyncio.run(ingest())
