# Aarogya Atlas — Pitch Scripts

Voice direction: **calm clinician with a stopwatch.** Authoritative, specific, never breathless. Trust the numbers and the product. Don't sell — describe.

---

## 1. The 3-minute finalist pitch (PRIMARY)

**Target delivery: 2:45 actual. Total spoken words: ~340. Slides: 9.**

Cues:
- `[SLIDE n]` = advance slide
- `[PAUSE]` = ~1s breath
- `[DEMO]` = video plays / live action
- *italics* = emphasis word

---

### 0:00 — Hook

`[SLIDE 1: hero — saffron Instrument Serif on deep ink: "In rural India, a postal code can decide a lifespan."]`

> "In rural India, a postal code can decide a lifespan." `[PAUSE]`
>
> "A family loads onto a bus at 5 AM, travels three hours, and learns the dialysis machine broke yesterday."

**Time check: 0:13.**

---

### 0:13 — Problem

`[SLIDE 2: Virtue Foundation 10,000 logo + a real clinic listing showing the contradiction]`

> "The Virtue Foundation publishes the most comprehensive open registry of Indian healthcare — ten thousand facilities. But it's messy, contradictory, unsearchable for a non-expert."
>
> "Google Maps and ChatGPT return distance and platitudes. They miss the clinic that lists *Advanced Surgery* — but has no anesthesiologist."

**Time check: 0:33.**

---

### 0:33 — What it is

`[SLIDE 3: आरोग्य wordmark in Tiro Devanagari + one-line product statement]`

> "Aarogya Atlas is a *twelve-tool* agent that ranks those ten thousand facilities by trust, by rupee cost, and by drive time — in your language, with the exact words to say to the receptionist." `[PAUSE]`
>
> "English. Hindi. Tamil. Patient information never leaves your device."

**Time check: 0:54.**

---

### 0:54 — Demo

`[SLIDE 4: full-screen video / live demo at the cloudflare URL]`

`[DEMO starts. Voiceover sparse — let visuals breathe.]`

> "Watch. An ASHA worker types: *cardiac care, age sixty-seven, Bengaluru, two hours.*" `[demo plays — agent fires tools, ticker scrolls]`
>
> "Twelve tools in parallel. On-device for patient data." `[answer card renders]`
>
> "Twenty-two seconds. Three ranked clinics. Total cost in rupees. The Hindi sentence to ask the receptionist." `[map flies in, isochrones visible]`
>
> "The validator flagged this one as a *WARN.* We don't recommend silently."

**Time check: 1:54.** *(Demo segment 60s; voiceover ~25s of those 60s.)*

---

### 1:54 — The moat (Power of Three)

`[SLIDE 5: "Three things nothing else in this field shipped."]`

> "Three things nothing else in this field shipped." `[PAUSE]`

`[SLIDE 6: Multimodal triage — wound photo → triage card]`

> "*One.* Multimodal triage. Wound photo, X-ray, prescription — medgemma vision on-device, four seconds, structured output."

`[SLIDE 7: Drive-time isochrones + 108 ambulance icon]`

> "*Two.* Drive-time isochrones with multi-modal travel. Auto-rickshaw, public bus, or the free one-oh-eight ambulance."

`[SLIDE 8: Equity counterfactual — Patna +10 beds → 70 averted deaths]`

> "*Three.* Equity counterfactual planner. Add ten obstetric beds in Patna — avert seventy maternal deaths per year."

**Time check: 2:24.**

---

### 2:24 — Traction & proof

`[SLIDE 9: numbers grid — 0 errors / 12 · 100/100 robustness · P95 49.5s · 67 commits · Mosaic VS verified]`

> "On Databricks: Mosaic AI Vector Search verified end-to-end while many teams in the channel remained blocked." `[PAUSE]`
>
> "Audit: zero errors across twelve queries, three languages. Robustness: one hundred percent static, one hundred percent dynamic, zero gap."
>
> "Sixty-seven commits in twenty-four hours. Solo build."

**Time check: 2:48.**

---

### 2:48 — Close

