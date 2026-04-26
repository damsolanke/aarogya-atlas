# Forensic Slide-by-Slide Audit — v2 → v3

**Methodology disclosure (corrected):** I CAN take screenshots — `screencapture` and Microsoft Edge headless `--screenshot=` both work, and `Read` on PNG paths gives me actual pixels. I was wrong in the previous block when I claimed I couldn't. This audit is now backed by real visual verification at 1920×1080.

**Reference patterns indexed:** apple.com/iphone-15-pro hero, stripe.com/sessions, linear.app/method, vercel.com, claude.ai, awwwards SOTD, bruno-simon.com, igloo.inc.

---

## After-state — what shipped in v3

All 12 slides re-screenshotted at 1920×1080 with `?static=1&v=10` and `--enable-webgl --use-gl=angle`. Files at `/tmp/aarogya_audit/slide-*.png`.

### Slide 01 — Hook · `#slide-hook`

| Before (v2) | After (v3) |
|---|---|
| Flat Devanagari `text-shadow: 0 0 60px` glow | **Real Three.js scene** via troika-three-text + three.js@0.160 ESM. आरोग्य rendered as SDF text on a plane in 3D space, MeshStandardMaterial with `emissive: 0x6b3a14`, `outlineBlur: 0.5`, `outlineOpacity: 0.8`. Two-light setup (warm key `#ffb866` from upper-right, cool fill from lower-left). Particle field of 280 dust motes with additive blending and per-frame y-drift. Camera dollies forward over the first 2s (z: 14 → 11.8). |
| **Visual:** glyph at center, no light direction, no depth | **Visual:** glyph fills 70% of viewport, warm outline halo, "From symptom, to care." fade-in below at 1.8s. Confirmed in screenshot — saffron glyph with outline glow + tagline visible. |

**Cinematic moment 1: shipped.**

### Slide 02 — Problem · `#slide-problem`

Editorial italic serif headline with "a postal code" in italic saffron. Body trimmed to one paragraph. Large negative-space composition. Same as v2 — already Linear-grade. Did not regress.

### Slide 03 — What it is · `#slide-what`

आरोग्य at 11em (was 14em — overflowing) + h2 + body + ticker bar. Refit so all elements visible in viewport. CSS-only depth via text-shadow on the wordmark. Same as v2.

### Slide 04 — Live demo · `#slide-demo`

iframe of cloudflare tunnel with brand-coded glass frame (1px inset highlight + dual shadow + saffron-tinted glow). Pulsing `Live` indicator. Same as v2 — already strong.

### Slide 05 — Three things intro · `#slide-three`

Power-of-three triptych. Same as v2 — Linear-grade ordinal rhythm.

### Slide 06 — Moat 1 · Multimodal triage · `#slide-moat-1`

Italic ordinal "One —" + headline "Multimodal triage / on-device" + Power-of-Four phrase + paragraph + glass ticker. Ticker now uses `.glass` class with `backdrop-filter: blur(24px) saturate(180%)` + 1px inset highlight + dual-shadow.

### Slide 07 — Moat 2 · Multi-modal travel · `#slide-moat-2` ⚠️ FIXED

| Before (v2) | After (v3) |
|---|---|
| 🚗🚌🚑 platform-rendered emojis (broke brand discipline) | **3 hand-drawn line-style SVG icons** (auto-rickshaw, public bus, ambulance) — single 1.5px stroke weight, `currentColor` so theme-tinted. 108 ambulance card uses `.featured` modifier with saffron border + saffron icon + saffron label. Cards have glassmorphism (`backdrop-filter: blur(20px) saturate(160%)` + inset highlight). |

### Slide 08 — India 3D map · `#slide-map` ⭐ NEW SLIDE

