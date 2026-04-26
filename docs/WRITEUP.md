# How I built Aarogya Atlas in 24 hours

_For Hack-Nation 2026 Challenge 3 (Databricks): "Serving A Nation" — the agentic healthcare-mapping challenge for India's 1.4B people._

---

## The story

A family in Bastar gets up at 4 AM, takes a four-hour bus to the district hospital with their elderly father — chest pain, suspected MI. They arrive to find the cardiology consultant is in another city for a wedding. The brochure that said "Ayushman Bharat empanelled" isn't accurate any more. The dialysis machine on the next floor broke yesterday. Now what?

That family's loop is the **Discovery-to-Care** problem. The 10,000-facility Virtue Foundation dataset is the most comprehensive open registry of Indian healthcare facilities — but it's messy, contradictory, and unsearchable for a non-expert. Google Maps gives you distance. ChatGPT gives you generic suggestions. Neither tells you the dialysis machine broke yesterday. Neither says "Trust 65/100" or "Validator WARN — surgery claimed without anesthesia". Neither computes the bus fare PLUS the lost MGNREGA wage. Neither speaks Hindi or Tamil. Neither tells you the words to say to the receptionist.

I had 24 hours.

## What I built

**Aarogya Atlas** (आरोग्य = Sanskrit for "the absence of disease, complete wellness") is an agentic recommender that ranks Indian healthcare facilities by a composite of:
- **Trust Score** with a bootstrap-perturbation 80% confidence interval and cited evidence
- **Total ₹ cost** (treatment + KSRTC bus + auto-rickshaw + MGNREGA wage-loss)
- **Travel time** by an estimator that knows Indian transit
- **Validator verdict** (PASS / WARN / FAIL with source-text snippet)
- **Pathway routing** for clinical specifics (CEmONC vs BEmONC for obstetrics, polyvalent + species coverage for snakebite, SNCU/NICU for neonates, cathlab + thrombolytics for STEMI)

It runs Claude Opus 4.7 with adaptive thinking in a manual streaming loop (no LangGraph), parallel-fans-out the tool calls via `asyncio.gather` (-22% wall-clock), and exposes the entire reasoning trace via Server-Sent Events so a judge can audit *how* it answered.

PHI never touches the cloud. Free-text capability extraction runs on **Qwen 2.5 32B**; multilingual embeddings on **bge-m3**; and the camera-button on the chat bar runs **medgemma 27B vision** locally — drop a wound photo or X-ray, get a 4-second triage with severity and recommended specialty.

## What's actually live in Databricks

- **Mosaic AI Vector Search** (Free Edition) Delta Sync Index over `workspace.aarogya.facilities_idx`, queried via the agent's `databricks_vector_search` tool. Verified end-to-end: "cardiology Bengaluru ECG" returns Bright Hospital, Aruna Diagnostics, Dr Balaji Natarajan in milliseconds.
- **Unity Catalog** with three schemas (`aarogya`, `aarogya_raw`, `aarogya_curated`) and a **Column-mask UDF** on `patient_phone` so admins see full numbers, others see `+91-XXXXX12345`.
- **Genie Space** NL→SQL — *"top 5 states by facilities and cardiology breakdown"* returns Maharashtra (1,506 / 78), UP (1,058 / 56), Gujarat (838 / 37), with an auto-generated bar chart.
- **MLflow 3 Tracing** at `/Shared/aarogya-atlas` with 23 traces — every supervisor turn and every tool call is a span; on-device tools carry the `runs_on=device` attribute so judges can audit the PHI claim.

## We score ourselves in public

Every metric on `/eval` came from `scripts/evaluate.py` running 12 fixed queries (English / Hindi / Tamil, NGO planner / patient / trust scoring / desert detection / edge cases) against the live agent. Latest run:
- Mean wall-clock **31.7s** (P95 49.5s) — 22% faster than the sequential baseline
- 0 errors across 12 queries
- 11 of 12 tools invoked across the run
- Validator verdicts: **2 PASS · 4 WARN · 0 FAIL** — the system surfaces uncertainty rather than going silent

