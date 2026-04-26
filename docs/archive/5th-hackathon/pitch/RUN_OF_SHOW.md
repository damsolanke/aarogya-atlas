# RUN OF SHOW — Hack-Nation Finals

**This file is the only one you need open when the finalist Zoom invite lands.** Everything else is referenced from here.

---

## TL;DR — Top of file

| | |
|---|---|
| **Pitch length** | 3 min target · 2:45 actual delivery |
| **Closer (memorize)** | "From symptom, to care." |
| **Live demo URL** | https://formal-rogers-poster-meanwhile.trycloudflare.com |
| **Primary deck** | `docs/pitch/backup.html` — already running at http://localhost:8888/backup.html — press `f` for fullscreen, `s` for speaker view, `?` for cheatsheet |
| **Fallback deck** | https://gamma.app/docs/lm9dmpvz2bj6ysy *(only if HTML deck breaks; needs theme restyle in Gamma editor)* |
| **PDF fallback** | `docs/pitch/aarogya_finalist.pdf` *(generate from backup.html → Print → Save as PDF, Background graphics ON)* |
| **Script** | `docs/pitch/SCRIPTS.md` — read the 3-min version 3 times before going live |
| **Q&A** | `docs/pitch/QA_PREP.md` — skim section headers; you've read these once already |
| **Repo** | https://github.com/damsolanke/aarogya-atlas |

---

## 30 minutes before the call

- [ ] Eat something. Drink water. Use the bathroom.
- [ ] Read `SCRIPTS.md` 3-min script aloud once, slowly. Time it. Trim if over 2:50.
- [ ] Do a 60-second cold open of just slide 1: "In rural India, a postal code can decide a lifespan." until it lands without thinking about it.
- [ ] Confirm cloudflared tunnel still running:
      ```bash
      curl -sI https://formal-rogers-poster-meanwhile.trycloudflare.com | head -1
      ```
      Should return `HTTP/2 200`. If it doesn't, restart `cloudflared tunnel --url http://localhost:3000`.
- [ ] Confirm backend tunnel still running (whichever URL is set in `NEXT_PUBLIC_API_URL`).
- [ ] Open `http://localhost:8888/backup.html` in your MAIN Chrome window. Press `s` to open the speaker window — drag it to your second display if you have one. Then back to the main window, press `f` for fullscreen on slide 1. The speaker window persists with notes + timer + next-slide preview.

## 5 minutes before the call

- [ ] **Quit:** Slack, Mail, Messages, Discord, anything that pings.
- [ ] **macOS:** Control Center → Focus → Do Not Disturb → 1 hour.
- [ ] **Phone:** ringer **OFF** but phone visible (in case organizers SMS for tech help). Charging.
- [ ] **Zoom:** open, signed into the right account, mic + camera tested via the Zoom test meeting (`zoom.us/test`). Use AirPods or built-in — whichever you tested with.
- [ ] **Browser tabs (left to right in this exact order):**
      1. **Primary deck** at `http://localhost:8888/backup.html` (fullscreen, `f`)
      2. **Speaker window** (auto-opens on `s` from primary) — has script + timer + next-slide preview
      3. Live demo: https://formal-rogers-poster-meanwhile.trycloudflare.com (the deck embeds this on slide 5; this tab is the manual fallback if the iframe times out)
      4. Loom backup video: https://www.loom.com/share/5f67de77c1f24328b5d395275d07f249
      5. GitHub repo: https://github.com/damsolanke/aarogya-atlas
      6. `QA_PREP.md` open in your text editor on a second screen if you have one
- [ ] **Glass of water** within reach. Tissue.
- [ ] **Two breaths.** Drop your shoulders. You built the thing — they didn't.

## When the Zoom opens

- Camera ON. Mic OFF until you're called.
- Background: clean wall or blurred. No work-in-progress visible behind you.
- Lighting: face the window or a lamp; never sit with light *behind* you.

---

## During the pitch

**Open with eye contact and the closer queued in your head.** When the moderator names you:

1. Smile, count one second, then go.
2. **Slide 1 (Hook):** the आरोग्य glyph types in over 800ms. Wait for it. Then "From symptom, to care." appears below — let it land. Advance.
3. **Slide 2 (Problem):** voiceover from `SCRIPTS.md` Section 1 — "In rural India, a postal code can decide a lifespan." → pause → "A family loads onto a bus at 5 AM..."
4. **Slide 5 (Demo):** the iframe is the live tunnel — pre-loaded with the hero state showing the sample answer card. If the iframe shows the loading splash for >2s, the deck auto-falls-back to the Loom MP4. You don't need to do anything — the JS detects offline / timeout and swaps `src`.
5. **Slides 6-8 (3 moats):** rapid-fire. ~10 seconds per slide. Don't dwell. The Power-of-Three pacing is the point.
6. **Slide 9 (Proof):** the 6 numbers count up automatically when the slide shows. Wait for the countup to finish (~1.4s) before saying the headline number. Don't read the labels.
7. **Slide 10 (Closer):** black screen. Say "From symptom, to care." → silence for 5 full seconds → look at the camera → "Happy to take questions."