| Before (v2) | After (v3) |
|---|---|
| (slide did not exist) | **Real deck.gl 3D scene** via deck.gl@9.0.38 + maplibre-gl@4.7.1. ColumnLayer of 17 districts with `getElevation: d => d.disp * 80000` so Patna (7.7×) literally towers above Maharashtra (1.5×). Color-coded: orange for high-disparity (>4×), teal for low. ArcLayer of 3 recommendation arcs from Bengaluru. TextLayer labels for 7 high-disparity districts. Camera auto-cycles every 4.5s through 3 cinematic positions: wide India → Patna closeup → South India. 50° pitch. |
| | **Visual confirmed:** 3D cylindrical columns rendering at correct positions with pitched perspective, labels visible ("Trauma 4.5×", "Dialysis 7.0×", "Trauma 5.6×", "Neonatal 5.4×", "Oncology 4.4×"). Patna column visibly tallest. |

**Cinematic moment 2: shipped.**

### Slide 09 — Moat 3 · Equity counterfactual · `#slide-moat-3` ⚠️ FIXED

| Before (v2) | After (v3) |
|---|---|
| `Add 10 → avert ~70` at body-text size, buried | `~70` is now the **9em saffron hero number** with `add 10 →` mono prefix on the left and `MATERNAL DEATHS AVERTED/YEAR · PATNA` mono label aligned to baseline. "A planning tool, not a chatbot." closer in italic saffron at 1.4em on its own line. |

### Slide 10 — Proof · `#slide-proof` ⚠️ FIXED

| Before (v2) | After (v3) |
|---|---|
| Numbers showed mid-animation values in static screenshots (3,450 / 35/100 / 10.9s / 23 / 5/14 — wrong) | `?static=1` URL flag bypasses countup and shows final values immediately for screenshots/PDF. Live mode still gets countup with variable-font weight oscillation (`font-variation-settings: "wght" 200 → 700` over 1.4s). Final values verified in screenshot: **10,000 / 0/12 / 100/100 / 31.7s / 67 / 14/14**. |

### Slide 11 — Architecture · `#slide-arch` ⚠️ FIXED + PROMOTED

| Before (v2) | After (v3) |
|---|---|
| Hidden behind hash deep link. 4 layers had `class="fragment fade-in"` so they all rendered invisible until manually advanced — totally empty in static screenshots. | **Promoted to slide 11 in main flow.** CSS `transform-style: preserve-3d` with `perspective: 1400px`. Each layer gets a different `translateZ` (User: +80, Agent: +40, Databricks: 0, Data: -40). Parent stack is `rotateX(18deg) rotateY(-8deg)` with a 16s `archDrift` keyframe animation that subtly tilts back and forth. Glass layers, color-coded left borders. |
| | **Visual confirmed:** 4 floating planes with real CSS perspective depth, glass backgrounds, color-coded borders (saffron for Agent, teal for Databricks). Reads as a 3D scene, not a list. |

**Cinematic moment 3: shipped.**

### Slide 12 — Closer · `#slide-closer` ⚠️ FIXED

| Before (v2) | After (v3) |
|---|---|
| `opacity: 0` default with transition — black void in static screenshots | Default opacity 1 + transform 0. `.animate-in` class added by JS only on slidechanged → animation replays on each visit. Static screenshots show the closer at full opacity. |

---

## Cross-cutting upgrades shipped (apply to ALL slides)

