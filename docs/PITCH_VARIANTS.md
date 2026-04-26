# Pitch variants — copy-paste ready

5 lengths for different submission fields, social posts, Discord, demo intro.

---

## 50 chars (Twitter/X handle bio, badge subtitle)

> Agentic healthcare maps for 1.4B people.

(40 chars; fits.)

## 100 chars (cards, OG description, Slack subhead)

> Trust-scored, cost-aware, multilingual healthcare facility intelligence for India — with on-device PHI.

(101 chars; tight.)

## 200 chars (submission tagline, README subtitle, LinkedIn first line)

> Aarogya Atlas turns the Virtue Foundation's 10,000-facility India dataset into a queryable, trust-scored, agentic recommender — 12 tools, on-device PHI, ₹+travel-time ranking, district-level deserts.

(200 chars; perfect.)

## 500 chars (project summary, hackathon submission "About", Devpost short)

> In rural India, a postal code can decide a lifespan. Aarogya Atlas reduces Discovery-to-Care time: a GPT-OSS-120B (Groq) agent with 12 tools (parallel fan-out) ranks facilities by Trust Score + total ₹ cost + travel time, surfaces contradictions in messy source data, validates each recommendation against source text, and publishes its own equity audit (ICU 7.7× disparate impact). On-device Qwen 2.5 32B keeps PHI local. Live in Databricks: Mosaic AI VS, Genie, UC mask UDF, MLflow per-tool spans. EN/HI/TA verified.

(534 chars — trim or expand based on field.)

## 1500 chars (long submission description, blog post)

> **Hack-Nation 2026 Challenge 3 (Databricks): Building Agentic Healthcare Maps for 1.4 Billion Lives.**
>
> In rural India, families travel hours only to learn the dialysis machine broke yesterday or the brochure's Ayushman Bharat coverage was outdated. **Aarogya Atlas reduces Discovery-to-Care time** by turning the 10,000-facility Virtue Foundation dataset into a trust-scored agentic intelligence network for ASHA workers, NGO planners, and families.
>
> The agent — GPT-OSS-120B (Groq) with adaptive thinking, manual streaming loop, parallel `asyncio.gather` tool fan-out (-22% wall-clock) — coordinates **12 tools**: geocode, facility_search, on-device PHI extraction (Qwen 2.5 32B), multilingual semantic search (bge-m3), Mosaic AI Vector Search, journey + cost estimators (KSRTC bus + MGNREGA wage-loss), Trust Scorer (7 contradiction rules + 80% bootstrap CI), Validator agent (PASS/WARN/FAIL with cited evidence), find_medical_deserts. Clinical-pathway routing (CEmONC vs BEmONC, antivenom species coverage by region) applied before generic search.
>
> **Live in Databricks** (`dbc-12ce3b55`): Mosaic AI VS Delta Sync Index verified end-to-end ("cardiology Bengaluru ECG" → Bright Hospital, Aruna Diagnostics, Dr Balaji Natarajan); Unity Catalog with PHI Column-mask UDF; Genie Space NL→SQL verified ("top 5 states + cardiology breakdown" → Maharashtra 1506, UP 1058); MLflow 23 traces with `runs_on=device` tag for on-device tools.
>
> **Auditable**: 12-query eval (mean 31.7s, 0 errors, 11 of 12 tools used) + DAS-style adversarial robustness eval. **Equity audit** publishes our own disparate-impact ratios (ICU 7.7×, Dialysis 7.0×) plus a counterfactual policy slider ("if we add 10 CEmONC beds in Patna → ~70 maternal deaths averted/yr"). EN · हिंदी · தமிழ்.

(1495 chars; perfect.)

---

## Discord handle blurb

> Working on Aarogya Atlas — Challenge 3. Mosaic AI VS + on-device PHI + 12-tool agent. Live demo: http://localhost:3000 — would love feedback.

## 30-second demo intro

> Hi, I'm [name]. Aarogya Atlas — Sanskrit *aarogya*, "complete wellness". We turn India's Virtue Foundation 10,000-facility dataset into an agentic recommender that ranks by Trust Score + total ₹ cost + travel time. 12 tools, parallel fan-out, on-device PHI. Live in Databricks. Watch it find an ECG clinic in Bengaluru in six tool calls, including the exact words to ask the receptionist.

## 5-minute pitch outline (if invited to finals)

1. **Problem (45 sec)** — postal code = lifespan; story of one family
2. **Live demo (90 sec)** — ECG query → answer card → map → comparison page
3. **The differentiation (60 sec)** — Trust Scorer + on-device PHI + counterfactual planner; vs ChatGPT/Maps 14/0/0
4. **Databricks integration (45 sec)** — UC + Genie + Mosaic VS + MLflow, all live
5. **Equity audit (30 sec)** — name our own bias (ICU 7.7×); counterfactual slider
6. **Path to scale (30 sec)** — Mosaic AI Model Serving inside hospital VPC
