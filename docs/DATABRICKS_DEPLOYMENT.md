# Aarogya Atlas — Databricks Production Deployment

The local development stack is a faithful, dependency-aligned mirror of how
this system would deploy on Databricks. Every local component has a direct
1-to-1 production analog.

## Component map

| Local dev (this repo)                          | Databricks production                                            |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| Postgres 17 (`fhir_location`, `fhir_healthcareservice`, `facility_payer`, `facility_status_event`) | **Lakebase** — serverless Postgres, governed by Unity Catalog. Same SQL works unchanged. |
| pgvector HNSW index on `intake_note.embedding` | **Mosaic AI Vector Search** index over a Delta table. `bge-m3` registered as a Databricks-served embedding endpoint. |
| LangGraph supervisor + `ToolNode`              | **Mosaic AI Agent Framework** — the supervisor pattern documented in [Multi-agent supervisor architecture](https://www.databricks.com/blog/multi-agent-supervisor-architecture-orchestrating-enterprise-ai-scale). Tools become Unity Catalog `SQL` and `Python` functions; LangGraph wraps them. |
| Local Ollama (`qwen2.5:32b`, `medgemma:27b`, `bge-m3`) | **Provisioned Throughput Model Serving** — same models, served as Databricks endpoints. PHI inference remains in-VPC. |
| Synthetic intake notes via `seed_synthetic.py` | **Lakeflow Connect** ingestion from hospital EMR → bronze Delta table → silver FHIR-normalised → gold `intake_note` table. |
| OSM Overpass ingestion script                  | Scheduled **Lakeflow** pipeline; ABDM HFR API replaces OSM as the authoritative facility source. |
| Haversine SQL helper                           | Built-in Databricks `H3` functions; spatial indexes on H3 cells. |
| `/api/query` SSE endpoint                      | **Model Serving** endpoint exposing the agent; **MLflow tracing** captures every step, **Agent Evaluation** scores against a ground-truth eval set. |
| Per-request agent state (in-memory)            | **Lakebase** key-value tables for agent memory and conversation history. |

## Why this design respects PHI

The FHIR boundary is enforced at every layer:

1. **Ingest:** PHI never leaves the hospital network. The agent's
   capability-extraction tool (`extract_capabilities_from_note`) runs on a
   **Mosaic Provisioned Throughput** endpoint inside the hospital's VPC.
   In local dev, this is the Ollama call to `medgemma:27b` on the same host.
2. **Storage:** PHI-containing free text stays in the silver layer with
   Unity Catalog row-level filters. The gold `intake_note` table stores
   only de-identified summaries + their embedding vectors.
3. **Inference:** The supervisor (Claude / Mosaic-served Llama) only ever
   sees the gold layer. The reasoning trace surfaced to the user contains
   no raw PHI.

In local dev the equivalent guarantee is simpler: the supervisor model
runs in the cloud, but every call to `extract_capabilities_from_note` and
`semantic_intake_search` routes to **Ollama on the same machine**. Patient
text never crosses the network boundary.

## Migration cost (local → Databricks)

| Step | Effort |
| ---- | ------ |
| `schema.sql` → Unity Catalog DDL | ~2 hours, mostly type-mapping |
| `ingest_osm.py` → Lakeflow notebook job | ~1 hour |
| `tools.py` → Unity Catalog SQL/Python functions | ~3 hours |
| `agent.py` → Mosaic Agent Framework with MLflow tracing | ~4 hours |
| Ollama → Provisioned Throughput endpoints | ~1 hour |
| **Total** | **~11 hours** for a single-engineer port |

## Why we did not deploy to Databricks for the hackathon

A 24-hour build cannot include credential provisioning, Unity Catalog
setup, and Lakeflow pipeline configuration without burning the demo
window. The local stack is intentionally chosen so that the production
port is mechanical, not architectural.
