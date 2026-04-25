# Aarogya Atlas — Project Summary

**Hack-Nation 2026 · Challenge 3 (Databricks): Building Agentic Healthcare Maps for 1.4 Billion Lives**

In rural India, a postal code can determine a lifespan. Families travel hours to a
clinic only to learn the dialysis machine broke yesterday, the cardiologist isn't in
on Tuesdays, or the listing of Ayushman Bharat coverage was outdated. **Aarogya
Atlas reduces Discovery-to-Care time** — turning the 10,000-record Virtue Foundation
dataset of Indian medical facilities into a living intelligence network that NGO
planners, ASHA workers, and families can query in their own language and trust.

**The Trust Scorer is the spec made real.** A dedicated tool flags suspicious or
incomplete data using clinical contradiction rules — *Claims Advanced Surgery but
no Anesthesiologist* (the spec example, verbatim), *Claims ICU without
critical-care staff*, *200 beds with 0 doctors listed*, and seven more — plus soft
metadata signals (stale listings, missing operator type). Every recommendation
carries a 0–100 trust score with cited evidence snippets. A separate **Validator**
tool re-checks high-stakes claims against the source text before the agent
finalises an answer.

**Medical Desert detection** lets an NGO planner ask *"where in Bihar is dialysis
coverage weakest?"* and get a ranked district list within seconds — the
spec's social-impact ask, ready to ship to a state NHM dashboard.

**Multi-Attribute Reasoning at the user's edge.** The supervisor (Claude Opus
4.7, adaptive thinking, with `output_config.effort: high`) coordinates eleven
tools. PHI extraction and multilingual semantic search (Hindi, Tamil, English,
bge-m3 embeddings) run on **Apple Silicon via Ollama** — patient text never
leaves the device. The agent ranks options by total **₹ cost + travel time**
(MGNREGA wage-loss + KSRTC bus fare heuristics), not just kilometres, and replies
in three tiers — *Best match · Closest payer-eligible · Backup* — with a single
"Call X first" sentence and Hindi phrasing the family can use.

**Architected for Databricks.** Local Postgres + pgvector mirrors **Lakebase**;
the agent contract ports unchanged to **Mosaic AI Agent Framework**, vector
search to **Mosaic AI Vector Search**, observability to **MLflow 3 Tracing**.

10,000 facilities · 92,630 services · 11 tools · Trust Scorer · Medical Desert ·
Validator · multilingual · cost-aware · on-device PHI. Built in 24 hours.