1. **Custom cursor** — 14px circle with 1.5px saffron border, `mix-blend-mode: difference`, scales 2.4× and fills saffron on hover over interactive elements. RAF-driven smoothing with 0.18 lerp.
2. **Glassmorphism on cards** — `.glass` class with `backdrop-filter: blur(24px) saturate(180%)` + 1px inset highlight + dual-layer shadow (sharp small + soft large). Used on demo frame, transport cards, ticker, arch layers.
3. **Variable-font number breathing** — Inter Variable loaded with weight axis 200..900. `.var-wght` class transitions `font-variation-settings: "wght" 200 → 700` over 1.4s as the number lands. Numbers feel alive.
4. **Slide-advance audio (Web Audio)** — 880Hz sine, 50ms attack, 250ms exponential release, -28dB peak. Default muted. Toggle with `m`. Mute indicator at bottom-left shows current state.
5. **Open Graph + Twitter cards** — meta tags wired with `og:image` pointing to the live tunnel's `/og.png`.
6. **Splash screen** — pulsing saffron आ glyph during initial font load (auto-hides on `document.fonts.ready` or 1.5s timeout).
7. **Keyboard cheatsheet** — custom brand-styled overlay on `?` key. Lists arrows, S, F, O, B, 1, M, ?, Esc.
8. **Print stylesheet** — converts dark→light, freezes animations, page-breaks between slides, replaces iframe + map with URL text.
9. **Mobile reflow** — `@media (max-width: 768px)` collapses grids to single column, scales fonts, removes 3D perspective on arch.
10. **`?static=1` URL flag** — disables animations and forces all opacity-fade elements to opacity:1. Used for screenshot/PDF generation.

## Dependencies added

- three.js 0.160 (ESM) — `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`
- troika-three-text 0.49.1 (ESM) — for Devanagari SDF text
- deck.gl 9.0.38 (UMD) — `https://unpkg.com/deck.gl@9.0.38/dist.min.js`
- maplibre-gl 4.7.1 (UMD) — `https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js`
- Inter (Google Fonts, weight axis 200..900)

Total payload increase: ~800KB compressed across all CDN deps. Acceptable per the user's "600KB is nothing for a 3-min pitch" rule.

## Remaining known limitations

1. **Hook tagline + closer fade-in only fire on `slidechanged`** — if a judge deep-links to the slide via URL hash, the animation won't replay on initial load. Fix: also fire on `Reveal.on('ready')`. Low priority — natural slide-flow doesn't hit this.
2. **deck.gl basemap is solid black** — no road/region polygons. The columns + arcs alone communicate the data, but a vector tile basemap of India would be cleaner. Adding a CARTO dark basemap requires a key.
3. **Three.js hook glyph is flat SDF, not extruded geometry** — troika renders 2D text on a 3D plane. True extrusion would require a Devanagari font in JSON typeface format which doesn't exist out-of-the-box. The lighting and outline make it read as 3D anyway.
4. **No Lottie animations** — skipped because no specific moment in the script needs vector animation. The Three.js hook + deck.gl map cover the cinematic-moment quota.
5. **Custom cursor uses `cursor: none` on body** — works in browser but some judges may find it disorienting. Consider keeping the system cursor visible alongside the custom one.

---

## Reference comparison

I cannot side-by-side a screenshot of `apple.com/iphone-15-pro` next to our hook — that requires fetching the actual Apple page render which their JS-heavy site would block. Verbal comparison:

- **Apple iPhone hero pattern:** massive product render against a gradient background, oversized typography, scroll-driven 3D camera moves. Our hook hits 2 of 3 (massive + 3D scene); we don't have a scroll narrative.
- **Linear method pattern:** editorial italic headlines, mono labels, color-as-meaning, generous whitespace. Our problem/moat slides match this style.
- **Stripe Sessions pattern:** brand-color discipline (one accent), variable-font numbers, mid-keynote "moment" slides between info slides. Our proof + moat slides match this.
- **Vercel home pattern:** grid backgrounds, hover-state z-translate, mono labels everywhere. Our cards now match the glass+inset+shadow language.
- **Bruno-Simon-grade:** real Three.js with physics, particles, post-processing. Our hook + map ship Three.js + deck.gl WebGL respectively, no physics (not needed for a pitch).

The deck no longer "embarrasses us next to apple.com/iphone" for a 3-minute hackathon-finalist pitch deck. It does not ship Apple's bespoke type system or scroll-camera choreography because those are quarter-long product launches. It does ship 3 genuine WebGL moments + custom cursor + sound + glass + variable fonts — the craft signal the user demanded.
