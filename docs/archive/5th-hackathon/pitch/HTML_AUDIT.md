# HTML deck audit — what makes a deck feel like Anthropic/Vercel/Linear keynote vs. a 2014 lecture

Reference points reviewed: revealjs.com demo, lab.hakim.se/reveal-js (now revealjs.com), Pitch.com gallery (page-blocked, reasoned from known templates), Anthropic + Vercel + Linear public keynotes (visual recall).

## Top 10 specifics that separate cinematic decks from default Reveal

### 1. Type does the work, not transitions
Editorial decks use Instrument Serif, Tiempos, Untitled Serif, GT Sectra at 80–140px for headlines. Sans-serif body in Inter/GT America/Geist at 18–22px max. Tiny mono labels (Geist Mono/Berkeley Mono) at 11–14px in `letter-spacing: 0.08em` uppercase as tags. Lecture decks default to a single 32px sans for everything — that's the giveaway.

### 2. One object per slide
70%+ of slides should have a single hero element — one number, one sentence, one image, one quote. McKinsey-style 3-column-3-bullets blocks scream consulting. Editorial decks let whitespace do work. The eye lands and rests.

### 3. Backgrounds are bleed-to-edge, not framed
Reveal's default puts slides in a centered card with margins. Cinematic decks use `data-background-color` and full-bleed compositions where elements touch the slide edges deliberately. Background transitions — `data-background-transition="fade"` at 200ms — between slides feel like film cuts.

### 4. Numbers are objects, not data
Reveal-default numbers sit in `<p>` tags. Editorial decks treat each number as a typographic event: serif at 200+px, mono label below at 14px, occasional countup animation. The number IS the slide.

### 5. Color is a meaning system, not decoration
Linear uses purple for "in progress", red for "blocked", grey for "done" — color carries information. Slop decks use color for variety. Our saffron `#E8923D` should appear only where it means *active / live / now*; teal `#14B8A6` only where it means *trust / verified*. Discipline reads as intention.

### 6. Auto-Animate is the secret weapon
Reveal's `data-auto-animate` matches elements between slides and morphs them. A number can grow from 1,000 to 10,000 between two slides, a card can shrink and rotate. Used sparingly (3–4 times in a 10-slide deck), it produces "wait, did the slide just *do* that?" moments. Default Reveal users almost never touch it.

### 7. Iframe slides for live content
Default Reveal users put screenshots of their app on slides. Cinematic decks embed the actual app via `<section data-background-iframe="...">`. The deck becomes a tour of the live product, not a museum of screenshots. This is the single biggest gap between AI-built decks (Gamma) and a hand-crafted Reveal deck.

### 8. Speaker view is wired up properly
Reveal has built-in speaker view (`?speaker` URL flag, or press `s`). 95% of users never configure it. Cinematic presenters add: speaker notes per slide, a working countdown timer with color shifts, next-slide preview, and custom hotkeys. The presenter looks unflappable because they have a teleprompter.

### 9. The hook is timed, not stated
Default deck slide 1: company logo, title, date, presenter name. Boring. Cinematic decks open with a typing animation, a 2-second cinematic glyph reveal, or a single arresting sentence with no chrome. The audience leans forward in the first 2 seconds.

### 10. The closer is silence
Default decks end with "Thank you. Questions?" — a Q&A solicitation. Cinematic decks end with the brand's closer line in 96px+ Instrument Serif on a black slide, then SILENCE for 3-5 seconds before "happy to take questions." Restraint is loud.

## Anti-patterns to avoid

- Bullet lists (always re-cast as fragments or separate slides)
- Footer with logo+date+pagination on every slide (kills the cinema)
- Stock photos / icon libraries (Heroicons, Material Icons, Lucide) — instant tell
- Default Reveal theme (white-on-black serif looks like a math conference)
- Click sound effects on advance (slop)
- "Thank You" as a closing slide
- Dual-column layouts with image-left text-right (consulting deck DNA)
- Animated GIFs (low-fi)
- Charts that aren't your own (use the live product's actual chart, not a generated bar chart)

## What we will ship

1. **Hook**: typed-on आरोग्य glyph SVG stroke animation → fade to "From symptom, to care."
2. **Hero/intro slide**: massive saffron `In rural India, a postal code can decide a lifespan.` with sub-tagline below in mono
3. **Problem slide**: one giant number `10,000` with `facilities` mono label and a single sentence below
4. **What it is**: full Devanagari आरोग्य at 12em + one-sentence product description
5. **Live demo slide**: full-bleed iframe of the live tunnel, pre-loaded query, brand frame around it
6. **Three moats**: each on its own slide, ordinal saffron + Instrument Serif headline + 1 sentence
7. **Architecture reveal**: 4 fragment-stepped layers (User → Agent → Databricks → Data), each fading in with a 1-second pause
8. **Proof grid**: 6 number tiles, react-countup-style ease-in animations
9. **Vision/ask slide**: where this goes next, in calm clinician voice
10. **Closer**: black slide, "From symptom, to care." in 96px Instrument Serif, hold 5 seconds before speaking

Plus speaker view, deep links, Open Graph card, print-to-PDF stylesheet, mobile reflow, offline assets, custom keyboard cheatsheet on `?`.
