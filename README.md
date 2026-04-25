# Aarogya Atlas

**An on-device, FHIR-native healthcare facility intelligence agent for India.**

Submitted to Hack-Nation 2026, Challenge 3 (Databricks): *Agentic Healthcare Maps*.

> *In India, a postal code can determine a lifespan. We turn 10,000 messy hospital records into a living intelligence network — running entirely on the user's device, with zero PHI egress, accessible via voice, web, or SMS on a $30 phone.*

## Why this is different

| The default submission | Aarogya Atlas |
| --- | --- |
| Streamlit + GPT-4 + Folium map | Next.js + LangGraph + on-device LLM (Qwen 2.5 32B / MedGemma) |
| Sends PHI to OpenAI | Zero PHI egress; clinical reasoning on Apple Silicon |
| Static facility list | FHIR R4 Location + HealthcareService + live capability ledger |
| English-only chat UI | Hindi/Tamil voice, web, and SMS rails |
| "Find hospitals near me" | "Where can my mother get an ECG within 2 hours by bus, open now, that takes Ayushman Bharat?" |

## Architecture

Designed for deployment on **Databricks Lakebase + Mosaic AI Agent Framework + Vector Search + Unity Catalog**. Local development uses Postgres 17 + pgvector as the Lakebase analog.

```
                                                  +----------------------+
       Voice / Web / SMS query                    |  Local Ollama (M4)   |
                |                                  |  - Qwen 2.5 32B      |
                v                                  |  - MedGemma 27B      |
       +-------------------+      tool call        |  - bge-m3 (embed)    |
       |  Supervisor agent | --------------------> +----------------------+
       |  (LangGraph +     |                              |
       |   Claude Opus 4.7)|                              |  PHI extraction
       +-------------------+                              |  + reasoning
                |
                v
       +------------------------------+
       |  Tool registry               |
       |  - facility_geo_search       |  pgvector + PostGIS
       |  - capability_extract        |  local LLM over messy notes
       |  - hours_check               |  rule-based
       |  - payer_check               |  Ayushman Bharat / private / cash
       |  - status_feed               |  crowdsourced "machine working today"
       +------------------------------+
```

## Repository layout

```
apps/
  web/        Next.js 15 + React 19, deploys to Vercel
  api/        FastAPI + LangGraph supervisor agent
packages/
  shared/     TypeScript + Pydantic types (FHIR-aligned)
scripts/
  ingest_osm.py        OpenStreetMap Overpass -> FHIR Location
  generate_notes.py    Synthetic intake notes via local Ollama
  seed_db.py           Postgres + pgvector seeding
data/
  sample/     committed sample (10 facilities, 5 notes)
docs/
  ARCHITECTURE.md
  DATABRICKS_DEPLOYMENT.md
```

## Submission artifacts

- 60s demo video: `docs/demo.mp4`
- 60s tech video: `docs/tech.mp4`
- Project summary (150-300w): `docs/SUMMARY.md`
- Public repo + MIT license: this file
- Zipped code: `submission.zip`

Built in 24 hours for Hack-Nation 2026.