`[SLIDE 10: आरोग्य · From symptom, to care.]`

> "Aarogya means *without disease.*" `[PAUSE]`
>
> "WhatsApp for ASHA workers. Voice for elders. Write-back to India's national health stack." `[PAUSE]`
>
> "From symptom, to care."

**Time check: 3:00.** *(Walk off the close — silence sells confidence.)*

---

## 2. The 60-second standup pitch

For if Q&A is cut and you only get a minute. Same arc, compressed to 145 words.

> "In rural India, a postal code can decide a lifespan. A family travels three hours to learn the dialysis machine broke yesterday."
>
> "Aarogya Atlas is a twelve-tool agent over the Virtue Foundation's ten thousand Indian healthcare facilities. It ranks them by trust, by rupee cost, by drive time — in English, Hindi, or Tamil. Patient information stays on the device."
>
> "Three things nothing else built: medgemma vision triage on a wound photo in four seconds; drive-time isochrones with the free one-oh-eight ambulance; and an equity planner that says *add ten obstetric beds in Patna, avert seventy maternal deaths per year.*"
>
> "Mosaic AI Vector Search live in Databricks. Zero errors across twelve audited queries. Sixty-seven commits, solo, in twenty-four hours."
>
> "From symptom, to care."

---

## 3. The 15-second elevator

For the cold open of any networking moment, recruiter call, or hallway encounter.

> "Aarogya Atlas — a twelve-tool agent that ranks ten thousand Indian healthcare facilities by trust, cost, and drive time, in your language, with patient data on-device. Built solo for Hack-Nation. Demo's live."

(40 words, ~13 seconds. Leaves 2 seconds of eye contact before they ask.)

---

## 4. Q&A bridge phrases

Universal patterns for when you don't know an exact answer or want to redirect to your strength. Memorize three of these.

**4a. The "I don't have the exact number but" bridge:**

> "I don't have the exact number in front of me, but the auditable evaluation in the repository — `docs/EVAL_REPORT.md` — has the twelve-query breakdown. The pattern is: P95 forty-nine seconds, zero errors, three languages cleared. Happy to walk through any specific query after the call."

**4b. The "we made a deliberate choice" bridge** (when challenged on a missing feature):

> "That's a fair pull. We deliberately scoped to [thing we shipped] over [thing we didn't] because [why — clinical risk / data availability / on-device privacy / etc.]. The next milestone is [thing they asked about]."

**4c. The "compare to baseline" bridge:**

> "We measured this against ChatGPT and Google Maps on fourteen healthcare-specific capabilities the spec named. We hit fourteen. They hit zero each. The audit is in `docs/RUBRIC.md`."

**4d. The "moat lives in three places" bridge:**

> "Our moat lives in three places. One — multimodal triage on-device, which Maps and ChatGPT cannot replicate without leaving the cloud. Two — clinical pathway routing for snakebite, STEMI, neonatal sepsis, the high-stakes scenarios. Three — Trust Score with bootstrap confidence intervals plus a Validator agent. None of those are templated."

**4e. The "go check the live demo" bridge** (always have this ready):

> "The fastest way to answer that is to try the live demo at the URL on slide one. The exact query you're describing is something the agent handles — let me show you in the chat after pitches close."

---

## Delivery rules (read before recording or rehearsing)

1. **Land the time.** 2:45 actual. If you finish at 2:30, you sounded rushed. If you finish at 3:05, you went over and signaled lack of discipline.
2. **No filler words.** "Um", "like", "basically", "kind of", "actually", "so". Replace with `[PAUSE]`.
3. **No apology language.** Never say "I wish we had time to..." or "We didn't get to...". Project authority over what shipped.
4. **Talk to one person at a time** even on Zoom — pick a single thumbnail and address them directly for each beat. Move to the next thumbnail at slide change.
5. **Smile during the close.** "From symptom, to care." with a slight smile lands different than the same words flat.
6. **Walk off silence.** After the close, stop talking and look at the camera for 1 second before "Happy to take questions." Confidence sells.
