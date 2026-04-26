# Hack-Nation 2026 — Intel Report

_Sweep date: 2026-04-25 21:30 ET. Submission deadline: 2026-04-26 09:00 ET._

## Sources walked

| Source | Status | Key extract |
| --- | --- | --- |
| [Hack-Nation main site](https://hack-nation.ai/) | ✅ | Sponsors: **Databricks (PLATINUM)**, DSV, Spiral, Fulcrum, **World Bank**, OpenAI/Supabase/Vercel/Lovable (API). Hubs: SF, Stanford, MIT, NYC, Paris, London, Linz, Munich, Dresden, Zurich, Yerevan, **Delhi**, GIKI. |
| [projects.hack-nation.ai](https://projects.hack-nation.ai/) | ✅ | "Submit Project" gated. Three Loom guides: How to Submit · Evaluating Projects · How to Pitch Like a Winner. |
| Loom: ["Evaluating Projects: Criteria for Success at HackNation"](https://www.loom.com/share/77ffd85173f14080b77832694636f65a) | ✅ (transcript via og:description) | **OFFICIAL RUBRIC: Technical Depth + Communication & Presentation + Innovation & Creativity, each rated 1-5.** Mandatory: tech video + accessible GitHub. *"The best projects will be invited to the next round."* — Kai (HackNation organizer) |
| Discord `#challenge-03-databricks` | ✅ | Linn Bieske (organizer): *"We don't have live support for the DataBricks challenge."* Multiple teams blocked on Vector DB. Lovable down. RealSmile + Malaika confirm working on Challenge 3. |
| Discord `#challenges` | ✅ | Cross-challenge channel; mostly off-topic (referral-code chatter). |
| Discord channel structure | ✅ | `#submissions`, `#q-and-a`, `#team-formation`, `#showcase`, `#general`. Hub-specific channels for SF, NYC, MIT, Stanford, Delhi, etc. |
| Red-team subagent | ✅ | 10-point plan to BEAT Aarogya. Top attacks: clinical pathway agents, dynamic adversarial eval, stockout overlay, ABHA write-back, multimodal vision. |

## STRATEGIC IMPLICATIONS — top 5 changes to ship NOW

### 1. **The actual rubric is THREE axes (15 pts), not the four-weight rubric we were optimizing for**
- Tech Depth (5) · Communication & Presentation (5) · Innovation & Creativity (5).
- The Challenge-3 spec rubric (35/30/25/10) is the *sponsor track* lens — both apply, but the GLOBAL HackNation score is the 15-pt tri-axis.
- **Ship:** README + /eval + pitch deck must explicitly map each section to the right axis. Lead with Innovation (parallel fan-out, bootstrap CIs, on-device PHI, validator) since that's the easiest 5/5.

### 2. **Tech video and GitHub are the judged artifacts, not the live demo**
- Loom guide states "tech video and GitHub code" must be accessible.
- **Ship:** README must be irresistibly good (banner + screenshots + quickstart in 5 sec) → DONE. Tech video must be recorded; storyboard exists.

### 3. **Many competing teams are BLOCKED on Databricks Vector Search; we already shipped it end-to-end**
- Discord shows multiple teams asking for Databricks help; organizer says "no live support."
- **Ship:** README hero must SHOW the live Mosaic VS query result table (we already have the screenshot + table). This is now a moat.

### 4. **Two named competitors (RealSmile, Malaika) are working Challenge 3 right now**
- They're early-stage ("looking for teammate" signals incomplete teams).
- **Ship:** Differentiate hard on Trust+Validator+Cost+Multilingual+On-device — the combination is unlikely to be matched by a team forming on Day 1.

### 5. **The red-team subagent named 10 attacks. Top 4 by ROI within remaining time:**
- a) **Clinical pathway agents** (`obstetric_emergency`, `snakebite_envenomation`, `neonatal_sepsis`) — wrap existing tools, add as system-prompt routing rules. ~2h.
- b) **Dynamic adversarial eval** — 50 mutated queries, report static-vs-robust accuracy gap. ~2h.
- c) **Stockout / supply-chain overlay** — antivenom · oxytocin · O2 with last-verified timestamps. Synthetic but visually striking. ~2h.
- d) **Equity counterfactual simulator** — slider on `/equity`: "Add N CEmONC beds in {district} → averted maternal deaths via gravity model + Six-Delays attribution." ~2h.

**Skipped from red-team list (high effort, lower confidence in remaining time):**
- WhatsApp/Twilio voice (6h+) — telephony setup risk
- Live outbound phone call (3h) — same reason
- Multimodal vision (3h) — model setup risk
- Federated learning (5h) — positioning only, low ROI
- ABDM/ABHA write-back (3h) — could ship as a single FHIR R4 referral JSON output (cheap version: 1h)

## Submission portal walk

Need to log in to capture the form. Loom guide #1 (How to Submit) is rate-limited; will retry. From the public landing:
- 4 video guides total (How to Submit, Judging Process, Pitch Like a Winner, plus a YouTube short)
- Submit Project button leads to gated form
- "Resend" privacy policy footer link suggests email-based confirmation flow

## Sponsor-specific prizes worth checking

- **Databricks** (Platinum): Challenge 3 IS their challenge. Already optimized for.
- **OpenAI / Supabase / Vercel / Lovable** (API sponsors): would only matter if we used their stack. We did NOT use OpenAI; we use Anthropic. Side-eye possible — but Anthropic is in our model card so OK.
- **World Bank**: cross-challenge equity prize? Worth probing. Our `/equity` page positions us well if it exists.

## Action queue (prioritized for next 4 hours)

1. ✅ Intel report written (this file)
2. Ship clinical pathway agents (2h) — Top-1 differentiator
3. Ship dynamic adversarial eval (2h) — Tech Depth lift
4. Ship stockout overlay (2h) — Visual + Discovery-rubric lift
5. Ship equity counterfactual slider (2h) — Social Impact lift
6. Update README/pitch to lead with the 3-axis rubric framing
7. Phase B: write RUBRIC.md + JUDGE_SIM.md
8. Phase D: SUBMISSION_DRAFT.md, STORYBOARD.md, PITCH_VARIANTS.md
9. Phase E: push p50 toward 15s

