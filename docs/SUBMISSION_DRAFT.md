# Submission draft — paste-ready answers for projects.hack-nation.ai

## ⏰ SUBMISSION CHECKLIST (do in this order, takes ~5 min)

1. **Flip GitHub repo to PUBLIC** at https://github.com/damsolanke/aarogya-atlas/settings → Danger Zone → Change visibility → Public
2. Open https://projects.hack-nation.ai/submit#/dashboard/my-projects (you're already logged in as Dam Solanke)
3. Click **Create Submission** → Event: `5th-hack-nation` · Challenge: `Serving A Nation (Agentic AI & Data Engineering)` · Track: `VC Big Bets`
4. Paste from the field-by-field templates below
5. Upload Demo Video (60s MP4) and Tech Video (60s MP4)
6. Optional: drop the 8 priority screenshots from `docs/screenshots/` into Media Gallery
7. Tick the consent checkbox · Click Submit · Verify status changes to **Pending**
8. Screenshot the Pending state for record

If the form errors mid-submission (multiple teams reported issues at 7-9 PM ET on Apr 25), clear cache or use a private window per organizer NicoFroehlich's guidance.

---


**Event:** 5th-hack-nation
**Deadline:** Apr 26, 2026 at 9:00 AM ET (~10h from now)
**User:** redacted
**Important:** "You can only participate in one project per hackathon event."
**Statuses:** Pending → Approved → Rejected

Form captured live from the dashboard (`/submit#/dashboard/my-projects` → Create Submission). Field labels and placeholders are verbatim.

---

## Project Title * (text)
> _Placeholder: "Give your project a clear, descriptive title"_

```
Aarogya Atlas — agentic healthcare intelligence for 1.4B people
```

## Short Description * (textarea)
> _Placeholder: "Fine-tuned language model specialized for legal document analysis…"_

```
Trust-scored, cost-aware, multilingual healthcare facility recommender for India. A 12-tool agent (GPT-OSS-120B (Groq), parallel fan-out, on-device PHI extraction via Qwen 2.5 32B) ranks the Virtue Foundation's 10,000-facility dataset by Trust Score + total ₹ cost + travel time, surfaces source contradictions, and validates each recommendation. Live in Databricks (Mosaic AI VS, Genie, UC mask UDF, MLflow per-tool spans). EN · हिंदी · தமிழ். 0 errors across 12 audited queries.
```

## 1. Problem & Challenge *
> _Placeholder: "What problem does your project solve? What pain point are you addressing?"_

```
In rural India, a postal code can decide a lifespan. Families load into a bus at 5 AM and travel three hours only to learn the dialysis machine broke yesterday or the brochure's Ayushman Bharat (national insurance) coverage was outdated. The Virtue Foundation's 10,000-facility India dataset is the most comprehensive open registry — but it's messy, contradictory, and unsearchable for a non-expert. Existing tools (Google Maps, ChatGPT) return distance and generic suggestions. Neither catches a clinic that lists "Advanced Surgery" with no anesthesiologist on staff. Neither computes the real cost — bus fare + lost MGNREGA wage + treatment. Neither speaks Hindi or Tamil. Neither tells you the words to say to the receptionist. Indian healthcare's Discovery-to-Care time is the friction we attack.
```

## 2. Target Audience *
> _Placeholder: "Who benefits from your solution? Who is your main target group?"_

```
ASHA (Accredited Social Health Activist) workers, NGO planners (Virtue Foundation, World Bank field offices), clinic coordinators, and family members helping a relative navigate India's healthcare system. Secondary: state-mission policy makers using the equity-counterfactual planner.
```

## 3. Solution & Core Features *
> _Placeholder: "How do you solve the problem? What are your main functionalities?"_

```
A streaming agent (GPT-OSS-120B (Groq) with adaptive thinking, manual tool-use loop, parallel asyncio.gather fan-out — 22% wall-clock reduction) coordinates 12 tools to answer healthcare-discovery queries:

• geocode (Nominatim) → facility_search (Postgres + Haversine) → check_hours / status_feed
• Trust Scorer with 7 contradiction rules + 4 metadata signals + 80% bootstrap CI + cited evidence
• Validator agent (PASS/WARN/FAIL with source-text snippet)
• Cost ranker: total ₹ = treatment + KSRTC bus + auto-rickshaw + MGNREGA wage-loss
• On-device PHI extraction (Qwen 2.5 32B + bge-m3 multilingual via Ollama) — patient text never leaves the device
• On-device multimodal triage (medgemma 27B vision) — upload a wound photo, prescription, X-ray, or oxygen-cylinder gauge; ~4s structured triage with severity + recommended specialty
• Mosaic AI Vector Search (Databricks Delta Sync Index)
• find_medical_deserts — district-level coverage gaps with severity scoring
• Clinical-pathway routing: obstetric_emergency → CEmONC; snakebite → polyvalent + species coverage; neonatal → SNCU/NICU; STEMI → cathlab+thrombolytics

Output: 3-tier answer card (⭐ Best · 📍 Closest payer-eligible · 💡 Backup) with the exact words to ask the receptionist, in the user's language.

Five public routes: /, /compare (vs ChatGPT/Maps 14/0/0), /equity (disparate-impact + counterfactual planner), /architecture (interactive SVG), /eval (live audit).
```

