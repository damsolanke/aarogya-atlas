# Pitch package — start here

**When the finalist Zoom invite lands, open `RUN_OF_SHOW.md` first.** Everything else flows from it.

## What's in this folder

| File | Purpose |
|---|---|
| **`RUN_OF_SHOW.md`** | The single doc you need open during the call. Pre-call checklist, slide cues, Q&A patterns, post-pitch templates |
| **`backup.html`** | **PRIMARY DECK.** 11-slide cinematic Reveal.js deck — typed-on hook, live-iframe demo, layered architecture, animated proof grid, silent closer |
| `HTML_AUDIT.md` | What separates cinematic decks from default Reveal — references and rationale for the design choices |
| `SCRIPTS.md` | 4 pitch lengths: 15s elevator, 60s standup, 3-min finalist, Q&A bridges |
| `QA_PREP.md` | 20 likely questions × 30-sec answers, organized by axis |
| `GAMMA_LINK.md` | Fallback Gamma deck (only if HTML deck breaks) + theme override + PDF export steps |

## Live and verified

- ✅ **Primary deck running at http://localhost:8888/backup.html** — 11 slides, RevealNotes plugin loaded, Instrument Serif + Tiro Devanagari Hindi + Geist + Geist Mono all loaded, no horizontal overflow at 393px mobile
- ✅ Cinematic moments: typed-on आरोग्य glyph hook, animated number countup on Proof slide, silent black closer
- ✅ Live demo iframe lazy-loads the cloudflare tunnel on slide visit · falls back to Loom MP4 if tunnel times out
- ✅ Speaker view (`s`), keyboard cheatsheet (`?`), demo-jump hotkey (`1`), blackout (`b`), fullscreen (`f`), overview (`o`)
- ✅ Deep links: `#/slide-hook`, `#/slide-demo`, `#/slide-arch` (Q&A architecture reference)
- ✅ Print stylesheet (Chrome → Print → Save as PDF, Background graphics ON)
- ✅ Mobile reflow at 393px — single-column, fonts scaled
- ✅ Open Graph + Twitter card meta tags for clean Slack/Discord previews
- ✅ Live tunnel: https://formal-rogers-poster-meanwhile.trycloudflare.com (HTTP 200)
- ✅ Loom backup: https://www.loom.com/share/5f67de77c1f24328b5d395275d07f249
- ✅ Public repo: https://github.com/damsolanke/aarogya-atlas (frozen at `08827b3`)

## Closer (memorize)

> **From symptom, to care.**

Used as the closing line on every script length. Same line lands as a tweet, a follow-up email subject, a slide title.

## Keyboard cheatsheet (in the deck — press `?`)

| Key | Action |
|---|---|
| `→` `←` | Next / previous slide |
| `S` | Open speaker view (script + timer + next-slide preview) |
| `F` | Fullscreen |
| `O` | Slide overview grid |
| `B` | Blackout (pull focus during Q&A) |
| `1` | Jump to live demo slide |
| `?` | Show this cheatsheet inside the deck |
| `ESC` | Exit overview / cheatsheet |

## How to test before the call (2 minutes)

```bash
# 1. Confirm the pitch server is up
curl -sI http://localhost:8888/backup.html | head -1
# expected: HTTP/1.0 200 OK

# 2. If not, restart it
cd /Users/adesolanke/code/hacknation-2026/docs/pitch && python3 -m http.server 8888 &

# 3. Open the deck in Chrome
open -a "Microsoft Edge" "http://localhost:8888/backup.html"

# 4. In the deck, press these in order:
#    f → enter fullscreen
#    →→→→→ → walk through the first 5 slides
#    s → open speaker window in a second tab
#    1 → jump to demo slide; verify the iframe loads the live product
#    ? → confirm the cheatsheet overlay appears
#    Esc → close cheatsheet
#    Home → return to slide 1
#    f → exit fullscreen
```

If any of those fail, the deck has regressed — check `/tmp/pitch_server.log` and reload.
