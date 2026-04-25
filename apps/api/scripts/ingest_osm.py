"""Pull healthcare facilities from OpenStreetMap Overpass for an Indian state.

Normalises into FHIR R4 Location + HealthcareService rows. PostGIS-free
(distance is Haversine in SQL). Idempotent: re-runs upsert by (source, source_id).

Run:
    uv run python -m scripts.ingest_osm --state Karnataka
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any, Iterable

import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Allow running as `python scripts/ingest_osm.py` from apps/api
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
from aarogya_api.settings import settings  # noqa: E402

console = Console()

OVERPASS_QUERY = """
[out:json][timeout:300];
area["name"="{state}"]["admin_level"="4"]->.searchArea;
(
  node["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](area.searchArea);
  way["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](area.searchArea);
  node["healthcare"](area.searchArea);
  way["healthcare"](area.searchArea);
);
out center tags;
"""

# OSM tag -> FHIR-style speciality bucket. Conservative subset.
HEALTHCARE_SPECIALITY_MAP = {
    "general":           ("General medicine",       "general"),
    "cardiology":        ("Cardiology",             "specialist"),
    "dialysis":          ("Dialysis",               "specialist"),
    "dentist":           ("Dentistry",              "specialist"),
    "dermatology":       ("Dermatology",            "specialist"),
    "diabetology":       ("Diabetology",            "specialist"),
    "ent":               ("ENT",                    "specialist"),
    "eye":               ("Ophthalmology",          "specialist"),
    "gastroenterology":  ("Gastroenterology",       "specialist"),
    "gynaecology":       ("Gynaecology",            "specialist"),
    "midwife":           ("Midwifery",              "general"),
    "neurology":         ("Neurology",              "specialist"),
    "obstetrics":        ("Obstetrics",             "specialist"),
    "oncology":          ("Oncology",               "specialist"),
    "ophthalmology":     ("Ophthalmology",          "specialist"),
    "orthopaedics":      ("Orthopaedics",           "specialist"),
    "paediatrics":       ("Paediatrics",            "specialist"),
    "pediatrics":        ("Paediatrics",            "specialist"),
    "physiotherapy":     ("Physiotherapy",          "allied"),
    "psychiatry":        ("Psychiatry",             "specialist"),
    "radiology":         ("Radiology",              "diagnostic"),
    "rehabilitation":    ("Rehabilitation",         "allied"),
    "surgery":           ("Surgery",                "specialist"),
    "urology":           ("Urology",                "specialist"),
    "vaccination":       ("Vaccination",            "general"),
    "blood_donation":    ("Blood donation",         "general"),
    "yes":               ("General",                "general"),
}


async def fetch_overpass(state: str) -> list[dict[str, Any]]:
    s = settings()
    query = OVERPASS_QUERY.format(state=state)
    headers = {"User-Agent": s.user_agent, "Accept": "application/json"}
    console.log(f"Querying Overpass for [bold]{state}[/]…")
    async with httpx.AsyncClient(timeout=httpx.Timeout(360.0)) as client:
        r = await client.post(s.overpass_url, data={"data": query}, headers=headers)
        r.raise_for_status()
        elements = r.json().get("elements", [])
    console.log(f"Overpass returned [bold cyan]{len(elements):,}[/] elements")
    return elements


def to_fhir_rows(elements: Iterable[dict[str, Any]], state: str) -> tuple[list, list]:
    """Yield (location_rows, service_rows)."""
    locations: list[dict[str, Any]] = []
    services: list[dict[str, Any]] = []

    for el in elements:
        tags = el.get("tags") or {}
        name = tags.get("name") or tags.get("name:en") or tags.get("operator")
        if not name:
            continue

        if el["type"] == "node":
            lat, lon = el.get("lat"), el.get("lon")
        else:
            center = el.get("center") or {}
            lat, lon = center.get("lat"), center.get("lon")
        if lat is None or lon is None:
            continue

        loc_id = f"osm-{el['type']}-{el['id']}"

        amenity = tags.get("amenity") or tags.get("healthcare") or "facility"
        loc_type = [amenity]

        # Hours
        hours = tags.get("opening_hours")
        hours_json = {"raw": hours} if hours else None

        locations.append({
            "id":              loc_id,
            "source":          "osm",
            "source_id":       f"{el['type']}/{el['id']}",
            "name":            name,
            "status":          "active",
            "type":            loc_type,
            "address_line":    tags.get("addr:street"),
            "address_city":    tags.get("addr:city"),
            "address_district": tags.get("addr:district") or tags.get("addr:suburb"),
            "address_state":   tags.get("addr:state") or state,
            "address_postal_code": tags.get("addr:postcode"),
            "address_country": "IN",
            "latitude":        float(lat),
            "longitude":       float(lon),
            "hours_of_operation": json.dumps(hours_json) if hours_json else None,
            "phone":           tags.get("phone") or tags.get("contact:phone"),
            "raw":             json.dumps(tags),
        })

        # Speciality from `healthcare:speciality` (OSM convention)
        spec_raw = tags.get("healthcare:speciality") or ""
        spec_tokens = [s.strip().lower() for s in spec_raw.split(";") if s.strip()]

        # Also derive a baseline service from the amenity itself
        baseline = {
            "hospital":  ("Inpatient care",  "general"),
            "clinic":    ("Outpatient care", "general"),
            "doctors":   ("General practice","general"),
            "pharmacy":  ("Pharmacy",        "allied"),
        }.get(amenity)
        if baseline:
            services.append({
                "location_id":    loc_id,
                "name":           baseline[0],
                "category":       baseline[1],
                "speciality":     None,
                "evidence_source":"osm-tag",
                "evidence_text":  f"amenity={amenity}",
                "confidence":     0.9,
            })

        for tok in spec_tokens:
            mapping = HEALTHCARE_SPECIALITY_MAP.get(tok)
            if not mapping:
                continue
            services.append({
                "location_id":    loc_id,
                "name":           mapping[0],
                "category":       mapping[1],
                "speciality":     mapping[0],
                "evidence_source":"osm-tag",
                "evidence_text":  f"healthcare:speciality={tok}",
                "confidence":     0.95,
            })

    return locations, services


async def upsert(locations: list[dict], services: list[dict]) -> tuple[int, int]:
    s = settings()
    engine = create_async_engine(s.database_url, future=True)
    inserted_loc = 0
    inserted_svc = 0

    LOC_SQL = text("""
        INSERT INTO fhir_location (
            id, source, source_id, name, status, type,
            address_line, address_city, address_district, address_state,
            address_postal_code, address_country,
            latitude, longitude, hours_of_operation, phone, raw
        ) VALUES (
            :id, :source, :source_id, :name, :status, :type,
            :address_line, :address_city, :address_district, :address_state,
            :address_postal_code, :address_country,
            :latitude, :longitude, CAST(:hours_of_operation AS jsonb), :phone, CAST(:raw AS jsonb)
        )
        ON CONFLICT (source, source_id) DO UPDATE SET
            name        = EXCLUDED.name,
            status      = EXCLUDED.status,
            type        = EXCLUDED.type,
            address_line = EXCLUDED.address_line,
            address_city = EXCLUDED.address_city,
            address_district = EXCLUDED.address_district,
            address_state = EXCLUDED.address_state,
            address_postal_code = EXCLUDED.address_postal_code,
            latitude    = EXCLUDED.latitude,
            longitude   = EXCLUDED.longitude,
            hours_of_operation = EXCLUDED.hours_of_operation,
            phone       = EXCLUDED.phone,
            raw         = EXCLUDED.raw
    """)
    SVC_SQL = text("""
        INSERT INTO fhir_healthcareservice (
            location_id, name, category, speciality, evidence_source, evidence_text, confidence
        ) VALUES (
            :location_id, :name, :category, :speciality, :evidence_source, :evidence_text, :confidence
        )
    """)
    DELETE_OLD_SVC = text("DELETE FROM fhir_healthcareservice WHERE location_id = ANY(:ids)")

    async with engine.begin() as conn:
        with Progress(
            SpinnerColumn(), TextColumn("{task.description}"),
            BarColumn(), TimeElapsedColumn(), console=console
        ) as progress:
            t = progress.add_task("Upserting locations…", total=len(locations))
            CHUNK = 500
            for i in range(0, len(locations), CHUNK):
                chunk = locations[i:i + CHUNK]
                await conn.execute(LOC_SQL, chunk)
                inserted_loc += len(chunk)
                progress.advance(t, len(chunk))

            # Wipe and re-insert services for the touched locations to keep idempotent
            loc_ids = [loc["id"] for loc in locations]
            await conn.execute(DELETE_OLD_SVC, {"ids": loc_ids})

            t2 = progress.add_task("Inserting services…", total=len(services))
            for i in range(0, len(services), CHUNK):
                chunk = services[i:i + CHUNK]
                await conn.execute(SVC_SQL, chunk)
                inserted_svc += len(chunk)
                progress.advance(t2, len(chunk))

    await engine.dispose()
    return inserted_loc, inserted_svc


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default=settings().default_state)
    args = parser.parse_args()

    elements = await fetch_overpass(args.state)
    locations, services = to_fhir_rows(elements, args.state)
    console.log(f"Parsed [bold]{len(locations):,}[/] locations, "
                f"[bold]{len(services):,}[/] services")
    if not locations:
        console.log("[red]No locations parsed — check the state name and Overpass response.")
        return

    nloc, nsvc = await upsert(locations, services)
    console.log(f"[green]Upserted {nloc:,} locations, {nsvc:,} services into Postgres.")


if __name__ == "__main__":
    asyncio.run(main())