## 4. Unique Selling Proposition (USP) *
> _Placeholder: "What makes your project better or different from existing solutions?"_

```
Five things no other Challenge-3 entry shipped: (1) **Multimodal on-device triage** (medgemma 27B vision) — wound photo / X-ray / snake-bite / prescription gives a structured triage in ~4s with severity + recommended specialty + rationale; PHI never touches the cloud. (2) **Trust Scorer with 80% bootstrap CI + Validator** self-check that catches the spec's named contradiction (advanced surgery, no anesthesia). (3) **Drive-time isochrones** rendered as 3 saffron rings (15/30/60 min) around the top recommendation; multi-modal travel always shows auto / public bus / **108 ambulance** (free). (4) **Equity counterfactual planner**: "add N CEmONC beds in {district} → averted maternal deaths/yr" via gravity model + Six-Delays attribution. (5) **DAS-style adversarial robustness eval** reporting 100% static / 100% dynamic / 0% gap after the no-location fallback fix. Plus a bespoke design system (Instrument Serif + Tiro Devanagari Hindi + saffron palette + Bloomberg-style mono tickers + ⌘K command palette) that the AI-template-aesthetic majority of the field cannot match. Mosaic AI Vector Search verified end-to-end while many Databricks-track teams in #challenge-03-databricks remain blocked on it.
```

## 5. Implementation & Technology *
> _Placeholder: "How did you technically implement the solution? What technologies do you use?"_

```
Frontend: Next.js 16 + React 19 + MapLibre GL (clusters + heatmap + 3D buildings + ranked DOM pins + OSRM routes + pulsing critical-district halos) + framer-motion + react-countup. 5 routes, mobile-responsive, OG card.

Backend: FastAPI + official Groq SDK (OpenAI-compatible) + Ollama wrapper. Manual streaming agent loop in apps/api/aarogya_api/agent.py — no LangGraph, no LangChain. Thinking-signature blocks preserved across turns. Server-Sent Events to the frontend. Parallel asyncio.gather over tool_use blocks.

Data: Postgres 17 + pgvector for local Lakebase analog. Schema is FHIR R4 (Location + HealthcareService + intake_note + status_event).

Databricks (workspace dbc-12ce3b55, all live):
• Unity Catalog: workspace.aarogya.facilities (10k Delta), workspace.aarogya_raw.intake_notes (PHI-mask UDF on patient_phone column), workspace.aarogya_curated.facility_capability_summary
• Genie Space (NL→SQL verified)
• MLflow 3 Tracing at /Shared/aarogya-atlas — 23 traces, per-tool spans
• Mosaic AI Vector Search: endpoint aarogya_vs + Delta Sync Index workspace.aarogya.facilities_idx with managed databricks-bge-large-en embeddings — verified returning ranked results

Local LLM: Qwen 2.5 32B (capability extraction) + bge-m3 (multilingual embeddings, EN/HI/TA) via Ollama on M-series Mac.

Deployment: Cloudflare Tunnel (frontend + backend) — judges click and use immediately, no browser-warning interstitial.

Eval: scripts/evaluate.py (12 fixed queries) + scripts/evaluate_robustness.py (DAS-style adversarial perturbation, static-vs-dynamic gap).
```

## 6. Results & Impact *
> _Placeholder: "What have you achieved? What value does your solution bring?"_

```
Latest auditable evaluation (12 queries, mixed languages, 0 human review):
• Mean wall-clock 31.7s (P95 49.5s) — 22% faster after parallel tool fan-out vs the sequential baseline
• 0 errors across 12 queries spanning EN/HI/TA, NGO-planner, patient, trust-scoring, desert-detection, edge-case profiles
• 11 of 12 tools invoked across the run; Validator verdicts 2 PASS · 4 WARN · 0 FAIL
• 33% of answers include a callable next-step (phone number / 104 helpline)

Aarogya vs ChatGPT vs Google Maps on the same query, scored on 14 healthcare-specific capabilities the spec asks for: Aarogya 14/14 · ChatGPT 0/14 · Google Maps 0/14.

Equity audit publishes our own disparate-impact ratios across 25 Indian states: ICU 7.7× · Dialysis 7.0× · Neonatal 5.4×. Counterfactual planner shows that adding 10 CEmONC beds in Patna would avert ~70 maternal deaths/year.

For the user — an ECG query in Bengaluru returns three tier-ranked facilities in 6 tool calls, with ₹484 total cost broken down (treatment + transport + wage-loss), Trust Score 65/100 [CI 50-95], a Validator WARN flag, and the Hindi sentence to ask the receptionist. The map shows numbered ranked pins, the OSRM driving route, and the medical-desert overlay with red severity halos.
```

