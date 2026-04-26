"""Stand up a Unity Catalog table in the Databricks workspace from the VF dataset.

Creates `workspace.aarogya.facilities` (Delta), populates it from
VF_Hackathon_Dataset_India_Large.xlsx, and prints a Genie-ready schema
description.

Run: uv run python scripts/databricks_setup.py
"""

from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))
load_dotenv(ROOT / "apps" / "api" / ".env")

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

WAREHOUSE_ID = "cd736c1a76fdb9bb"
CATALOG = "workspace"
SCHEMA = "aarogya"
TABLE = f"{CATALOG}.{SCHEMA}.facilities"
XLSX = os.environ.get(
    "VF_DATASET_PATH",
    str(ROOT / "data" / "raw" / "VF_Hackathon_Dataset_India_Large.xlsx"),
)


def _clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = str(v).strip()
    return None if not s or s.lower() in {"nan", "none", "null"} else s


def _safe_int(v):
    try:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return None
        return int(float(v))
    except (TypeError, ValueError):
        return None


def main():
    client = WorkspaceClient()

    print(f"Creating schema {CATALOG}.{SCHEMA}…")
    _exec(client, f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA} COMMENT 'Aarogya Atlas — Hack-Nation 2026 Challenge 3'")

    print(f"Dropping existing {TABLE}…")
    _exec(client, f"DROP TABLE IF EXISTS {TABLE}")

    print("Creating facilities table…")
    _exec(client, f"""
    CREATE TABLE {TABLE} (
      facility_id STRING NOT NULL,
      name STRING,
      facility_type STRING,
      operator_type STRING,
      address_city STRING,
      address_state STRING,
      address_postal_code STRING,
      latitude DOUBLE,
      longitude DOUBLE,
      phone STRING,
      year_established STRING,
      capacity_beds INT,
      doctors_listed INT,
      description STRING,
      specialties STRING,
      procedures STRING,
      equipment STRING,
      capability STRING,
      fb_followers INT,
      page_recency_days INT
    ) USING DELTA
    COMMENT 'Virtue Foundation 10k Indian healthcare facilities — Hack-Nation 2026 Challenge 3'
    """)

    print(f"Reading {XLSX}…")
    df = pd.read_excel(XLSX)
    print(f"Loaded {len(df):,} rows. Inserting in batches…")

    rows = []
    for idx, row in df.iterrows():
        name = _clean(row.get("name"))
        try:
            lat = float(row.get("latitude"))
            lon = float(row.get("longitude"))
        except (TypeError, ValueError):
            continue
        if not name or not (-90 <= lat <= 90):
            continue
        rows.append({
            "facility_id": f"vf-{idx}",
            "name": name,
            "facility_type": _clean(row.get("facilityTypeId")),
            "operator_type": _clean(row.get("operatorTypeId")),
            "address_city": _clean(row.get("address_city")),
            "address_state": _clean(row.get("address_stateOrRegion")),
            "address_postal_code": _clean(row.get("address_zipOrPostcode")),
            "latitude": lat,
            "longitude": lon,
            "phone": _clean(row.get("officialPhone")),
            "year_established": _clean(row.get("yearEstablished")),
            "capacity_beds": _safe_int(row.get("capacity")),
            "doctors_listed": _safe_int(row.get("numberDoctors")),
            "description": (_clean(row.get("description")) or "")[:1000],
            "specialties": (_clean(row.get("specialties")) or "")[:1000],
            "procedures": (_clean(row.get("procedure")) or "")[:1000],
            "equipment": (_clean(row.get("equipment")) or "")[:1000],
            "capability": (_clean(row.get("capability")) or "")[:1000],
            "fb_followers": _safe_int(row.get("engagement_metrics_n_followers")),
            "page_recency_days": _safe_int(row.get("recency_of_page_update")),
        })
    print(f"Prepared {len(rows):,} valid rows.")

    BATCH = 200
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        values_sql = ",\n".join(_row_to_sql(r) for r in chunk)
        _exec(client, f"INSERT INTO {TABLE} VALUES {values_sql}", silent=True)
        if (i // BATCH) % 10 == 0:
            print(f"  inserted {i + len(chunk):,} / {len(rows):,}")

    print("Done. Verifying counts…")
    n = _exec(client, f"SELECT COUNT(*) FROM {TABLE}")
    print(f"  {TABLE}: {n}")

    print(f"\nUI: https://dbc-12ce3b55-1ebb.cloud.databricks.com/explore/data/{CATALOG}/{SCHEMA}/facilities")


def _row_to_sql(r: dict) -> str:
    parts = []
    for v in r.values():
        if v is None:
            parts.append("NULL")
        elif isinstance(v, (int, float)):
            parts.append(str(v))
        else:
            s = str(v).replace("\\", "\\\\").replace("'", "''")
            parts.append(f"'{s}'")
    return "(" + ",".join(parts) + ")"


def _exec(client: WorkspaceClient, sql: str, silent: bool = False):
    resp = client.statement_execution.execute_statement(
        warehouse_id=WAREHOUSE_ID,
        statement=sql,
        wait_timeout="30s",
    )
    sid = resp.statement_id
    state = resp.status.state
    while state in (StatementState.PENDING, StatementState.RUNNING):
        import time
        time.sleep(1)
        resp = client.statement_execution.get_statement(sid)
        state = resp.status.state
    if state == StatementState.FAILED:
        err = resp.status.error.message if resp.status.error else "(unknown)"
        raise RuntimeError(f"SQL failed: {err}\n--SQL--\n{sql[:500]}")
    if not silent and resp.result and resp.result.data_array:
        return resp.result.data_array[0][0] if resp.result.data_array else None
    return None


if __name__ == "__main__":
    main()
