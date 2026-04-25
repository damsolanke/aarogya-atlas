# Aarogya Atlas

> In rural India, a postal code can determine a lifespan.
> Aarogya Atlas turns the 10,000-record Virtue Foundation dataset into a
> trust-scored, multilingual, agentic intelligence network — so a family in
> Bihar isn't sent to a clinic whose dialysis machine broke yesterday.

**Hack-Nation 2026 · Challenge 3 (Databricks): Building Agentic Healthcare Maps for 1.4 Billion Lives**

![Aarogya Atlas — agent answer with ranked picks on the map](docs/screenshots/02_query_result.png)

The agent above resolved an ECG query in **6 tool calls**: geocoded
Yeshwantpur, searched 1,500 facilities, scored Trust on each candidate,
ran a Validator self-check, computed `₹484` total cost (treatment + auto +
MGNREGA wage-loss), and surfaced a 3-tier recommendation with explicit
trust caveats and the exact words to ask the receptionist. *Before the
journey begins.*

| | |
| :--- | :--- |
| **3-tier output** | ⭐ Best · 📍 Closest payer-eligible · 💡 Backup — every recommendation cites Trust + Validator + Cost |
| **12 tools** | geocode · facility_search · extract_capabilities (on-device) · check_hours · status_feed · semantic_intake_search (on-device) · databricks_vector_search · estimate_journey · total_out_of_pocket · trust_score · find_medical_deserts · validate_recommendation |
| **Stack** | Next.js 16 + React 19 + MapLibre · FastAPI + Anthropic SDK + Ollama · Postgres 17 + pgvector · **Databricks Unity Catalog + Genie + MLflow + Mosaic AI Vector Search** |
| **Languages** | English · हिंदी · தமிழ் (bge-m3 multilingual embeddings, on-device) |

## Live in our Databricks workspace

