# Hack-Nation 2026 — Judging Rubric

## OFFICIAL HackNation cross-challenge rubric (3 axes × 5 points = 15 max)

Source: ["Evaluating Projects: Criteria for Success at HackNation"](https://www.loom.com/share/77ffd85173f14080b77832694636f65a) — Loom video by Kai (HackNation organizer). The og:description provides the canonical extract:

> *"Hey everyone, this is Kai from HackNation. In this video, I walk you through our evaluation criteria for projects, which include **technical depth, communication and presentation, and innovation and creativity, each rated from one to five**. It's crucial that your tech video and GitHub code are accessible for us to assess your technical implementation. I encourage you to present your project clearly and creatively, as this will impact your score. Remember, the best projects will be invited to the next round, so make sure to put your best foot forward!"*

| # | Axis | Score | What it measures | Aarogya artifact |
| - | --- | :-: | --- | --- |
| 1 | **Technical Depth** | 1-5 | Architecture, engineering rigor, eval methodology, system robustness | `/architecture`, `/eval`, MLflow traces, parallel tool fan-out, Trust Scorer with bootstrap CIs, Validator agent |
| 2 | **Communication & Presentation** | 1-5 | Clarity of pitch, README, demo, story arc, visual polish | README hero, IdleHero stat trio, sample answer card, comparison page, equity audit, footer |
| 3 | **Innovation & Creativity** | 1-5 | Novelty of approach, signature differentiators, "things judges haven't seen" | On-device PHI (Qwen 32B + bge-m3), 12-tool agent loop with adaptive thinking, district-level desert detection with red halos, multilingual receptionist scripts (Hindi/Tamil), 7.7× ICU disparate-impact analysis |

**Mandatory artifacts:**
- ✅ Tech video (60s, accessible)
- ✅ GitHub code (repo) — must be public at submission time

**Round structure:** "Best projects invited to next round" — implies multi-stage judging. First-round screen on the artifacts; finalist round is live pitch.

---

## Challenge-3 (Databricks) sponsor-track rubric

Per the Hack-Nation 2026 Challenge 3 brief: "Building Agentic Healthcare Maps for 1.4 Billion Lives".

| # | Weight | Criterion | What scores |
| - | :-: | --- | --- |
| 1 | **35%** | Discovery & Verification | Trust Scorer (named spec example: surgery without anesthesia), Validator agent, cited evidence |
| 2 | **30%** | Intelligent Data Processing (IDP) | Massive unstructured extraction, multi-attribute reasoning, 12 tools coordinated |
| 3 | **25%** | Social Impact | Multilingual reasoning, on-device PHI, total ₹ + travel time ranking, medical-desert detection, equity audit |
| 4 | **10%** | UX / Transparency | Reasoning trace, validator surfacing uncertainty, Trust Score CI widening on low-completeness data |

Aarogya hits all 4. Both rubrics apply: HackNation rubric is the cross-challenge global filter; Challenge-3 weights are the sponsor's lens.

---

## Mapping our submission to BOTH rubrics

### Tech Depth (5/5 target)
- Manual streaming agent loop (no LangGraph/LangChain)
- Parallel `asyncio.gather` tool fan-out (-22% mean wall-clock)
- Bootstrap-perturbation 80% CI on Trust Score
- Validator agent with PASS/WARN/FAIL + cited evidence
- Mosaic AI Vector Search Delta Sync Index — verified end-to-end
- MLflow 3 tracing per turn + per tool with `runs_on=device` tag
- Unity Catalog with column-mask UDF (PHI governance)
- Genie Space NL→SQL verified
- 0 errors across 12-query auditable evaluation
- 11 of 12 tools invoked in eval (full-coverage)

### Communication & Presentation (5/5 target)
- README banner + shields.io for-the-badge row + dual CTA + screenshots above the fold
- Quickstart in `make dev` (one command)
- 5 dedicated public routes (`/`, `/compare`, `/equity`, `/architecture`, `/eval`)
- IdleHero with stat trio (10,000 / 7.7× / 146) + सanskрит etymology
- Sample answer card visible at idle (judges see capability before clicking)
- System status bar with live metrics
- Mobile responsive (390×844 verified)
- Footer with brand mark + nav links
- 60s product + 60s tech video scripts in `docs/DEMO_SCRIPT.md`
- Public live demo URL (Cloudflare tunnel)
- Comparison-vs-baseline page (14/0/0 vs ChatGPT/Maps)

### Innovation & Creativity (5/5 target)
- On-device PHI extraction (Qwen 2.5 32B) + multilingual embeddings (bge-m3) — *no other team in #challenge-03-databricks has shipped this*
- District-level desert detection with red severity halos pulsing at idle
- Trust Scorer with 7 contradiction rules + 4 metadata signals + 80% bootstrap CI
- Total ₹ + travel time ranking (KSRTC bus + MGNREGA wage + auto-rickshaw)
- Equity audit page with disparate-impact ratios (ICU 7.7× · Dialysis 7.0×)
- Multilingual receptionist scripts (the agent answers in Hinglish)
- Sample answer card preview at idle so judges see capability without clicking
- Animated stroke-march flow on `/architecture` SVG (no Mermaid)

---

## Common pitfalls to avoid (from Loom guide synthesis)

1. **Inaccessible GitHub** — repo must be public AT submission moment. Currently private; flip on submission.
2. **Tech video that doesn't show actual implementation** — our DEMO_SCRIPT has a dedicated 60s tech video covering agent.py + trust.py + Databricks.
3. **Pitch that talks about vision instead of demoing** — our 60s product video is shot-by-shot a real query → cards → map.
4. **No judges-can-click-it artifact** — fixed via Cloudflare tunnel.
