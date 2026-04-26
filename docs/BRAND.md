# Aarogya Atlas — brand system

_3-color signature, anti-slop typography, voice. Codified so every new component compiles to the same identity._

## Palette (3 + 2 utility)

| Role | Token | Hex | Where |
| --- | --- | --- | --- |
| **Saffron** (warm primary, Indian flag, healthcare-warm) | `--accent-saffron` | `#E8923D` | brand wordmark, primary CTA, route polylines, brand pulse |
| **Deep Ink** (clinical authority) | `--bg`, `--bg-elevated` | `#070A12`, `#0E1320` | page background, nav, plate cards |
| **Healing Teal** (Aarogya = wellness) | `--accent-teal` | `#14B8A6` | success states, validator PASS, "in stock" |
| Critical Red (utility) | `--danger` | `#EF4444` | desert halos, FAIL, stockout chip |
| Caution Amber (utility) | `--warning` | `#F59E0B` | trust WARN, partial coverage, "verify" |

**Banned forever:**
- The generic emerald → cyan → violet headline gradient (was on 5 routes — every AI startup uses it)
- Pink/purple sparkle pairings
- Tailwind-default zinc-50/zinc-200/zinc-400 stacks for h1

## Typography

| Role | Font | Weight | Use |
| --- | --- | :-: | --- |
| **Display** | **Instrument Serif** (Italic-capable) | 400 | All h1, hero numbers, tier badges |
| **Sanskrit** | **Tiro Devanagari Hindi** | 400 | आरोग्य wordmark, Hindi quotes |
| Body | Geist Sans | 400-500 | All paragraph + UI text |
| Mono | Geist Mono | 500 | facility ids `vf-*`, tool names, code |

**No more font-default headlines.** Every h1 must be Instrument Serif, italic for the tagline.

## Voice — "calm clinician with a stopwatch"

- **Authoritative**, not breathless. *"Trust Score 65/100, CI [50, 95]"* not *"Wow! Trust score is 65!"*
- **Specific**, not generic. *"Bright Hospital, 2.7 km, ₹484"* not *"Found a great option for you"*
- **Numerate**. Every claim has a number. Every number has a unit.
- **Short**. Doctors read while walking. Sentences are imperative or single-clause.
- **Never** uses: "Powered by AI", "Reimagine", "AI-native", "Discover", "Explore", "Get started", "Try Aarogya", "Just type below"
- **Always** uses domain verbs: *triage, route, score, verify, surface, refer, validate*

## Iconography (Phase F item 3)

Lucide is the AI-startup default. Replace these 6 with Phosphor or hand-drawn:
- Activity (brand) → custom **stethoscope-with-map-pin** SVG
- Sparkles (agent) → Phosphor `RoboldClerc` or hand-drawn **mortar-and-pestle**
- ShieldCheck (PHI) → Phosphor `ShieldStar`
- Wallet (cost) → Phosphor `Coins`
- Camera (triage) → Phosphor `CameraPlus`
- AlertTriangle (desert) → custom **droplet-half-empty**

Keep Lucide for utility icons (chevrons, arrows, x-mark) — those are conventions, not vibes.

## Motion

- **Default ease:** `cubic-bezier(0.16, 1, 0.3, 1)` (in-out smoothest)
- **Stat counters:** 1.6s ease-out, settle on a 1-tick rebound
- **Map markers:** drop with physics-bounce, max overshoot 4%, decay 200ms
- **Page transitions:** crossfade 250ms (no slide — slides feel like tutorials)
- **Reduced motion:** every animation respects `prefers-reduced-motion: reduce`

## Layout grain

- **Radius rhythm:** `rounded-md` (6px) for inline pills, `rounded-lg` (8px) for cards, `rounded-xl` (12px) for elevated cards. **No `rounded-2xl` chains** — that's the AI-slop tell.
- **Whitespace:** prefer 6/12/24 vertical rhythm. Cards have generous padding (px-5 py-4 minimum).
- **Borders:** 1px solid `--border` (zinc-800 fallback). No `ring-2` decorations except focus.