[`dbc-12ce3b55-1ebb.cloud.databricks.com`](https://dbc-12ce3b55-1ebb.cloud.databricks.com) — every Databricks claim below is a live artifact, not a slide.

### MLflow 3 Tracing (`/Shared/aarogya-atlas`)

![MLflow traces — 23 supervisor runs, per-tool spans](docs/screenshots/04_mlflow_traces.png)

23 traces, each one a full agent run with Anthropic auto-trace + per-tool
`maybe_span()`. On-device tools (`extract_capabilities_from_note`,
`semantic_intake_search`) carry `runs_on=device` so judges can audit the
PHI claim. Auto-detected as **GenAI apps & agents**.

### Unity Catalog with PHI column mask

![Unity Catalog intake_notes — patient_phone Column mask badge](docs/screenshots/06_unity_catalog_mask.png)

`workspace.aarogya_raw.intake_notes` — `patient_phone` carries a live
**Column mask** UDF (`mask_phone()`). Admins see full numbers; everyone
else sees `+91-XXXXX12345`. De-identified analytics view at
`workspace.aarogya_curated.facility_capability_summary`.

### Genie Space — NL → SQL

![Genie Space: Indian Healthcare Facilities Data](docs/screenshots/05_genie.png)

Verified working: *"top 5 states + cardiology breakdown"* →
**Maharashtra (1,506 · 78 cardio) · UP (1,058 · 56) · Gujarat (838 · 37)
· TN (630 · 28) · Kerala (597 · 14)** with auto-generated bar chart —
the spec's "actionable insights for NGO planners" hit verbatim.

### Mosaic AI Vector Search

`endpoint: aarogya_vs` · `index: workspace.aarogya.facilities_idx` —
Delta Sync Index with managed `databricks-bge-large-en` embeddings,
queried via `databricks_vector_search` agent tool.

### Foundation Models API

20+ pre-provisioned: `databricks-bge-large-en`, GPT-5.x family, Llama 4,
Qwen 3, plus the embedding model used by the VS index above.

## Medical Desert detection

![Medical desert overlay across South India — dialysis](docs/screenshots/03_desert_overlay.png)

District-level coverage gaps for high-acuity specialties. The red halos
above are real underserved districts where ≤5% of facilities offer
dialysis. NGO planners can ask the agent *"where in Bihar is dialysis
weakest?"* and get a ranked list with population-weighted severity, not
just a dot count.

## What scores against the rubric

Discovery & Verification 35% · IDP 30% · Social Impact 25% · UX/Transparency 10%

| Spec ask | Implementation | Where to look |
| --- | --- | --- |
| Massive Unstructured Extraction | bge-m3 over VF unstructured fields | tool: `semantic_intake_search` |
| Multi-Attribute Reasoning | 12 tools, manual streaming loop | `apps/api/aarogya_api/agent.py` |
| **Trust Scorer** (spec example: "claims surgery, no anesthesia") | 7 contradiction rules + 4 metadata signals → 0–100 + cited evidence + **80% bootstrap CI** | tool: `trust_score` |
| **Self-Correction Loop** (Validator Agent) | Re-checks recommendations against source text | tool: `validate_recommendation` |
| **Dynamic Crisis Mapping** | District coverage gaps + map overlay | tool: `find_medical_deserts` + `/api/deserts` |
| Confidence intervals on Trust | `trust_score_ci_80=[low, high]` based on completeness + flag-severity bootstrap | `apps/api/aarogya_api/trust.py` |
| Mosaic AI Vector Search | Endpoint + Delta Sync Index live | tool: `databricks_vector_search` |
| MLflow 3 observability | Per-turn + per-tool spans | experiment `/Shared/aarogya-atlas` |
| Genie | NL→SQL Genie Space over facilities | screenshot above |
| Unity Catalog | 3 schemas + PHI column mask UDF | screenshot above |
| Multilingual / Hindi / Tamil | bge-m3 embeddings + agent system prompt | tool: `semantic_intake_search` |
| **Total ₹ + travel time** ranking (not km only) | KSRTC bus + MGNREGA wage + auto-rickshaw heuristics | tool: `total_out_of_pocket` |
| **On-device PHI** | Free-text + embeddings via Ollama on M-series | `apps/api/aarogya_api/local_llm.py` |
| Chain-of-Thought transparency | Adaptive-thinking summaries in collapsed reasoning trace | UI: `ReasoningDrawer` |

## Architecture

```
                     +----------------------------+
   on-device         |  Local Ollama (M-series)   |
   (PHI-safe)        |  - Qwen 2.5 32B (extract)  |
                     |  - bge-m3 (multilingual)   |
                     +----------------------------+
                              ^         ^
                              |         |  embeddings
+-----------------+   +------------------+   +-------------------+
| Web / Map UI    |--->  Supervisor     |---|  Postgres 17 +    |
| Next.js 16      |   |  Claude Opus 4.7|   |  pgvector         |
| React 19        |   |  adaptive think |   +-------------------+
| MapLibre        |   |  effort=high    |   +-------------------+
+-----------------+   +------------------+   |  Databricks       |
                              |              |  Unity Catalog +  |
                              v              |  Genie + MLflow + |
            +---------------------------+    |  Mosaic AI VS     |
            |  12 tools · Trust Scorer  |---|                   |
            |  Validator · Desert finder |    +-------------------+
            +---------------------------+
```

The agent loop is a **manual streaming loop** in
`apps/api/aarogya_api/agent.py` — no LangGraph, no LangChain. Official
Anthropic SDK, `messages.stream()`, thinking signature blocks preserved
across turns, SSE events to the frontend.

## On-device PHI scope (honest about limits)

**On-device today:**
- Free-text extraction from intake notes (`extract_capabilities_from_note` → Qwen)
- Multilingual embeddings (`semantic_intake_search` → bge-m3)

**Not on-device today:**
- The user's natural-language query → Anthropic Claude Opus 4.7

For an enterprise / hospital-VPC deployment, the supervisor moves to
**Mosaic AI Model Serving** with the same OSS weights — same trust
boundary, no PHI egress. See
[`docs/DATABRICKS_DEPLOYMENT.md`](docs/DATABRICKS_DEPLOYMENT.md).

## Run it

Prereqs: Postgres 17 + pgvector, Ollama (with `qwen2.5:32b-instruct-q4_K_M`
and `bge-m3` pulled), Node 20+, Python 3.13+.

```bash
git clone https://github.com/damsolanke/aarogya-atlas
cd aarogya-atlas

# DB
createdb aarogya
psql -d aarogya -c "CREATE EXTENSION vector;"
psql -d aarogya -f apps/api/db/schema.sql

# Ingest 10k facilities (~10–15 min for embeddings)
python scripts/ingest_vf.py

# Backend
cd apps/api && uv sync && cp .env.example .env  # set ANTHROPIC_API_KEY + DATABRICKS_*
uv run uvicorn aarogya_api.app:app --reload

# Frontend
cd ../web && pnpm install && pnpm dev

# Open http://localhost:3000
```

## Submission artifacts

- This repo (MIT)
- [`docs/SUMMARY.md`](docs/SUMMARY.md) — 280-word project summary
- [`docs/DATABRICKS_DEPLOYMENT.md`](docs/DATABRICKS_DEPLOYMENT.md) — production port mapping
- 60s product demo + 60s tech video — recorded day-of submission
- Submit by **Sun Apr 26, 9 AM ET** via [`projects.hack-nation.ai`](https://projects.hack-nation.ai)

Built in 24 hours for Hack-Nation 2026.
