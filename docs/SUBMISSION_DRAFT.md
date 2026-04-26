# Submission draft — paste-ready answers

_For projects.hack-nation.ai. Tailored to the 3-axis rubric (Tech Depth + Comm/Presentation + Innovation/Creativity) and the Challenge-3 sponsor weights._

---

## Project name
**Aarogya Atlas**

(आरोग्य · Sanskrit, "the absence of disease, complete wellness")

## Tagline (≤ 50 chars)
Agentic healthcare maps for 1.4B people.

## Tagline (≤ 100 chars)
Trust-scored, cost-aware, multilingual healthcare facility intelligence for India — with on-device PHI.

## One-paragraph description (≤ 200 chars)
Aarogya Atlas turns the Virtue Foundation's 10,000-facility India dataset into a queryable, trust-scored, agentic recommender — 12 tools, on-device PHI, ₹ + travel-time ranking, district-level desert detection.

## Short pitch (≤ 500 chars)
In rural India, a postal code can decide a lifespan. Aarogya Atlas reduces Discovery-to-Care time: an agent (Claude Opus 4.7, 12 tools, parallel fan-out) ranks facilities by trust + total ₹ cost + travel time, surfaces contradictions in the source data, validates each recommendation against source text, and publishes its own equity audit. On-device Qwen 2.5 32B keeps PHI on the device. Live in Databricks: Mosaic AI VS, Genie, Unity Catalog with PHI mask, MLflow per-tool spans. EN/HI/TA verified.

## Long description (≤ 1500 chars)
Hack-Nation 2026 Challenge 3 (Databricks): Building Agentic Healthcare Maps for 1.4 Billion Lives.

In rural India, families travel hours to learn the dialysis machine broke yesterday or the brochure's Ayushman Bharat coverage was outdated. **Aarogya Atlas reduces Discovery-to-Care time** by turning the 10,000-facility Virtue Foundation dataset into a trust-scored agentic intelligence network.

**The agent** (Claude Opus 4.7 with adaptive thinking, manual streaming loop, parallel `asyncio.gather` fan-out) coordinates **12 tools**: geocode, facility_search, on-device PHI extraction (Qwen 2.5 32B), check_hours, status_feed, semantic_intake_search (bge-m3 multilingual), Mosaic AI Vector Search, journey + cost estimators (KSRTC bus + MGNREGA wage-loss + auto-rickshaw), Trust Scorer (7 contradiction rules + 4 metadata signals + 80% bootstrap CI), find_medical_deserts, validate_recommendation. Clinical-pathway routing (CEmONC vs BEmONC, antivenom species coverage by region) applied before generic search.

**Live in Databricks** (`dbc-12ce3b55`): Mosaic AI VS Delta Sync Index, Unity Catalog with PHI Column-mask UDF, Genie Space (NL→SQL verified), MLflow per-tool spans with `runs_on=device` tag.

**Auditable**: 12-query eval (mean 31.7s, 0 errors, 11 of 12 tools used) + DAS-style adversarial robustness eval. Equity audit publishes our own disparate-impact ratios (ICU 7.7×, Dialysis 7.0×) + a counterfactual policy slider ("if we add 10 CEmONC beds in Patna → 70 maternal deaths averted/yr").

EN · हिंदी · தமிழ். Live demo at https://formal-rogers-poster-meanwhile.trycloudflare.com.

## Categories / tags
agent, healthcare, multilingual, on-device-llm, RAG, FHIR, vector-search, equity, trust-scoring, validator, India

## Tech stack
Next.js 16, React 19, MapLibre GL, framer-motion · FastAPI, Anthropic SDK, Ollama (Qwen 2.5 32B + bge-m3), Postgres 17 + pgvector · **Databricks**: Unity Catalog, Genie, MLflow 3, Mosaic AI Vector Search, Foundation Models API · Cloudflare Tunnels for live demo.

## Sponsor track(s)
**Databricks** (Challenge 3 — primary). Cross-applicable: World Bank (equity slice).

## Required URLs

- **Live demo:** https://formal-rogers-poster-meanwhile.trycloudflare.com
- **GitHub:** https://github.com/damsolanke/aarogya-atlas (FLIP TO PUBLIC AT SUBMISSION TIME)
- **60s product video:** TBD (record per `docs/DEMO_SCRIPT.md`)
- **60s tech video:** TBD (record per `docs/DEMO_SCRIPT.md`)
- **Project summary doc:** [docs/SUMMARY.md](https://github.com/damsolanke/aarogya-atlas/blob/main/docs/SUMMARY.md)
- **Architecture page:** https://formal-rogers-poster-meanwhile.trycloudflare.com/architecture
- **Comparison page:** https://formal-rogers-poster-meanwhile.trycloudflare.com/compare
- **Equity audit:** https://formal-rogers-poster-meanwhile.trycloudflare.com/equity
- **Auditable eval:** https://formal-rogers-poster-meanwhile.trycloudflare.com/eval

## Team

[USER TO FILL — names + roles]

## Hub

Hack-Nation hub (or "Online" if remote).

---

## Optional: free-form "What we built"

Same as Long description above, plus:

We built four things competing teams in #challenge-03-databricks didn't ship:
1. **Mosaic AI VS verified end-to-end** (organizer Linn Bieske noted: "no live support for Databricks challenge"; multiple teams blocked).
2. **On-device PHI extraction** that's actually wired into the agent loop (Qwen + bge-m3 via Ollama, MLflow `runs_on=device` tag).
3. **District-level Trust + Counterfactual** — disparate-impact ratios + policy slider ("add N CEmONC beds → averted deaths").
4. **Dynamic adversarial eval** (DAS-style perturbation) reporting static-vs-dynamic robustness gap, not just static accuracy.

## Optional: "Lessons learned"

- Free-edition Mosaic AI VS allows 1 endpoint — we found and used it. Initial pessimism ("Free Edition blocks VS endpoint creation") was wrong; the workaround was just a REST POST, no UI required.
- Parallel `asyncio.gather` over `tool_use` blocks gave a clean 22% wall-clock cut with zero correctness regressions.
- Cloudflare Tunnel beats ngrok for hackathon demos: no browser-warning interstitial, and the URL is shareable verbatim.

## Optional: "What's next"

- WhatsApp + voice-note ASHA-facing channel (real users don't have laptops).
- Live outbound phone verification via Twilio Voice + LLM verifier (the truest form of trust scoring).
- ABDM/ABHA write-back of the referral note as a FHIR R4 bundle.
- Federated PHI extraction across district nodes (FedAvg over LoRA adapters).
