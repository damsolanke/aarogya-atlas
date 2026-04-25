# Aarogya Atlas

**An agentic, FHIR-native healthcare facility intelligence system for India.**

Submitted to **Hack-Nation 2026 · Challenge 3 (Databricks): *Building Agentic
Healthcare Maps for 1.4 Billion Lives***.

**Live in Databricks** (workspace `dbc-12ce3b55`):
- **Unity Catalog**: `workspace.aarogya.facilities` (10k rows) · `workspace.aarogya_raw.intake_notes` (PHI-masked column on `patient_phone`) · `workspace.aarogya_curated.facility_capability_summary` (NGO analytics view)
- **Genie Space** `01f140dda3fb1760aec5551e9e0e527c` — verified NL→SQL: "top 5 states + cardiology breakdown" → Maharashtra (1506) · UP (1058) · Gujarat (838) with auto bar chart
- **MLflow experiment** `/Shared/aarogya-atlas` — every supervisor turn + tool call as a nested span (`runs_on=device|host` attribute)
- **Mosaic AI Vector Search** endpoint `aarogya_vs` + Delta Sync Index `workspace.aarogya.facilities_idx` with managed `databricks-bge-large-en` embeddings (queried via `/api/2.0/vector-search/indexes/.../query`)
- **Foundation Models API**: 20+ pre-provisioned endpoints (`databricks-bge-large-en`, `databricks-gte-large-en`, GPT-5.x, Llama 4, Qwen 3) — embedding model used by the Vector Search index above

**Spec stretches and research areas — coverage**:

| Spec | Status | Where |
|---|---|---|
| Agentic Traceability (row + step citations) | ✅ | `trust_score` returns evidence snippet per flag · MLflow span tree per turn |
| Self-Correction Loop (Validator Agent) | ✅ | `validate_recommendation` returns PASS/WARN/FAIL with source-text snippet |
| Dynamic Crisis Mapping (deserts by district) | ✅ | `/api/deserts?specialty=dialysis` + red severity halos on map |
| Confidence Scoring / prediction intervals | ✅ | `trust_score` returns `trust_score_ci_80=[low,high]` based on source completeness + flag-severity bootstrap |
| Mosaic AI Vector Search | ✅ | Endpoint + Delta Sync Index live in workspace |
| MLflow 3 observability | ✅ | Experiment `/Shared/aarogya-atlas` |
| Genie | ✅ | Genie Space over the facilities table |
| Unity Catalog | ✅ | 3 schemas (`aarogya`, `aarogya_raw`, `aarogya_curated`) + column mask UDF |
| VF Pydantic schema | ✅ | Mirrored in `apps/api/aarogya_api/vf_schema/` |
| Multi-attribute reasoning | ✅ | 12 tools coordinated by Claude Opus 4.7 supervisor |
| Trust Scorer (spec example: surgery without anesthesia) | ✅ | `trust_score` rule `advanced_surgery_no_anesthesia` — verbatim spec example |

> *In rural India, a postal code can determine a lifespan. We turn the 10,000-record
> Virtue Foundation dataset of Indian medical facilities into a living intelligence
> network — with a Trust Scorer that flags contradictions in the messy source data,
> a Medical Desert detector for NGO planners, multilingual semantic search, and
> on-device PHI extraction. The agent ranks options by total ₹ cost + travel time,
> not just kilometres.*

## What's different

| The default submission | Aarogya Atlas |
| --- | --- |
| Streamlit + GPT-4 + Folium | Next.js 16 + React 19 + MapLibre + Claude Opus 4.7 |
| Sends free text to OpenAI | **PHI extraction runs on Apple Silicon** via Ollama (Qwen 2.5 32B + bge-m3); the supervisor uses Claude Opus 4.7 with adaptive thinking — see PHI scope notes below |
| Static facility list | **FHIR R4 Location + HealthcareService** + per-facility Trust Score with cited evidence |
| Distance-only ranking | **Total ₹ cost + travel time** (KSRTC bus + MGNREGA wage-loss heuristics) |
| English-only | English / हिंदी / தமிழ் via bge-m3 multilingual embeddings |
| "Find hospitals near me" | "Where in Bihar is dialysis coverage weakest?" → ranked districts with NGO-actionable next steps |

## Spec coverage (Discovery 35% · IDP 30% · Social Impact 25% · UX 10%)

| Spec requirement | Implementation | Tool |
| --- | --- | --- |
| Massive Unstructured Extraction | bge-m3 embeddings over the VF unstructured fields (description, specialties, procedure, equipment, capability) | `semantic_intake_search` |
| Multi-Attribute Reasoning | Supervisor coordinates 11 tools: location → capability → hours → payer → status → cost → trust → validate | `agent.py` |
| **Trust Scorer** (spec example: "Claims Surgery but no Anesthesiologist") | 7 clinical contradiction rules + 4 metadata signals → 0–100 score with cited evidence | `trust_score` |
| Medical Desert detection (Oncology / Dialysis / Trauma) | District-level coverage gaps for high-acuity specialties | `find_medical_deserts` |
| Truth Gap reasoning | `validate_recommendation` re-checks supervisor claims against source text | `validate_recommendation` |
| Chain-of-Thought transparency | Adaptive-thinking summaries surfaced as styled trace blocks; on-device tools tagged with cyan badge | `apps/web/src/components/TraceStep.tsx` |

## Architecture

