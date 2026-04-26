# Judge Simulation — Aarogya Atlas vs the official 3-axis rubric

_Run: 2026-04-25 22:00 ET, ~10h before submission deadline._

Three personas grade our current submission against each axis (1-5).
Anything <4 is a gap to ship before submission.

## Persona A — Technical Judge

> Cares about: architecture novelty, engineering rigor, eval methodology, robustness, observability, latency.

| Axis | Score | Why |
| --- | :-: | --- |
| **Technical Depth** | **5/5** | Manual streaming agent loop (no LangGraph), parallel `asyncio.gather` fan-out (-22%), bootstrap-perturbation 80% CIs, validator agent with cited evidence, MLflow per-tool spans, Mosaic AI VS verified end-to-end, UC + PHI mask UDF, Genie verified, dynamic adversarial robustness eval (DAS), 11 of 12 tools invoked. |
| **Communication & Presentation** | **4/5** | README + 5 polished routes + system bar. Gap: tech video not yet recorded. |
| **Innovation & Creativity** | **5/5** | On-device PHI (single team in #challenge-03-databricks running this), clinical-pathway routing (Six Delays / antivenom species), counterfactual policy slider, animated stroke-march SVG architecture. |

**Comments:** "This team treated the spec as a starting line, not a finish line. The dynamic eval and counterfactual planner are unusually mature."

## Persona B — Healthcare / Domain Judge

> Cares about: clinical relevance, equity, real-world deployability, PHI handling, cited methodology.

| Axis | Score | Why |
| --- | :-: | --- |
| **Technical Depth** | **4/5** | Trust Scorer with 7 contradiction rules + bootstrap CI is impressive; Validator agent flags inferred capability. Gap: no actual clinical-decision-support certification or live verification (no phone call to facility). |
| **Communication & Presentation** | **5/5** | Etymology + Hindi/Tamil receptionist scripts read like the team has talked to real ASHAs. Equity audit page names its own bias publicly — judges respect that. Disparate-impact ratio (ICU 7.7×) is a real, citable number. |
| **Innovation & Creativity** | **5/5** | Total ₹ + travel time including MGNREGA wage-loss is the right cost model for rural India — no other entry will likely have this. District-level desert overlay + counterfactual ("if we add 10 CEmONC beds in Patna → 70 averted maternal deaths") is the policy framing the World Bank track wants. Pathway routing (CEmONC vs BEmONC, Big Four antivenom) shows clinical depth. |

**Comments:** "The on-device PHI extraction with explicit Mosaic AI Model Serving migration path is the only entry that takes Indian healthcare data sovereignty seriously."

## Persona C — Business / Sponsor Judge (Databricks-leaning)

> Cares about: market fit, scalability, sponsor-tech usage depth, demo-ability, judge-can-click-it.

| Axis | Score | Why |
| --- | :-: | --- |
| **Technical Depth** | **5/5** | Mosaic AI Vector Search returns real ranked results for "cardiology Bengaluru ECG". 23 MLflow traces with on-device tool tags. Unity Catalog with Column mask UDF visible. Genie Space verified. This team used 5 of Databricks's flagship surfaces. |
| **Communication & Presentation** | **4/5** | Live Cloudflare-tunnel URL works; comparison-vs-baseline page makes the value visceral. Gap: no embedded loop video / GIF in README; only static screenshots. |
| **Innovation & Creativity** | **4/5** | The combination of all 12 tools is novel; the comparison page (14/0/0 vs ChatGPT/Maps) is provocative; the equity counterfactual targets policy-maker buyers. Gap: no enterprise pricing slide or business-model artifact. |

**Comments:** "If I were Databricks sales, I'd ship this team a sandbox and an intro to a state health-mission CIO. The deployment story (Mosaic AI Model Serving) is enterprise-credible."

---

## Aggregate scoreboard

| Axis | Tech | Healthcare | Business | Mean | Gap to 5 |
| --- | :-: | :-: | :-: | :-: | :-: |
| Technical Depth | 5 | 4 | 5 | **4.67** | 0.33 |
| Communication & Presentation | 4 | 5 | 4 | **4.33** | 0.67 |
| Innovation & Creativity | 5 | 5 | 4 | **4.67** | 0.33 |
| **TOTAL** | 14/15 | 14/15 | 13/15 | **13.67/15** | — |

Median: **4.67/5** per axis · **14/15** total.

## Top 5 specific gaps to close before submission

1. **Tech video not yet recorded** (-1 from Tech and Comm scores) → user must record per `docs/DEMO_SCRIPT.md`.
2. **No live phone call to facility** (red-team item 3) → defer; ship single live curl-call to a real phone number in the agent demo if time.
3. **No animated GIF/video in README** (Persona C noted) → record one and embed.
4. **Repo is private at scoring time** (auto-eliminates if not flipped) → user must flip on submission day.
5. **No business-model artifact** for the sponsor judge → add a one-line "Deployment path → Mosaic AI Model Serving inside hospital VPC" callout to README header.

## Iteration target: 15/15

If we can ship items 3 and 5 (both code/docs work, no human required), and item 1 (video, requires user) lands cleanly, we have a credible 15/15 case.
