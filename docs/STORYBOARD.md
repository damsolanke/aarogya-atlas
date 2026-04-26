# Demo storyboard — frame-by-frame

For both 60s videos. Each beat: timestamp · on-screen action · voiceover · B-roll cut.

Pre-flight checklist (do BEFORE recording):
- [ ] Close all Edge tabs except `localhost:3000` (or the cloudflared URL)
- [ ] macOS → Do Not Disturb (silences all notifications)
- [ ] Continuity Camera mic on iPhone for clean audio
- [ ] Browser zoom 110%
- [ ] Clear chat — refresh `localhost:3000` so IdleHero is visible
- [ ] Pre-warm the agent — run one query through the API to avoid cold-start during the demo
- [ ] Recording: macOS QuickTime → File → New Screen Recording, drag to crop the Edge window only

---

## VIDEO 1 — 60s product demo (the human story)

> **Goal:** by 0:60 a non-technical viewer feels the user value.
> **Cut style:** dwells on the UI. Cursor is the storyteller.

### 0:00 — 0:08 — IDLE HERO (8s)
- **On screen:** `localhost:3000` idle. Stat trio animating up (10,000 / 7.7× / 146). Red pulses on map across critical districts.
- **Voice:** *"In rural India, a postal code can decide a lifespan."*
- **Cursor:** hovering over the आरोग्य etymology line.

### 0:08 — 0:14 — STATE THE PROBLEM (6s)
- **On screen:** Same hero. Cursor moves to the `7.7× ICU disparity` stat card.
- **Voice:** *"ICU coverage between the best and worst Indian states differs by seven point seven times."*

### 0:14 — 0:18 — CLICK THE QUERY (4s)
- **On screen:** Cursor moves to the ECG suggestion card. Click.
- **Voice:** *"Watch. A family near Yeshwantpur, Bangalore needs an ECG today, Ayushman Bharat eligible."*

### 0:18 — 0:34 — AGENT REASONS (16s)
- **On screen:** LiveStatus chip cycles: Locating → Searching → Trust-scoring → Validating. Numbered map pins appear 1, 2, 3 around Bengaluru.
- **Voice:** *"Claude Opus 4.7 with twelve tools — parallel fan-out, adaptive thinking. PHI tools run on-device, marked with the cyan badge. The agent geocodes, searches the dataset, scores trust, runs a validator self-check, and computes total rupees including bus fare and lost wages."*

### 0:34 — 0:48 — THE ANSWER CARD (14s)
- **On screen:** BEST MATCH card slides in. Cursor highlights the cost pill (₹484), the trust pill (65/100, CI 50-95), and the cyan "Ask the receptionist" callout.
- **Voice:** *"Three tiers — Best, Closest, Backup. Trust score sixty-five with confidence interval. Validator WARN. And the exact words to ask the receptionist — in Hinglish, in their register."*

### 0:48 — 0:60 — THE MAP TELLS THE STORY (12s)
- **On screen:** Zoom out the map to show numbered pins + OSRM route + pulsing red desert halos.
- **Voice:** *"On the map: numbered ranked pins, driving route, and the medical-desert overlay — every red halo is a district where less than five percent of facilities offer dialysis. Aarogya Atlas — the right hospital, before the journey begins."*

---

## VIDEO 2 — 60s tech video (the engineering depth)

> **Goal:** technical judge can grade Tech Depth in 60s.
> **Cut style:** quick cuts, heavy on code + Databricks UI. No cursor dwelling.

### 0:00 — 0:10 — THE AGENT LOOP (10s)
- **On screen:** `apps/api/aarogya_api/agent.py` — scroll past `messages.stream()`, the parallel `asyncio.gather` block (highlight the comment).
- **Voice:** *"Manual streaming loop — official Anthropic SDK, no LangGraph. Twelve tools, max fourteen iterations. Multiple tool_use blocks per turn run in parallel via asyncio.gather — twenty-two percent wall-clock cut."*

### 0:10 — 0:20 — TRUST + VALIDATOR (10s)
- **On screen:** `apps/api/aarogya_api/trust.py` — show `_RULES` dict, `bootstrap_ci()`, `validate_recommendation()`.
- **Voice:** *"Trust Scorer — seven contradiction rules including the spec example of advanced surgery without anesthesia. Bootstrap-perturbation eighty-percent CI. Validator agent re-checks recommendations against source text — PASS, WARN, or FAIL with cited evidence."*

### 0:20 — 0:35 — DATABRICKS LIVE (15s)
- **On screen:** Quick cuts —
  1. `dbc-12ce3b55` Catalog Explorer showing **Column mask** badge on `patient_phone`
  2. Genie Space query "top 5 states + cardiology breakdown" with auto bar chart
  3. MLflow Experiments page with the 23 trace rows visible
  4. POSTMan / curl response from Mosaic AI VS query showing Bright Hospital + Aruna + Balaji Natarajan
- **Voice:** *"Live in our Databricks workspace — Unity Catalog with PHI column-mask UDF, Genie Space NL-to-SQL verified, MLflow tracing per supervisor turn and per tool with the runs-on-device tag, Mosaic AI Vector Search Delta Sync Index returning real ranked results."*

### 0:35 — 0:48 — EVAL + ROBUSTNESS (13s)
- **On screen:** `localhost:3000/eval` page → stat-card grid + tool frequency chart + per-query table including Hindi + Tamil rows.
- **Voice:** *"We grade ourselves in public. Twelve queries, zero errors, mean thirty-one point seven seconds. Eleven of twelve tools invoked. English, Hindi, Tamil all clear. Plus a DAS-style adversarial robustness eval — static-versus-dynamic accuracy gap, the twenty-twenty-six benchmark methodology."*

### 0:48 — 0:55 — EQUITY + COUNTERFACTUAL (7s)
- **On screen:** `/equity` → disparate impact cards + the counterfactual slider with Patna selected, beds=10, "~70 maternal deaths averted/yr".
- **Voice:** *"Equity audit — ICU disparate-impact seven point seven times. Counterfactual planner — add ten beds in Patna, avert seventy maternal deaths a year."*

### 0:55 — 0:60 — CLOSE (5s)
- **On screen:** README hero on GitHub.
- **Voice:** *"Aarogya Atlas. Twelve tools. On-device PHI. Trust-scored. Cost-aware. Built in twenty-four hours."*

---

## Backup demo (pre-recorded MP4)

If the live demo fails on judging day, judges play the recorded MP4 instead. To record a clean run NOW:
1. Open https://formal-rogers-poster-meanwhile.trycloudflare.com
2. macOS QuickTime → New Screen Recording → drag to crop Edge window
3. Click ECG suggestion → wait for full answer card → toggle dialysis desert overlay
4. Stop after 75 seconds
5. Save to `docs/demo/backup_product.mov`
6. Use Handbrake / ffmpeg to compress to ≤ 50 MB MP4 H.264
7. Upload to YouTube unlisted as final-day fallback
