"""Provision Unity Catalog raw/curated schemas with a PHI column-mask demo.

After databricks_setup.py has populated workspace.aarogya.facilities, this:
  - Creates `workspace.aarogya_raw.intake_notes` (PHI-bearing) with a
    column-mask UDF on `patient_phone` so only members of `admins` see
    the full number; other roles see `+91-XXXXX12345`.
  - Creates `workspace.aarogya_curated.facility_capability_summary` —
    the de-identified analytics view derived from the raw table.

Demonstrates the spec's PHI governance ask using Free Edition primitives.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))
load_dotenv(ROOT / "apps" / "api" / ".env")

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

WAREHOUSE_ID = "cd736c1a76fdb9bb"

STATEMENTS = [
    'CREATE SCHEMA IF NOT EXISTS workspace.aarogya_raw COMMENT "PHI-restricted raw notes layer — Hack-Nation 2026 Challenge 3"',
    'CREATE SCHEMA IF NOT EXISTS workspace.aarogya_curated COMMENT "De-identified analytics layer for NGO planners"',
    'DROP TABLE IF EXISTS workspace.aarogya_raw.intake_notes',
    """CREATE TABLE workspace.aarogya_raw.intake_notes (
        note_id BIGINT,
        facility_id STRING,
        patient_phone STRING,
        note STRING,
        language STRING,
        recorded_at TIMESTAMP
    ) USING DELTA
    COMMENT 'PHI-bearing intake notes — patient_phone masked at read time'""",
    """CREATE OR REPLACE FUNCTION workspace.aarogya_raw.mask_phone(p STRING)
    RETURNS STRING
    RETURN CASE WHEN is_account_group_member('admins') THEN p
                ELSE CONCAT('+91-XXXXX', RIGHT(p, 5)) END""",
    """ALTER TABLE workspace.aarogya_raw.intake_notes
       ALTER COLUMN patient_phone SET MASK workspace.aarogya_raw.mask_phone""",
    """INSERT INTO workspace.aarogya_raw.intake_notes VALUES
       (1, 'vf-1705', '+919812345678', 'Pt 54M c/o chest pain x 2 days. ECG done — sinus tachy. Referred for echo.', 'en', current_timestamp()),
       (2, 'vf-3263', '+919876543210', 'मरीज को बुखार और खांसी 5 दिन से। X-ray मशीन खराब है। टीबी की जांच के लिए जिला अस्पताल भेजा।', 'hi', current_timestamp()),
       (3, 'vf-5763', '+918765432109', 'Patient on dialysis 3x/week. Awaiting renal transplant. Insurance: Ayushman Bharat.', 'en', current_timestamp())""",
    'DROP TABLE IF EXISTS workspace.aarogya_curated.facility_capability_summary',
    """CREATE TABLE workspace.aarogya_curated.facility_capability_summary AS
       SELECT
         facility_id, name, address_state, address_city, address_postal_code,
         latitude, longitude,
         CASE WHEN capability ILIKE '%dialysis%' OR specialties ILIKE '%dialysis%' THEN TRUE ELSE FALSE END AS has_dialysis,
         CASE WHEN capability ILIKE '%cardio%' OR specialties ILIKE '%cardio%' THEN TRUE ELSE FALSE END AS has_cardiology,
         CASE WHEN capability ILIKE '%oncolog%' OR specialties ILIKE '%oncolog%' THEN TRUE ELSE FALSE END AS has_oncology,
         CASE WHEN capability ILIKE '%trauma%' OR capability ILIKE '%emergency%' OR capability ILIKE '%casualty%' THEN TRUE ELSE FALSE END AS has_trauma,
         CASE WHEN capability ILIKE '%icu%' OR capability ILIKE '%intensive%' THEN TRUE ELSE FALSE END AS has_icu,
         CASE WHEN capability ILIKE '%neonat%' OR specialties ILIKE '%neonat%' THEN TRUE ELSE FALSE END AS has_neonatal,
         capacity_beds, doctors_listed,
         page_recency_days
       FROM workspace.aarogya.facilities""",
    """COMMENT ON TABLE workspace.aarogya_curated.facility_capability_summary IS
       'De-identified facility capability matrix for NGO planners — no PHI'""",
]


def main():
    client = WorkspaceClient()
    for i, sql in enumerate(STATEMENTS, 1):
        print(f"[{i}/{len(STATEMENTS)}] {sql.split(chr(10))[0][:80]}...")
        resp = client.statement_execution.execute_statement(
            warehouse_id=WAREHOUSE_ID, statement=sql, wait_timeout="30s"
        )
        sid = resp.statement_id
        state = resp.status.state
        while state in (StatementState.PENDING, StatementState.RUNNING):
            time.sleep(1)
            resp = client.statement_execution.get_statement(sid)
            state = resp.status.state
        if state == StatementState.FAILED:
            err = resp.status.error.message if resp.status.error else "(unknown)"
            print(f"   ✗ FAILED: {err[:300]}")
        else:
            print(f"   ✓ {state}")
    print("\nDone. Verify in Catalog Explorer:")
    print("  https://dbc-12ce3b55-1ebb.cloud.databricks.com/explore/data/workspace/aarogya_raw")
    print("  https://dbc-12ce3b55-1ebb.cloud.databricks.com/explore/data/workspace/aarogya_curated")


if __name__ == "__main__":
    main()