## Additional Information (Optional)
```
This was built solo in 24 hours. The repository (https://github.com/damsolanke/aarogya-atlas) includes:
• docs/SUMMARY.md — 280-word project summary
• docs/DATABRICKS_DEPLOYMENT.md — Mosaic AI Model Serving deployment plan for hospital-VPC enterprise
• docs/EVAL_REPORT.md — auditable 12-query evaluation results
• docs/ROBUSTNESS_REPORT.md — DAS-style adversarial perturbation eval
• docs/RUBRIC.md — official 3-axis rubric extracted from the HackNation Loom video, mapped to our artifacts
• docs/INTEL_REPORT.md — competitive sweep + strategy implications
• docs/JUDGE_SIM.md — 3-judge persona scoring of our submission, median 14/15
• docs/DEMO_SCRIPT.md + docs/STORYBOARD.md — frame-by-frame for both videos

Roadmap (post-submission): WhatsApp + voice ASHA-facing channel, live outbound phone verification (Twilio), ABDM/ABHA write-back as FHIR R4 referral bundle, federated PHI extraction across district nodes.
```

## Live Project URL (optional)
```
http://localhost:3000
```

## GitHub Repository URL *
```
https://github.com/damsolanke/aarogya-atlas
```
**⚠️ Repo is currently PRIVATE — flip to PUBLIC immediately before submitting.**

## Technologies (multi-tag input)
```
Next.js 16, React 19, MapLibre GL, FastAPI, Anthropic GPT-OSS-120B (Groq), Ollama, Qwen 2.5 32B, bge-m3, Postgres 17, pgvector, Databricks, Unity Catalog, Mosaic AI Vector Search, MLflow, Genie, Cloudflare Tunnels
```

## Tags (multi-tag input)
```
agentic-AI, healthcare, multilingual, on-device-LLM, RAG, FHIR, vector-search, equity-audit, trust-scoring, validator, India, Hindi, Tamil, parallel-tool-fan-out, Databricks
```

## Team
- Solo team

## File uploads — exact specs from the form

| Slot | Constraint | Required? | Our action |
| --- | --- | --- | --- |
| Team Picture | Image, ≤ 200 MB, 16:9 recommended | optional | Skip (solo team) — or attach `docs/screenshots/01_hero_idle.png` cropped to 16:9 |
| **Demo Video** | MP4, **max 60 sec** — "UI/UX showcase: focus on user experience and product flow" | strongly recommended (yellow warning if missing) | Record per `docs/STORYBOARD.md` Video 1 |
| **Tech Video** | MP4, **max 60 sec** — "Technical explanation: cover your stack, architecture, and implementation" | strongly recommended | Record per `docs/STORYBOARD.md` Video 2 |
| Media Gallery | Images, MP4, PDF, ZIP. **8 slots available** | optional | Use all 8 — attach all 13 screenshots in priority order |

**Form warning verbatim:** *"Having both videos is important — the jury needs them to fully evaluate your project. Projects without a Demo + Tech video may score lower."*

## Event + Challenge + Track — exact dropdown labels

- **Event \***: `5th-hack-nation - Deadline: Apr 26, 9:00 AM ET` (only option)
- **Challenge \***: `Serving A Nation (Agentic AI & Data Engineering)` ← **THIS is Challenge 3 / Databricks. Other options seen:**
  - Earn in the Agent Economy
  - Generative City-Wallet
  - Serving A Nation ← us
  - The AI Scientist
  - The World Bank | UNMAPPED (note: equity-counterfactual potentially applies here too — but you can only pick one)
- **Track**: `VC Big Bets` *(more visibility/credibility for hackathon-built ventures)* OR `Company Track` *(if pitching as enterprise-ready)*. Pick `VC Big Bets` for our positioning.

## Suggested Media Gallery attachments (8 slots, in priority order)
1. `02_query_result.png` — live agent answer card with all 3 tiers
2. `13_photo_upload.png` — multimodal medgemma triage card
3. `07_comparison.png` — vs ChatGPT vs Maps 14/0/0
4. `08_equity_audit.png` — disparate-impact ratios
5. `09_architecture.png` — bespoke SVG with 12 hoverable tools
6. `12_counterfactual.png` — equity counterfactual slider
7. `04_mlflow_traces.png` — 23 Databricks traces
8. `06_unity_catalog_mask.png` — UC PHI mask UDF

## Submission checklist (do in order, ~5 min total once videos are recorded)

1. ✅ Repo flipped to PUBLIC at github.com/damsolanke/aarogya-atlas
2. ✅ Both .mp4 videos exported and ≤ 50 MB each
3. Open https://projects.hack-nation.ai/ → Dashboard → Create Submission
4. Paste Project Title (above)
5. Paste Short Description (above)
6. Paste fields 1-6 (above) one by one
7. Paste GitHub URL + Live URL
8. Add technology tags + project tags
9. Upload both videos
10. Tick required checkbox (likely ToS)
11. Click Submit
12. Verify status changes to Pending in dashboard
13. Screenshot the Pending state for record
