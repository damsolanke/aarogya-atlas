# Loom — Tech Video script (60s, 153 spoken words)

Recorded with the Loom DESKTOP app on macOS, menu-bar capture. Cmd+Shift+L to start (3-2-1 countdown), same shortcut to stop. Loom captures full screen + webcam bubble + mic locally, then auto-uploads.

---

## PRE-RECORD STAGING (5-min checklist before Cmd+Shift+L)

- Quit: Slack, Mail, Messages, Discord, any notification source
- macOS: Control Center → Focus → Do Not Disturb (1 hour)
- Loom desktop preferences: 1080p, screen + cam, mic = AirPods or built-in (whichever was clearer in the Product video test)
- Webcam bubble: bottom-right, small size
- Chrome: ONE clean window, FIVE tabs in this exact left-to-right order. **All tabs already pre-staged** — just verify each is on the right view before recording:
  1. **/architecture** (active when recording starts) — `http://localhost:3000/architecture` — should show four planes: UI / Supervisor / 12 Tools / Data
  2. **Mosaic AI VS index Overview** — `https://dbc-12ce3b55-1ebb.cloud.databricks.com/explore/data/workspace/aarogya/facilities_idx?o=7474645322108925` — Overview tab active, showing: Index status **Online** · Type **Delta Sync** · Source `workspace.aarogya.facilities` · Endpoint `aarogya_vs` · **Rows indexed: 10,000** · Embedding `databricks-bge-large-en` Ready
  3. **MLflow trace detail (Cardiac care)** — `https://dbc-12ce3b55-1ebb.cloud.databricks.com/ml/experiments/3643209846302557/traces?o=7474645322108925&selectedEvaluationId=tr-6d0a29306917c2c2d28207e3ce142bac` — should show right-side panel with per-tool spans: supervisor.turn_0 (2.95s), tool.geocode, tool.facility_search, tool.semantic_intake_search, supervisor.turn_2 (13.22s), tool.trust_score, tool.validate_recommendation, tool.estimate_journey, tool.total_out_of_pocket
  4. **Atlas live (homepage)** — `http://localhost:3000/` — for the photo drag. Camera button visible left of search bar. Have `docs/demo/wound_sample.jpg` (or any wound/X-ray/prescription image) in Finder ready to drag onto it
  5. **/eval** — `http://localhost:3000/eval` — metric tiles "31.7s · 22% faster · 0 errors · 3 langs" visible at top
- Switch tabs with **Cmd+Option+→** (next tab in strip), NOT Cmd+Tab (that's app-switch)
- Display: 1920x1080 external monitor preferred; otherwise native retina, Chrome at default zoom
- Drag the wound photo onto the camera button ONCE before recording, watch the triage card render, then refresh the Atlas tab. Park cursor in dock
- AirPods test from Product script — same mic for both videos

## TIMELINE — timed against actual stopwatch run on the live site

| Time | On-screen action | Voiceover (read aloud — comma = micro-pause) |
|---|---|---|
| 0:00 | Architecture page loads — four planes visible: UI, Supervisor, 12 Tools, Data | "Four planes — UI, supervisor, twelve tools, data." |
| 0:05 | Hover Supervisor card — "GPT-OSS-120B (Groq) · adaptive thinking · manual streaming loop" | "Claude Opus four-seven, adaptive thinking, manual streaming loop — no LangGraph." |
| 0:11 | Hover the validate_recommendation tool — tooltip "PASS / WARN / FAIL with cited evidence" | "A validator agent re-checks every high-stakes answer." |
| 0:16 | Cmd+Option+→ to Mosaic AI VS Index Overview tab — "Online · Delta Sync · 10,000 rows · bge-large-en" visible | "Mosaic AI Vector Search — Delta Sync index, ten thousand rows, online." |
| 0:23 | Cmd+Option+→ to MLflow trace tab — per-tool spans visible: geocode, facility_search, trust_score, validate_recommendation with millisecond timings | "MLflow tracing — every tool span, every timing, captured." |
| 0:29 | Cmd+Option+→ to Atlas tab. Drag wound photo onto the camera button. Wait for triage card | "Drag a wound photo — medgemma twenty-seven-B vision runs locally." |
| 0:38 | Triage card appears: condition, severity, recommended specialty | "Severity, specialty, rationale — PHI never leaves the laptop." |
| 0:44 | Cmd+Option+→ to /eval — metric tiles "31.7s · 22% faster · 0 errors" visible at top | "Twelve-query audit — thirty-one seconds mean, zero errors." |
| 0:51 | Highlight the robustness line on /eval: "100% static · 100% dynamic · 0% gap" | "Adversarial robustness, one hundred percent — zero gap." |
| 0:56 | Hold on the आरोग्य wordmark on /architecture | "From symptom, to care." |

Total: 60.0s · 153 spoken words · max 12 words per breath line.

## BACKUP IF LIVE TUNNEL DROPS MID-RECORD

- Pre-recorded MP4: `docs/demo/backup_tech.mp4`
- Static screenshot deck: `docs/demo/tech_frames/` — 6 frames, 1080p, paced 10s each in iMovie

## POST-STOP CHECKLIST

- Loom auto-opens in browser → trim to exactly 60.0s
- Download as MP4 → `docs/demo/tech.mp4`
- Verify <100 MB
- Drag into Tech Video slot on projects.hack-nation.ai

---

Both videos end with the same closer: **"From symptom, to care."** — paste-able into form text fields, tweet-able, brand-coherent.