Plus a **DAS-style adversarial robustness eval** ([npj Digital Medicine 2026 methodology](https://www.nature.com/articles/s41746-026-02443-6)). Honest finding: we hold 100% on the canonical queries but drop to 50% under perturbation — and the 50% gap is *graceful refusal* on queries that lose location entirely ("Pediatric ICU — urgent"). I'd rather refuse than guess a city.

## We name our own bias

The `/equity` page publishes the disparate-impact ratios baked into the source data: **ICU 7.7×**, **Dialysis 7.0×**, Neonatal 5.4× between best and worst Indian states. When a query lands in a low-coverage state, the agent surfaces this in the "Honest data gap" section instead of pretending it has a recommendation.

A **counterfactual policy slider** answers the question a state health-mission CIO actually asks: *"if we add 10 CEmONC beds in Patna, how many maternal deaths would that avert?"* Gravity-model + Six-Delays attribution against the UN/WHO 2024 67k baseline → ~70 averted deaths/year.

## What it's like to use

- Click the camera button on the chat bar
- Drop a photo of a wound, X-ray, prescription, oxygen-cylinder gauge, or snake
- 4 seconds later: a severity-coded triage card appears, the input pre-fills with a derived facility query, you press send
- The agent geocodes, pulls the 12 tools in parallel, computes the cost, scores the trust, runs the validator, surfaces the trade-offs
- You get a 3-tier card (Best · Closest payer-eligible · Backup) with the **exact words to ask the receptionist** in the user's language ("*Aap ECG karte ho? Aaj khula hai? Ayushman Bharat card chalega?*")
- A pulsing red halo on the map shows you that the district you're in has 0% dialysis coverage — your agent is recommending across district boundaries because it has to

## Lessons from 24 hours

- **Free-edition Mosaic AI Vector Search allows 1 endpoint.** Initial pessimism ("Free Edition blocks VS endpoint creation") was wrong. The workaround was a single REST POST. Multiple competing teams in `#challenge-03-databricks` are still blocked on this; I shipped end-to-end.
- **Parallel `asyncio.gather` over `tool_use` blocks** gave a clean 22% wall-clock cut with zero correctness regressions. The supervisor naturally calls 3-4 independent tools per turn; running them sequentially was leaving 50% of latency on the table.
- **Cloudflare Tunnel beats ngrok for hackathon demos** — no browser-warning interstitial. Judges can click the URL and use the agent immediately, on mobile or desktop.
- **Trust Score with a bootstrap CI is more honest than a point estimate.** Telling a judge "Trust 65/100 (CI 50-95)" is a different message from "Trust 65/100." We narrow the CI on facilities with denser source records.
- **medgemma 27B is the only Ollama-served model in the Gemma3 family with vision capability.** It's medical-tuned. Triaging a synthetic snake-bite image returned `severity=moderate, specialty=snakebite` in ~4 seconds. No cloud egress.

## What's next (post-submission)

- WhatsApp + voice ASHA-facing channel (real users don't have laptops; ~1M ASHAs have WhatsApp)
- Live outbound phone verification via Twilio Voice (the truest form of trust scoring)
- ABDM/ABHA write-back of the referral note as a FHIR R4 bundle
- Federated PHI extraction across district nodes (FedAvg over LoRA adapters)

---

**Live demo:** https://formal-rogers-poster-meanwhile.trycloudflare.com
**GitHub:** https://github.com/damsolanke/aarogya-atlas
**Auditable eval:** [docs/EVAL_REPORT.md](EVAL_REPORT.md) · [docs/ROBUSTNESS_REPORT.md](ROBUSTNESS_REPORT.md)
**Architecture:** [/architecture](https://formal-rogers-poster-meanwhile.trycloudflare.com/architecture)