```
                     +----------------------------+
                     |  Local Ollama (M4 Max)     |
                     |  - Qwen 2.5 32B (extract)  |
                     |  - bge-m3 (1024d embed)    |
                     +----------------------------+
                              ^         ^
            on-device tool    |         |  embeddings
            (PHI-safe)        |         |
+-----------------+   +------------------+   +-------------------+
| Web / SMS UI    |--->  Supervisor     |---|  Postgres 17 +    |
| Next.js + React |   |  Claude Opus 4.7|   |  pgvector         |
| MapLibre + deck |   |  adaptive think |   |  (Lakebase analog)|
+-----------------+   +------------------+   +-------------------+
                              |
                              v
            +---------------------------------------+
            | 11 tools: geocode · facility_search   |
            | extract_capabilities_from_note (PHI)  |
            | check_hours · status_feed             |
            | semantic_intake_search (PHI)          |
            | estimate_journey · total_out_of_pocket|
            | trust_score · find_medical_deserts    |
            | validate_recommendation               |
            +---------------------------------------+
```

The agent loop is a **manual streaming loop** in `apps/api/aarogya_api/agent.py` —
no LangGraph, no LangChain. It uses the official Anthropic Python SDK directly,
streams via `messages.stream()`, preserves thinking signature blocks across turns,
and exposes events via Server-Sent Events to the Next.js frontend.

The local stack is a faithful mirror of a Databricks Lakehouse deployment:
**Lakebase** (Postgres) → **Mosaic AI Vector Search** (bge-m3 index) →
**Mosaic AI Agent Framework** (the same tool contract) →
**MLflow 3 Tracing** (per-turn observability).
See [`docs/DATABRICKS_DEPLOYMENT.md`](docs/DATABRICKS_DEPLOYMENT.md).

### Live in our Databricks workspace right now

| Resource | What it proves |
| --- | --- |
| **`workspace.aarogya.facilities`** (Unity Catalog Delta table, 10,000 rows) | The full VF dataset is loaded into Lakehouse. Schema mirrors `apps/api/db/schema.sql`. |
| **`workspace.aarogya_raw.intake_notes`** with `mask_phone` UDF on `patient_phone` | PHI governance — admins see full numbers, others see `+91-XXXXX12345`. The Catalog Explorer page shows the **Column mask** badge live. |
| **`workspace.aarogya_curated.facility_capability_summary`** | De-identified analytics view derived from raw — `has_dialysis`, `has_cardiology`, `has_oncology`, `has_trauma`, `has_icu`, `has_neonatal` boolean flags per facility. |
| **Genie Space `01f140dda3fb1760aec5551e9e0e527c`** ("Indian Healthcare Facilities Data") | Verified working with NL→SQL: "top 5 states by facilities and cardiology breakdown" → Maharashtra (1,506; 78 cardio) · UP (1,058; 56) · Gujarat (838; 37) · Tamil Nadu (630; 28) · Kerala (597; 14), with auto-generated bar chart. This is the spec's "actionable insights for NGO planners" (Social Impact 25%) demonstrably hit. |
| **MLflow Experiment `/Shared/aarogya-atlas`** | Every supervisor turn + every tool execution is recorded as a span. `tool.semantic_intake_search` + `tool.extract_capabilities_from_note` carry the `runs_on=device` attribute so judges can audit the on-device PHI claim. |

## On-device PHI scope (honest about limits)

What's actually on-device today:
- Free-text extraction from intake notes (`extract_capabilities_from_note` → Qwen on Ollama)
- Multilingual embeddings (`semantic_intake_search` → bge-m3 on Ollama)

What is *not* on-device today:
- The user's natural-language query, which goes to Anthropic Claude Opus 4.7

For an enterprise deployment (e.g. inside a hospital VPC), the supervisor would
move to **Mosaic AI Model Serving** with the same OSS weights, keeping the
trust boundary intact. See `docs/DATABRICKS_DEPLOYMENT.md` for the full mapping.

## Repository layout

```
apps/
  web/                Next.js 16 + React 19 + MapLibre frontend
  api/                FastAPI + Anthropic SDK + Ollama backend
    aarogya_api/
      agent.py        Supervisor: streaming + tool loop
      tools.py        Geo + cost + hours + status + semantic-search tools
      trust.py        Trust Scorer + Medical Desert + Validator
      app.py          FastAPI + SSE
      local_llm.py    Ollama wrapper
      db.py / settings.py
    db/schema.sql     FHIR-R4-aligned schema (Location + HealthcareService + intake_note + status_event)
scripts/
  ingest_vf.py        Loads VF_Hackathon_Dataset_India_Large.xlsx → Postgres
docs/
  SUMMARY.md          150–300 word project summary (submission artifact)
  DATABRICKS_DEPLOYMENT.md   Production port mapping
LICENSE               MIT
```

## Running locally

Prerequisites: Postgres 17 + pgvector (`brew install postgresql@17 pgvector`),
Ollama (with `qwen2.5:32b-instruct-q4_K_M` and `bge-m3` pulled), Node 20+, Python 3.13+.

```bash
# 1. DB schema
createdb aarogya
psql -d aarogya -c "CREATE EXTENSION vector;"
psql -d aarogya -f apps/api/db/schema.sql

# 2. Ingest the VF dataset (10k facilities, ~10-15 min for embeddings)
python scripts/ingest_vf.py

# 3. Backend
cd apps/api && uv sync && uv run uvicorn aarogya_api.app:app --reload

# 4. Frontend
cd apps/web && pnpm install && pnpm dev

# Open http://localhost:3000
```

Configure `apps/api/.env` with `ANTHROPIC_API_KEY` and `DATABASE_URL`.
A template lives at `apps/api/.env.example`.

## Submission artifacts

- Public repo (this) + MIT license
- Project summary (150–300w): [`docs/SUMMARY.md`](docs/SUMMARY.md)
- Databricks deployment plan: [`docs/DATABRICKS_DEPLOYMENT.md`](docs/DATABRICKS_DEPLOYMENT.md)
- 60s demo video: *recording day-of submission*
- 60s tech video: *recording day-of submission*

Built in 24 hours for Hack-Nation 2026.
