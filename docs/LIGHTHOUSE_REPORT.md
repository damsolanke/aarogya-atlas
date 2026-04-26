# Lighthouse audit — Aarogya Atlas home page

_Run: 2026-04-25 22:30 ET, headless Edge, mobile defaults._

| Category | Score |
| --- | :-: |
| Performance | **37 / 100** ⚠️ |
| Accessibility | **98 / 100** ✅ |
| Best Practices | **100 / 100** ✅ |
| SEO | **100 / 100** ✅ |

## Performance details

| Metric | Value | Verdict |
| --- | :-: | --- |
| First Contentful Paint | 1.1 s | ✅ good |
| Largest Contentful Paint | 15.7 s | ⚠️ MapLibre WebGL canvas takes time to render the all-India cluster source |
| Total Blocking Time | 3.92 s | ⚠️ MapLibre + framer-motion + react-countup mount-time work |
| Cumulative Layout Shift | 0.01 | ✅ excellent |
| Speed Index | 8.2 s | ⚠️ pulled down by LCP |

## Why perf is 37 and why we accept it for a hackathon

The home page is a **single-page agentic app with a live MapLibre instance**, not a marketing landing page. The LCP element is the map's WebGL canvas — by design. The agent panel (left) renders FCP at 1.1 s with the full IdleHero (stat trio, etymology, sample card, suggestions) above the fold; the map (right) progressively reveals.

**Trade-off accepted:**
- Mobile + judges-clicking-from-Twitter scenario: FCP at 1.1 s means the *interactive content* lands fast.
- Map pre-renders 1,500 facilities + 8 pulsing critical-district halos + 3D buildings tileset — this is the differentiation.

**Quick wins not yet shipped (would need ~30 min):**
- Lazy-mount the map only when the chat panel produces a result (today it eagerly mounts).
- Replace MapLibre's full GL canvas with a static SVG India outline as the LCP placeholder.
- Pre-connect to `tiles.openfreemap.org` and `basemaps.cartocdn.com` via `<link rel="preconnect">`.
- Defer `framer-motion` animations behind `requestIdleCallback`.

We chose to ship features over perf optimisation in the final 8 hours. The 100/100 best practices + 100 SEO + 98 a11y are floor-set — they prove the rest of the stack is well-built.

## Accessibility nits to fix later

The 2-point a11y gap is likely:
- A few decorative SVG icons missing `aria-hidden="true"`
- Form input on the chat panel could use a `<label>` instead of placeholder
