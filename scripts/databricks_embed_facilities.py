"""Embed all 10k VF facilities via Databricks Foundation Models BGE endpoint
and store as a Delta vector table for similarity retrieval.

Free Edition workaround for Mosaic AI Vector Search: instead of a managed
endpoint (blocked on Free), we use the pre-provisioned `databricks-bge-large-en`
foundation-model serving endpoint to compute embeddings, store them in
`workspace.aarogya.facility_embeddings` (ARRAY<FLOAT>), and query via
Databricks SQL `array_distance(...)` for cosine similarity. Same retrieval
contract; production swap to a managed delta-sync index is a one-line change.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))
load_dotenv(ROOT / "apps" / "api" / ".env")

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

WAREHOUSE_ID = "cd736c1a76fdb9bb"
HOST = os.environ["DATABRICKS_HOST"]
TOKEN = os.environ["DATABRICKS_TOKEN"]
EMBED_ENDPOINT = "databricks-bge-large-en"
TABLE = "workspace.aarogya.facility_embeddings"
SOURCE = "workspace.aarogya.facilities"
BATCH = 96  # BGE endpoint accepts batched inputs


def _exec(client: WorkspaceClient, sql: str, *, fetch: bool = True):
    resp = client.statement_execution.execute_statement(
        warehouse_id=WAREHOUSE_ID, statement=sql, wait_timeout="50s"
    )
    sid = resp.statement_id
    state = resp.status.state
    while state in (StatementState.PENDING, StatementState.RUNNING):
        time.sleep(1)
        resp = client.statement_execution.get_statement(sid)
        state = resp.status.state
    if state == StatementState.FAILED:
        err = resp.status.error.message if resp.status.error else "(unknown)"
        raise RuntimeError(f"SQL failed: {err}\n--SQL--\n{sql[:400]}")
    if fetch and resp.result and resp.result.data_array:
        return resp.result.data_array
    return None


async def _embed_batch(client: httpx.AsyncClient, texts: list[str]) -> list[list[float]]:
    resp = await client.post(
        f"{HOST}/serving-endpoints/{EMBED_ENDPOINT}/invocations",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        json={"input": texts},
        timeout=60.0,
    )
    resp.raise_for_status()
    j = resp.json()
    return [d["embedding"] for d in j["data"]]


async def main():
    import asyncio

    ws = WorkspaceClient()

    print(f"Creating {TABLE}...")
    _exec(ws, f"DROP TABLE IF EXISTS {TABLE}", fetch=False)
    _exec(
        ws,
        f"""
        CREATE TABLE {TABLE} (
          facility_id STRING NOT NULL,
          name STRING,
          source_text STRING,
          embedding ARRAY<FLOAT>
        ) USING DELTA
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
        COMMENT 'Mosaic-AI-served BGE embeddings of VF facility descriptions for cosine retrieval via array_distance'
        """,
        fetch=False,
    )

    print(f"Reading source rows from {SOURCE}...")
    rows = _exec(
        ws,
        f"""
        SELECT facility_id, name,
               concat_ws('  ',
                 coalesce(specialties, ''), coalesce(procedures, ''),
                 coalesce(equipment, ''), coalesce(capability, ''),
                 coalesce(description, '')) AS source_text
        FROM {SOURCE}
        WHERE coalesce(length(specialties), 0)
            + coalesce(length(procedures), 0)
            + coalesce(length(capability), 0) > 0
        ORDER BY facility_id
        """,
    )
    rows = [r for r in (rows or []) if r[2] and r[2].strip()]
    print(f"  {len(rows):,} facilities have non-empty source text")

    async with httpx.AsyncClient() as http:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            texts = [r[2][:1500] for r in chunk]
            try:
                vecs = await _embed_batch(http, texts)
            except Exception as e:
                print(f"  batch {i}: ERR {type(e).__name__}: {str(e)[:200]}")
                continue
            # Build a multi-row INSERT. Use SQL VALUES with array literal.
            values_sql = ",\n".join(
                f"('{r[0]}', '{(r[1] or '').replace(chr(39),chr(39)+chr(39))[:200]}', '{(r[2] or '').replace(chr(39),chr(39)+chr(39))[:1000]}', ARRAY({','.join(f'{x:.6f}' for x in v)}))"
                for r, v in zip(chunk, vecs)
            )
            try:
                _exec(ws, f"INSERT INTO {TABLE} VALUES {values_sql}", fetch=False)
            except Exception as e:
                print(f"  insert {i}: ERR {type(e).__name__}: {str(e)[:200]}")
                continue
            done = min(i + BATCH, len(rows))
            print(f"  embedded + inserted {done:,} / {len(rows):,}")

    print()
    n = _exec(ws, f"SELECT COUNT(*) FROM {TABLE}")
    print(f"Final count in {TABLE}: {n[0][0] if n else '?'}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
