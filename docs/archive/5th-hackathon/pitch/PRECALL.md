# PRECALL — 30-minute window before the finalist call

**Call window:** 12:30 PM CT reachable, 1:00 PM CT online · **Closer:** "From symptom, to care."

This file is the only one you need open between rehearsal end and call start. Walk it top to bottom.

---

## T-30 min

- [ ] **Eat.** Protein + carbs. Banana, peanut butter, granola, yogurt — not just coffee. Coffee on an empty stomach during a pitch is sabotage.
- [ ] **Glass of water.** Full. On the desk within reach.
- [ ] **Bathroom.** Now, not at T-5.
- [ ] **Phone:** ringer ON, charger plugged in. DND OFF for the Hack-Nation organizer numbers — they may text if the Zoom link changes.
- [ ] **Inbox check:** look for `no-reply@zoom.us` or anything from `linn@hack-nation.ai` / Linn Bieske. **Check spam folder once.** If a finalist link landed in spam, fish it out now.
- [ ] **Tunnel still alive?**
  ```bash
  curl -sI https://formal-rogers-poster-meanwhile.trycloudflare.com/ | head -1
  ```
  Expected: `HTTP/2 200`. If anything else, restart cloudflared:
  ```bash
  pkill cloudflared; cloudflared tunnel --url http://localhost:3000 &
  ```
  *New tunnel URL? Update `RUN_OF_SHOW.md` and the deck's slide-demo iframe `src`.*
- [ ] **Deck server still up?**
  ```bash
  curl -sI http://localhost:8888/backup.html | head -1
  ```
  If down: `cd /Users/adesolanke/code/hacknation-2026/docs/pitch && python3 -m http.server 8888 &`

---

## T-20 min

- [ ] **Quit:** Slack, Mail, Messages, Discord, Spotify, anything that pings or pops up.
- [ ] **macOS DND:** Control Center → Focus → Do Not Disturb → 90 min. Confirm the moon icon shows in the menu bar.
- [ ] **Browser tabs** — close everything except, in this exact left-to-right order:
  1. **Deck:** `http://localhost:8888/backup.html` (do NOT fullscreen yet)
  2. **Live demo:** `https://formal-rogers-poster-meanwhile.trycloudflare.com` (manual fallback if iframe stalls)
  3. **Loom backup:** `https://www.loom.com/share/5f67de77c1f24328b5d395275d07f249` (if demo dies entirely)
  4. **GitHub repo:** `https://github.com/damsolanke/aarogya-atlas` (open at the README; judges may ask "show me the code")
  5. **QA_PREP.md** in your text editor on a second screen if you have one
- [ ] **Mic test:** open QuickTime → New Audio Recording → record 5 seconds of "*one, two, three — testing*" → play back. AirPods or built-in, whichever you've practiced with. **Do not switch mics now.**
- [ ] **Webcam test:** Photo Booth or Zoom test meeting (`zoom.us/test`). Check:
  - Face is centered, eyes ≈ top third of frame
  - Light source in front of you, not behind
  - Background is clean (clean wall or blurred — no laundry, no whiteboard scrawl visible)
- [ ] **Posture cue:** sticky note on your monitor that says `SHOULDERS DOWN. SMILE.`

---

## T-10 min

- [ ] **Open the deck.** Press `f` for fullscreen on the main display. Press `s` to spawn the speaker window — drag it to your second screen if you have one, or to the corner of your main screen.
- [ ] **Pre-advance to slide 1** so the hook scene is loaded and the आरोग्य glyph is rendered (not loading).
- [ ] **One last sip of water.** Don't chug — sips, not gulps. Avoid coffee in the last 10 minutes; dry mouth kills delivery.
- [ ] **Stand up.** Shake out your shoulders. Roll your neck twice. Two breaths in for 4, out for 6.
- [ ] **Open Zoom.** Sign in to the correct account (the one matching your Hack-Nation registration). Don't auto-join yet.
- [ ] **Test Zoom:** "Test speaker & microphone" inside Zoom settings. Confirm the right input/output devices are selected.

---

## T-2 min

- [ ] **Sit down.** Spine straight, feet flat. Hands resting near keyboard.
- [ ] **Glass of water within reach.**
- [ ] **Phone face-down** on the desk — visible enough that you'll notice if it rings, hidden enough that you can't doomscroll.
- [ ] **Smile.** Just once, into the camera, before you join. Camera reads warmth before words.
- [ ] **Open the Zoom link.** Click "Join with Computer Audio."
- [ ] **Camera ON. Mic OFF** until the moderator names you.

---

## During the call

- **When introduced:** smile, count one second, then go. Do not start mid-introduction.
- **Pause 1 second before answering each Q.** Signals thoughtfulness. Prevents over-talking.
- **Eye contact** is the lens, not the gallery view. Pin a face card next to your camera if it helps.
- **Keyboard shortcuts in your hand:**
  - `→` / `space` — next slide
  - `1` — jump to live demo (if a judge interrupts and asks to see the product)
  - `b` — blackout (pull focus during a tangent)
  - `f` — fullscreen toggle
  - `?` — keyboard cheatsheet (if you forget)

---

## Backup contingencies — read these once now, do not re-read during the call

| Failure | Recovery (≤10 sec) |
|---|---|
| Tunnel returns non-200 mid-pitch | Press `1` (jumps to demo slide) → if iframe is blank for 2s, JS auto-falls-back to Loom embed; if not, switch browser tab to Loom backup. **Voiceover:** "Same flow, recorded earlier — let me walk you through it." Do NOT apologize. |
| Zoom audio dies (you can't be heard) | Pin chat. Type: *"audio dropped — switching to phone now"*. Click "More → Switch to Phone Audio" in Zoom. Dial the phone number Zoom shows. Keep screen-share running. |
| Their audio dies (you can't hear judges) | Pin chat. Type: *"I can't hear — please type the question."* Wait. Continue when typed. |
| Deck won't load at all | Open the PDF fallback: `docs/pitch/aarogya_finalist.pdf` (Chrome → Print → Save as PDF — do this NOW at T-20 if you haven't). Share screen with the PDF instead. |
| Total brain freeze on a Q&A question | "*That's a great question — I want to give you a precise answer. Can I follow up over email after the call?*" Then move on. Do NOT bullshit a healthcare judge. |
| Judge interrupts mid-pitch | Stop talking. Listen fully. Answer in ≤20s. Bridge: "*— and that ties directly into [next slide topic], which I'll show you now.*" Press `→`. |

---

## After the call — first 10 minutes

- **Stay on camera, on mute** through the rest of the finalist round. Watching the other teams is intel for the venture-track follow-up. Take 1–2 notes on each.
- **Do NOT post in Discord/Slack** until the awards ceremony ends.
- **DMs during the call:** one-line acknowledgment + "let's talk after the ceremony."

The post-pitch thank-you templates are in `RUN_OF_SHOW.md` — send those within 60 minutes of the ceremony ending.

---

**You have done the work. The pitch is the easy part. Walk in like the thing already won.**
