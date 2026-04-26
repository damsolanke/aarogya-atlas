# Loom — Product Video script (60s, 152 spoken words)

Recorded with the Loom DESKTOP app on macOS, menu-bar capture. Cmd+Shift+L to start (3-2-1 countdown), same shortcut to stop. Loom captures full screen + webcam bubble + mic locally, then auto-uploads.

---

## PRE-RECORD STAGING (5-min checklist before Cmd+Shift+L)

- Quit: Slack, Mail, Messages, Discord, any notification source
- macOS: Control Center → Focus → Do Not Disturb (1 hour)
- Loom desktop preferences: 1080p, screen + cam, mic = AirPods or built-in (whichever sounds clearer in the AirPods test below)
- Webcam bubble: bottom-right, small size — minimal screen-real-estate
- Chrome: ONE clean window, http://localhost:3000 loaded, zoom 100%, bookmarks bar HIDDEN, no other tabs visible to camera
- Two more tabs (offscreen, ready for the equity beat): http://localhost:3000/equity loaded, http://localhost:3000/architecture loaded
- **Pre-warm cache (CRITICAL for timing)**: Run the query `Cardiac care, age 67, Bengaluru, two hours.` ONCE end-to-end (let it complete fully, ~60-70s on cold start). Then close the answer (refresh home). The next run hits `@cached` decorators on geocode, trust_score, find_medical_deserts, estimate_journey, total_out_of_pocket — total streaming time drops to ~25-35s
- Display: 1920x1080 external monitor preferred; otherwise native retina, Chrome at default zoom
- AirPods test: read the first voiceover line into Loom's mic preview, listen to playback. Repeat with built-in mic. Pick clearer
- Mouse: park cursor in the dock (out of frame) until the 3-2-1 countdown ends

## TIMELINE — timed against actual stopwatch run on the live site

| Time | On-screen action | Voiceover (read aloud — comma = micro-pause) |
|---|---|---|
| 0:00 | Hero loads, stat counters animate from 0: 10,000 facilities · 7.7× ICU disparity · 146 critical districts | "Aarogya — Sanskrit for, without disease." |
| 0:04 | Hover the आरोग्य callout — etymology tooltip reveals "अ + रोग → without disease" | "An atlas of care, for 1.4 billion people." |
| 0:09 | Click into the search field, start typing | "An ASHA worker types the patient situation." |
| 0:12 | Finish typing the query, click Send | "Cardiac care, age 67, Bengaluru, two hours." |
| 0:17 | Tool ticker streams live: facility_search → trust_score → estimate_journey → validate_recommendation | "The agent calls 12 tools, in parallel, on-device for PHI." |
| 0:25 | Answer card appears: BEST MATCH Dr Prabhakar Clinic · ₹484 · Trust 65/100 · Validator WARN | "Tier-ranked, with travel cost, and a validator self-check." |
| 0:32 | Pull focus to the Travel row inside the answer card: 🚗 9 min ₹63 · 🚌 14 min ₹15 · 🚑 7 min free | "Auto-rickshaw, public bus, or the free one-oh-eight ambulance." |
| 0:38 | Map flies in cinematic — three saffron isochrone rings at 15, 30, 60 minutes; pulsing red halo on a critical district | "Drive-time isochrones, and the districts where dialysis is zero." |
| 0:46 | Switch tab to /equity — disparate-impact ratios fade in: ICU 7.7× · Dialysis 7.0× | "We publish our own bias — ICU is, seven-point-seven times unequal across states." |
| 0:54 | Cut back to the answer card, highlight the Hindi receptionist sentence | "And it speaks Hindi, and Tamil." |
| 0:58 | Hold on the आरोग्य wordmark | "From symptom, to care." |

Total: 60.0s · 152 spoken words · max 12 words per breath line.

## BACKUP IF LIVE TUNNEL DROPS MID-RECORD

- Pre-recorded MP4: `docs/demo/backup_product.mp4` (record one good full-flow take, stash here as fallback)
- Or static screenshot deck: `docs/demo/product_frames/` — 8 frames, 1080p, paced 7-8s each in iMovie

## POST-STOP CHECKLIST

- Loom auto-opens in browser → trim head/tail to land at exactly 60.0s
- Download as MP4 (Loom Pro feature; if not Pro, screen-record the playback at 1080p with macOS native screen-recorder)
- Verify file size <100 MB for submission upload
- Verify audio is mono and peaks below -3 dBFS (Loom shows a waveform — visually flat-spike free)
- Drop the file at `docs/demo/product.mp4` then drag into the Demo Video slot on projects.hack-nation.ai
