# Loom — Tech Video script (60s, 153 spoken words)

Recorded with the Loom DESKTOP app on macOS, menu-bar capture. Cmd+Shift+L to start (3-2-1 countdown), same shortcut to stop. Loom captures full screen + webcam bubble + mic locally, then auto-uploads.

---

## PRE-RECORD STAGING (5-min checklist before Cmd+Shift+L)

- Quit: Slack, Mail, Messages, Discord, any notification source
- macOS: Control Center → Focus → Do Not Disturb (1 hour)
- Loom desktop preferences: 1080p, screen + cam, mic = AirPods or built-in (whichever was clearer in the Product video test)
- Webcam bubble: bottom-right, small size
- Chrome: ONE clean window, four tabs in this exact left-to-right order:
  1. https://formal-rogers-poster-meanwhile.trycloudflare.com/architecture (active)
  2. https://dbc-12ce3b55-1ebb.cloud.databricks.com → Mosaic AI Vector Search → endpoint `aarogya_vs` → Test page open with one query already entered: `cardiac ICU near Bengaluru` (results visible)
  3. https://dbc-12ce3b55-1ebb.cloud.databricks.com → MLflow → /Shared/aarogya-atlas → most recent agent trace expanded showing tool spans
  4. https://formal-rogers-poster-meanwhile.trycloudflare.com/eval (active)
- One additional tab to the right: https://formal-rogers-poster-meanwhile.trycloudflare.com/ — for the photo triage beat. Have `docs/demo/wound_sample.jpg` ready in Finder, dragged once already so Chrome remembers the path
- Display: 1920x1080 external monitor preferred; otherwise native retina, Chrome at default zoom
- Cmd+Tab Finder window in front before recording, drag wound photo into the camera button on the Atlas page once to verify; refresh page; cursor parked in dock
- AirPods test from Product script — same mic for both videos

## TIMELINE — timed against actual stopwatch run on the live site

| Time | On-screen action | Voiceover (read aloud — comma = micro-pause) |
|---|---|---|
| 0:00 | Architecture page loads — four planes visible: UI, Supervisor, 12 Tools, Data | "Four planes — UI, supervisor, twelve tools, data." |
| 0:05 | Hover Supervisor card — "Claude Opus 4.7 · adaptive thinking · manual streaming loop" | "Claude Opus four-seven, adaptive thinking, manual streaming loop — no LangGraph." |
| 0:11 | Hover the validate_recommendation tool — tooltip "PASS / WARN / FAIL with cited evidence" | "A validator agent re-checks every high-stakes answer." |
| 0:16 | Cmd+Tab to Mosaic AI Vector Search test tab — three ranked results visible | "Mosaic AI Vector Search — Delta Sync index over ten thousand facilities." |
| 0:23 | Cmd+Tab to MLflow trace tab — per-tool spans visible with timings | "MLflow tracing — per-tool spans, twenty-three runs logged." |
| 0:29 | Cmd+Tab to Atlas tab. Drag wound photo onto the camera button. Wait for triage card | "Drag a wound photo — medgemma 27B vision runs locally." |
| 0:38 | Triage card appears: condition, severity, recommended specialty | "Severity, specialty, rationale — PHI never leaves the laptop." |
| 0:44 | Cmd+Tab to /eval — scroll to "31.7s · 22% faster · 0 errors" | "Twelve-query audit — thirty-one seconds mean, zero errors." |
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
