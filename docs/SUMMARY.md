# Aarogya Atlas — Project Summary

**Hack-Nation 2026 · Challenge 3 (Databricks): Agentic Healthcare Maps**

In rural India, a postal code can determine a lifespan. Families travel four
hours by bus to a clinic only to learn the dialysis machine broke yesterday,
the cardiologist isn't in on Tuesdays, or the brochure that listed Ayushman
Bharat coverage was outdated. We turn 8,504 messy hospital records into a
living intelligence network that answers in the family's own language and
ranks facilities by what they can actually reach and afford — not just by
distance on a map.

**The contrarian moat: every layer runs on-device.** Patient text — intake
notes, queries — is processed by Qwen 2.5 32B and MedGemma 27B locally on
Apple Silicon. bge-m3 generates multilingual embeddings (Hindi, Tamil,
English) for a pgvector store, also locally. The supervisor agent uses
Claude Opus 4.7 with adaptive thinking, with PHI extraction tools strictly
bound to the local models. **Zero PHI egress, full stop** — a claim no
cloud-only competitor in this hackathon can make.

**The agent reasons about reality, not just geography.** Eight tools:
geocoding, FHIR-normalised facility search, on-device capability extraction
from messy notes, hours/payer/live-status checks, semantic search across
multilingual intake notes, an honest journey-cost heuristic (KSRTC bus +
MGNREGA wage prorate), and a total-out-of-pocket calculator. Output is
always three-tiered: **Best match · Closest payer-eligible · Backup** — a
single ASHA-worker-readable card with concrete next-step phrasing in Hindi.

**Architecture mirrors Databricks Lakehouse.** Postgres + pgvector locally;
LangGraph-style supervisor pattern; FHIR R4 Location + HealthcareService;
designed to deploy unchanged onto Databricks Lakebase + Mosaic AI Agent
Framework + Vector Search.

8,504 facilities indexed across Karnataka. Live demo, 60s tech video,
working agent. Built in 24 hours.
