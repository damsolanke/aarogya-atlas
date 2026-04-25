# Demo Script — Hack-Nation 2026 Challenge 3

Two videos. Read each line into the camera. Stay within the time budget.

---

## 60s PRODUCT DEMO (judges' first 60 seconds matter most)

> **Format:** Screen capture of `localhost:3000`, no face-cam needed.
> **Soundtrack:** Voice over only. No music.
> **Resolution:** 1920×1200 minimum. **File size:** ≤ 50 MB.
> **Recording:** macOS QuickTime → File → New Screen Recording → record
> the Edge window only (option-drag to crop).

---

### 0:00 — 0:08 — The human problem (idle hero on screen)
**SAY:**
> *"In rural India, a postal code can decide a lifespan. A family loads
> into a bus at 5 AM, travels three hours, and learns the dialysis
> machine broke yesterday. This is the Discovery problem the spec asks
> us to solve."*

**ACTION:** Idle hero state. Cursor hovers over "10,000 facilities · trust-scored · all India" pill.

---

### 0:08 — 0:18 — Ask the question (click the ECG suggestion)
**SAY:**
> *"Watch. A family near Yeshwantpur, Bengaluru needs an ECG today,
> Ayushman Bharat eligible."*

**ACTION:** Click the suggestion chip *"ECG, today, Ayushman Bharat — Yeshwantpur, Bengaluru"*.

---

### 0:18 — 0:33 — The agent reasons (live status chip animates)
**SAY:**
> *"Claude Opus 4.7 with adaptive thinking coordinates twelve tools —
> geocode, facility search, on-device PHI extraction, Trust Scorer,
> Validator, total ₹ cost, journey estimate. The status chip shows the
> live activity. PHI tools carry an on-device badge so judges can audit:
> nothing private touches the cloud."*

**ACTION:** Camera stays on the chat panel. Status chip cycles through
"Locating · Searching facilities · Trust-scoring · Validating evidence."

---

### 0:33 — 0:48 — The answer that matters (cards slide in)
**SAY:**
> *"Three tiers. Best match — Dr Prabhakar's Clinic, two-point-seven
> kilometres, four hundred eighty-four rupees total — including the bus
> fare AND the lost MGNREGA wage. Trust score sixty-five. Validator
> WARN. Closest payer-eligible. Backup. And — the words to ask the
> receptionist over the phone, in their language."*

**ACTION:** Cards render in sequence. Cursor highlights the "₹484
total · 2.7km · Trust 65/100" pill row, then the cyan "Ask the
receptionist" callout.

---

### 0:48 — 1:00 — The map proves it (numbered pins + route)
**SAY:**
> *"On the map: numbered ranked pins, OSRM driving route, three-D
> buildings. And the medical-desert overlay — every red halo is a
> district where less than five percent of facilities offer dialysis.
> NGO planners can ask 'where in Bihar is dialysis weakest' and get an
> actionable list. Aarogya Atlas — the right hospital, before the
> journey begins."*

**ACTION:** Pan across map showing pins 1, 2, 3. Toggle dialysis
overlay. Closing shot: full India view with red halos.

---

## 60s TECHNICAL DEMO (for judges who skim the README)

> **Format:** Half screen capture (Databricks workspace), half code editor.
> **Voice:** Dry, factual. No marketing tone.

---

### 0:00 — 0:12 — The agent loop (open `apps/api/aarogya_api/agent.py`)
**SAY:**
> *"Manual streaming loop using the official Anthropic SDK. No
> LangGraph, no LangChain. Twelve tools, max fourteen iterations,
> adaptive thinking with effort high. Thinking signature blocks
> preserved across turns so the model can build on its own reasoning.
> Server-Sent Events to the frontend."*

**ACTION:** Scroll through `agent.py` showing `messages.stream()`,
`tool_use` handling, signature preservation.

---

### 0:12 — 0:25 — Trust Scorer + Validator (`trust.py`)
**SAY:**
> *"Trust Scorer. Seven contradiction rules — the spec example
> 'advanced surgery without anesthesia' is rule one. Four metadata
> signals. Severity-weighted. Eighty-percent confidence interval via
> bootstrap perturbation. Validator agent re-checks high-stakes claims
> against the source text — PASS, WARN, or FAIL with cited evidence."*

**ACTION:** Show `_RULES` dict in trust.py, the `bootstrap_ci()`
function, then `validate_recommendation()`.

---

### 0:25 — 0:42 — Live in Databricks (workspace dbc-12ce3b55)
**SAY:**
> *"Live in our Databricks workspace. Unity Catalog with three schemas
> and a PHI column-mask UDF — patient phone is masked at read time for
> non-admins. Genie Space NL-to-SQL over the facilities table —
> Maharashtra fifteen-oh-six, UP one-thousand-fifty-eight. Mosaic AI
> Vector Search with Delta Sync Index and managed BGE embeddings.
> MLflow three observability — every supervisor turn, every tool call,
> a span at slash Shared slash aarogya-atlas. Auto-detected as GenAI
> apps and agents."*

**ACTION:** Quick cuts —
- Catalog Explorer showing **Column mask** badge on `patient_phone`
- Genie Space query result with bar chart
- MLflow traces table (23 traces)

---

### 0:42 — 0:55 — Honest about limits
**SAY:**
> *"What's actually on-device: free-text PHI extraction with Qwen 32B,
> multilingual embeddings with bge-m3 — both via Ollama on Apple
> Silicon. What is NOT on-device today: the user's natural-language
> query, which goes to Claude Opus four point seven. For an enterprise
> deployment inside a hospital VPC, the supervisor moves to Mosaic AI
> Model Serving with the same OSS weights — same trust boundary, no
> PHI egress. Documented in DATABRICKS_DEPLOYMENT dot M D."*

**ACTION:** Show `local_llm.py` Ollama wrapper. Then open
`docs/DATABRICKS_DEPLOYMENT.md` and scroll the production port mapping.

---

### 0:55 — 1:00 — Why us
**SAY:**
> *"Twenty-four hours. All MVP plus all stretches. Aarogya Atlas."*

**ACTION:** Show README hero screenshot. Cut.

---

## Recording checklist

- [ ] Close all distracting tabs (especially the user's WhatsApp).
- [ ] Set Edge zoom to 110% so text reads on a phone.
- [ ] Toggle dark-mode menu bar to remove the orange "Claude is debugging" bar (or crop it out in post).
- [ ] Use macOS *Do Not Disturb* to mute notifications.
- [ ] Record audio with the *iPhone microphone* via Continuity Camera, not the laptop mic.
- [ ] Two takes per video. Pick the cleaner one. Don't over-edit.
- [ ] Upload to **YouTube unlisted**. Devpost requires a hosted link.
- [ ] Final filenames: `aarogya-atlas-product-60s.mp4`, `aarogya-atlas-tech-60s.mp4`.

## Submission moment

- [ ] Flip GitHub repo to **public** (Settings → Danger Zone → Make public).
- [ ] Confirm `apps/api/.env` is NOT in the repo (`git ls-files | grep .env`).
- [ ] Run `./scripts/build_submission.sh` and verify the secret scan reports `0 hits`.
- [ ] Submit at [`projects.hack-nation.ai`](https://projects.hack-nation.ai) **before Sun Apr 26, 9:00 AM ET**.
