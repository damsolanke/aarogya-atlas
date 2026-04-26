# Anti-slop audit — Aarogya Atlas

_Audit date: 2026-04-26 03:00 UTC. Reference apps studied: linear.app, vercel.com, anthropic.com, mapbox.com, raycast.com, railway.app, arc.net._

## Slop telltales found in our codebase

| # | Location | Telltale | Fix |
| - | --- | --- | --- |
| 1 | `IdleHero.tsx:48`, `architecture/page.tsx:72`, `compare/page.tsx:188`, `equity/page.tsx:66`, `eval/page.tsx:79` | Identical `bg-gradient-to-br from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text` h1 on all 5 routes | Replace with Instrument Serif italic in saffron/teal accent. Each h1 gets one accent color, one weight |
| 2 | `Header.tsx:79`, `IdleHero.tsx:122/123`, `FinalAnswer.tsx:78/80` | `bg-gradient-to-br from-emerald-400/20 via-cyan-500/20 to-violet-500/20` brand gradient on logo + cards | Saffron-only soft glow `shadow-[0_0_30px_rgba(232,146,61,0.18)]` |
| 3 | All h1s use Geist Sans semibold | Default Inter/Geist sans for headlines | Pair with **Instrument Serif** display face |
| 4 | आरोग्य rendering in browser-default Devanagari | No real Devanagari font loaded | Load **Tiro Devanagari Hindi** via Next.js Google Fonts |
| 5 | `compare/page.tsx:126` | `chatgpt: "Try Apollo Hospital"` — slop verb | Already in our voice: replace with *"Apollo Hospital, generic suggestion"* |
| 6 | 14 files importing `lucide-react` | Lucide is the AI-startup default icon set | Replace 6 brand-critical icons with Phosphor or custom SVG (per BRAND.md) |
| 7 | 4 instances of `rounded-2xl` chained with `shadow-2xl backdrop-blur-sm` | "Glassmorphism" trope | Move to `rounded-lg` rhythm (6/8/12) |
| 8 | `Suggestions.tsx:50` | `purple: { ring: "hover:ring-violet-500/40", icon: "text-violet-300", glow: "from-violet-500/10" }` | Drop violet from palette entirely; use saffron + teal + ink |
| 9 | `LiveStatus.tsx`, `LiveOps` etc. — generic chip aesthetics | Identical to every shadcn/Linear-clone | Replace with monospace tickers (think Bloomberg terminal): `cardiology · 0.61 · 340ms` |
| 10 | Hero CTA missing | No primary CTA — judges expect one | Add a primary "Triage a photo" or "Find an ICU" inline button as a serif-italic call-out |

## Reference patterns to STEAL

From **linear.app**:
- Restraint. Almost no animation. One signature green. Type does the work.
- Monospace for IDs (`ENG-1234`).

From **anthropic.com**:
- Editorial serif headlines (Söhne or similar).
- Warm tan/beige palette — humanises AI.

From **vercel.com**:
- Numbers as the hero. Aligned-decimal type.

From **mapbox.com**:
- Map IS the hero. Custom cartography in brand colors.
- Cartouche-style legends with mono labels.

From **arc.net**:
- Playful, opinionated micro-copy ("squiggle stuff", "sidekick").
- Color-coded keyboard shortcuts inline.

From **raycast.com**:
- Pixel-precision. ⌘K bar even when you're not searching.
- Documentation reads like a friend.

## Fix priority (ship in this order)

1. **Typography pass** — load Instrument Serif + Tiro Devanagari Hindi; replace all 5 h1 gradients with serif-italic + saffron underline
2. **Drop the violet** — Suggestions.tsx + Header logo + IdleHero sample-card all stop using `from-violet-500/...`
3. **आरोग्य wordmark** — render in Tiro Devanagari Hindi at +20% size, with hover-reveal etymology
4. **Mono tickers** — LiveOps + system bar use mono with vertical bars: `vf-3263 │ trust 65 [50-95] │ 31.7s`
5. **Editorial timestamps** — every result card stamps with "Computed 2s ago · VS query 340ms · Index synced 4m ago"
6. **Logo glyph** — replace Activity icon with custom stethoscope-pin SVG
7. **Voice rewrite** — IdleHero subtitle: *"Find me cardiac ICU within 40 km of Yeshwantpur"* (specific) replaces *"Ask in any language"* (generic)
8. **404 + ⌘K palette** — Phase H signature moments
9. **Print-optimized recommendation** — Phase H
10. **Reduced-motion fallback** — wrap all framer-motion in respect for prefers-reduced-motion

## What we WON'T do (rejected as slop or low-impact)

- Cyan-to-pink gradient mesh background
- Glassmorphism on top-bar (already minimal)
- Confetti on save (low signal-to-effort)
- "AI-native" or "Reimagine" copy (we never had these)