**Keyboard shortcuts in your hand:**
- `→` / `space` — next slide
- `s` — open/focus speaker window (script + timer + next-slide preview)
- `f` — fullscreen
- `b` — blackout (pull focus during a Q&A tangent)
- `1` — jump to demo slide instantly (if a judge interrupts and asks to see the product)
- `?` — show keyboard cheatsheet (in case you forget)
- Direct URL: `#/slide-arch` jumps to the architecture reference (Q&A backup)

### If you blank

- Look at the slide. The script's first three words are anywhere on it. Restart the sentence.
- If a number escapes you: "I don't have it in front of me — let me pull it up after the pitch." Move on.

### If the demo fails mid-pitch

- Cut to the Loom backup tab in 2 seconds. Voiceover: "Same thing, recorded earlier — let me walk you through it."
- Do NOT apologize. Do NOT explain. Just continue.

### If your audio fails

- Pin the chat. Type: *"Audio dropped — switching now"*. Reconnect via phone audio (Zoom shows the dial-in number under "More → Switch to Phone Audio"). Keep the screen-share running while you reconnect.

### If their audio fails (you can't hear judges)

- Pin chat. Type: *"I can't hear — please type the question."* Continue when answered.

---

## During Q&A

Use the bridges in `SCRIPTS.md` Section 4. Five rules:

1. **Repeat the question** in your first sentence — buys time, signals you heard it, helps other judges.
2. **30-second answer ceiling.** Look at the timer; if a judge looks impatient mid-answer, land it.
3. **Numbers in the answer.** Generic answers lose. "Mosaic VS endpoint, 10,000 rows, Delta Sync, 22% latency win" beats "yeah we use Databricks."
4. **Bridge back to the moat in the last sentence.** Every answer is a chance to re-anchor on multimodal, on-device PHI, or the equity counterfactual.
5. **"I don't know"** is acceptable — paired with "what I do know is..." Never bullshit; healthcare judges smell it.

---

## After your pitch

- Stay on camera and on mute through the rest of the finalist round. Watching the other teams is intel for the venture-track follow-up.
- Don't post in Discord/Slack until the awards ceremony ends. Avoid commentary.
- If anyone DMs you for follow-up — one-line acknowledgment + "let's talk after the ceremony."

## Post-ceremony — within 60 minutes

Send these in order:

1. **To the panel/Linn Bieske** (Discord DM or whatever Hack-Nation channel they used):
   ```
   Linn — thanks for having me as a finalist. The 3 minutes was tight; happy to do a deeper walk-through of the multimodal triage and Mosaic VS integration if useful for the venture track.
   Live: https://formal-rogers-poster-meanwhile.trycloudflare.com
   Repo: https://github.com/damsolanke/aarogya-atlas
   — Damola
   ```

2. **To anyone who DM'd a question during the pitch:** answer it directly with a link to `docs/EVAL_REPORT.md` or `docs/DATABRICKS_DEPLOYMENT.md`.

3. **To the Discord #showcase channel** (if appropriate):
   ```
   Aarogya Atlas — agentic healthcare facility intelligence for India.
   Trust-scored, multilingual, on-device PHI extraction, multimodal vision triage.
   Live: https://formal-rogers-poster-meanwhile.trycloudflare.com
   Repo: https://github.com/damsolanke/aarogya-atlas
   60-second walk-through: https://www.loom.com/share/5f67de77c1f24328b5d395275d07f249
   ```

4. **Save:** if you DON'T win, the venture-track program is the real prize — most past Hack-Nation cohorts surface their winners 2-4 weeks later. Keep the cloudflared tunnel up for at least 7 days post-event.

---

## After the entire event

- [ ] Kill the cloudflared tunnels (`pkill cloudflared`)
- [ ] On a fresh branch `post-hackathon-v1`, do the mobile 320px polish + any other fixes
- [ ] Write a Medium post titled "What I learned solo-building a Databricks agent for Indian healthcare in 24 hours" — distribution beyond the contest
- [ ] Email Linn Bieske on her Waymo address with a thank-you and a one-line pitch for staying in touch
- [ ] Add Aarogya Atlas to your portfolio site

---

**You have done the work. The pitch is the easy part. Walk in like the thing already won.**
