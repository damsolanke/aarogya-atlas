# Q&A Prep — 20 Likely Questions, 30-Second Answers

Each answer follows the structure: **Direct answer · Evidence · Bridge back to moat.** Read aloud at conversational pace each lands at ~25-30 seconds.

When you don't know the exact number → use one of the 5 universal bridges in `SCRIPTS.md` Section 4.

---

## Technical (5)

### 1. "How does Mosaic AI Vector Search scale beyond 10,000 facilities?"

> The Delta Sync index is bounded by the underlying Delta table — Databricks horizontally shards Mosaic VS endpoints to billions of rows, and our managed bge-large-en embeddings amortize. At 10x our current scale we're well inside Free Edition tier limits; at 100x we'd graduate to Standard Tier and use a partitioned multi-endpoint topology by Indian state. The deeper reason it scales: our 12 tools fan out in parallel via `asyncio.gather`, so VS query latency stays sub-second even when paired with five other tools.

### 2. "What's your latency at 100x load?"

> P95 today is 49.5 seconds end-to-end for a 12-tool query on a single Mac with one Anthropic concurrent request. Streaming UX hides the cold-start. Under load the bottleneck is Anthropic's adaptive thinking — not infrastructure. Our `apps/api/aarogya_api/agent.py` already does parallel tool fan-out, which gave us a 22% wall-clock reduction over the sequential baseline. To prove production scale we'd put the agent loop on Databricks Model Serving — the deployment plan is in `docs/DATABRICKS_DEPLOYMENT.md`.

### 3. "Why medgemma over GPT-4V for vision?"

> Two reasons. One — medgemma is medical-domain-tuned, trained on dermatology and radiology corpora, so wound triage and X-ray interpretation are first-class. GPT-4V is a generalist that hallucinates clinical confidently. Two — medgemma 27B runs on the laptop via Ollama, which means the wound photo never leaves the device. PHI egress is a non-starter for Indian healthcare. That on-device guarantee is half our moat.

### 4. "Why no LangGraph or LangChain — isn't that the standard?"

> A manual streaming loop using the official Anthropic SDK was 200 lines, fully observable, and lets us preserve thinking-signature blocks across turns — which is required for adaptive thinking to compound. LangGraph adds an abstraction layer we don't need and would break MLflow tracing in subtle ways. The 12 tools are async-native; the orchestration is `asyncio.gather` over `tool_use` blocks. That's it. The code is in `apps/api/aarogya_api/agent.py` if anyone wants to read it.

### 5. "How does the parallel tool fan-out actually work?"

> When the supervisor returns multiple `tool_use` blocks in one turn, we wrap each in a coroutine and `asyncio.gather` them concurrently rather than serializing. Most tools — geocode, trust_score, estimate_journey, find_medical_deserts, total_out_of_pocket — also have an LRU cache decorator, so repeated invocations within a session are free. The combined effect is the 22% wall-clock reduction documented in the audit.

---

## Healthcare / clinical (5)

### 6. "How do you handle PHI?"

> Three layers. Patient text — extracted via Qwen 2.5 32B on Ollama, locally. Patient images — triaged via medgemma 27B, locally. Storage — `intake_notes` table in Databricks Unity Catalog has a `mask_phone` column-level UDF on `patient_phone`, verified live in our workspace. Anything that touches PHI either runs on-device or is masked at the catalog layer. The cloud agent only sees aggregate metadata, never raw patient records. HIPAA + ABDM compliant by architecture, not by policy alone.

### 7. "What's your false-negative rate on triage?"

> We don't have clinical-trial-grade FN/FP numbers — that requires a labeled clinical dataset and IRB approval, which is post-hackathon work. What we do have: a Validator agent that re-checks every recommendation against the source text and emits PASS, WARN, or FAIL with a cited evidence snippet. In our 12-query audit, 4 of 8 validated recommendations came back as WARN — never silent. That self-checking layer is what would catch a triage miss in deployment.

### 8. "Have you talked to clinicians?"

> The Virtue Foundation dataset itself comes from clinician-led NGO surveys — that's what we ranked on. The clinical pathway routing — STEMI to cathlab + thrombolytics, snakebite to polyvalent + species coverage, neonatal to SNCU/NICU — was modeled from published Indian clinical guidelines, not invented. Direct ASHA worker validation is the next milestone; we have an introduction queued through the Virtue Foundation team.

### 9. "What's your regulatory pathway?"

> Three concurrent tracks. India: ABDM/ABHA integration as a write-back FHIR R4 referral bundle — this is on the post-submission roadmap. US/EU export: CE-marked SaMD with a bounded clinical-decision-support carve-out, since we recommend rather than diagnose. Foundational: HIPAA-equivalent on-device PHI handling is already shipped — the architecture is the regulatory story. Nothing about Aarogya Atlas requires FDA clearance to start; it requires it to scale into integrated EHR workflows.

### 10. "How accurate is the Trust Score?"

> The score combines 7 contradiction rules — like the spec's named example, *advanced surgery listed without an anesthesiologist* — plus 4 metadata signals around source completeness. Each score reports an 80% bootstrap confidence interval, so users see the uncertainty. We can't claim ground-truth accuracy without a labeled clinician panel, but we can say zero recommendations are made without a Trust Score and a Validator pass — that's the falsifiable property we shipped.

---

## Business (5)

### 11. "Who pays for this?"

> Three buyers, three timelines. Year one — NGO planners (Virtue Foundation, World Bank field offices) who already have grant budgets for capacity tools; we are a planning-tool sale at 25-50K dollars per state mission. Year two — state-mission policy makers using the equity counterfactual planner; one signed pilot with a state government is the milestone. Year three — hospital-VPC enterprise via Databricks Model Serving; the deployment plan exists. End user — ASHA workers — will always be free, subsidized by the buyer above them.

### 12. "What's the market size?"

> 1.4 billion people, 1.05 million ASHA workers, 27 state missions. The TAM I'd defend is the SaaS spend on healthcare-capacity planning across Indian state governments and NGOs, which is in the high hundreds of millions annually and growing post-Ayushman Bharat. Beyond that, the platform extends to Bangladesh, Indonesia, sub-Saharan Africa — anywhere with an on-device PHI requirement and a fragmented public-health system.

### 13. "How do you compete with Practo, 1mg, or Apollo's own app?"

> Practo and 1mg are appointment marketplaces — they have no concept of trust auditing, no contradiction detection, no multilingual on-device PHI. Apollo's app is a chain-specific funnel — it cannot recommend a competitor's facility even when that competitor is 10 minutes closer with a working dialysis machine. Aarogya is the **only** layer designed to be operator-neutral and clinician-auditable. That neutrality is what NGOs and state governments need; the for-profit apps structurally cannot ship it.

### 14. "What are the unit economics?"

> Per-query cost dominated by Anthropic Opus inference — ballpark 15 cents per fully-validated 12-tool query at current pricing. ASHA workers issue maybe 5-10 queries per day, so 75 cents to 1.50 per worker per day. Subsidized at a state-mission scale that's negligible against averted-mortality cost. On-device tools (medgemma, Qwen, bge-m3) cost zero per query after the model download — that's the efficiency story.

### 15. "Why ASHA workers as the wedge?"

> 1.05 million ASHA workers across India already do the *triage* job by hand — they are the closest thing to a referral primary-care layer in rural India. They have phones. They have WhatsApp. They are trusted by their community. Giving them a tool that ranks the right facility in 30 seconds compounds: better decisions per-worker, faster Discovery-to-Care, and a defensible distribution channel that bypasses the consumer healthcare-app race.

---

## Adversarial (3)

### 16. "Isn't this just RAG over Google?"

> No. RAG over Google would return distance-ranked search results — exactly what ChatGPT and Maps do today. Aarogya is a 12-tool agent with a Trust Scorer that detects contradictions in the source data, a Validator that self-checks every recommendation, on-device PHI extraction, multimodal vision triage, and clinical pathway routing for STEMI, snakebite, and neonatal sepsis. None of those are retrievable; they are computed. Try the same query in ChatGPT and you'll see the gap immediately.

### 17. "What stops Google Maps from copying this in a week?"

> Google can ship distance and hours. They cannot ship on-device PHI extraction without rebuilding their cloud-first architecture, they cannot ship the Indian-government data partnerships without a five-year regulatory effort, and they will not ship a Validator that publicly says *we don't trust this clinic* — it's against their commercial interest. Our moat is the part of the stack a $2 trillion company is structurally unable to build.

### 18. "How is this different from Babylon Health's failure?"

> Babylon over-promised symptom triage as a substitute for clinical judgment, then collapsed on the liability of being wrong. Aarogya does the opposite — we route to a *facility*, with a *Trust Score*, and a *Validator flag* the user sees explicitly. We never substitute for the clinician; we tell the patient where to find one. The product is a navigator, not a diagnostician. That framing is the regulatory and liability difference.

---

## Curveball (2)

### 19. "What did you learn that surprised you?"

> Two things. One — Mosaic AI Vector Search worked end-to-end while many teams in the Databricks channel stayed blocked. Most of them didn't try MCP-managed servers, which makes the index discoverable to any agent in the workspace. Two — the Validator agent caught a real contradiction in the VF dataset on the first run: a clinic listing *advanced surgery* with no anesthesia listed. That wasn't a synthetic test; it was the live data. The contradiction-detection pattern generalizes.

### 20. "What would you do differently with another 24 hours?"

> Three things. One — finish the WhatsApp wrapper so an ASHA worker can text the agent in Hindi and get a recommendation back as a voice note. Two — wire ABDM/ABHA write-back so each recommendation lands as a FHIR R4 referral bundle in India's national health stack. Three — labeled clinician panel on 100 sample queries to publish real precision-recall numbers for the triage layer. None of those are research; they are scope.

---

## Sub-30-second answers (when the panel is rapid-firing)

If the moderator says "we have time for one more, 15 seconds" — use these:

| Q | Crisp answer |
|---|---|
| "Why you?" | "Solutions Architect at a Fortune 6 healthcare company. Healthcare is the only domain where I can ship faster than non-domain experts. I built this solo in 24 hours." |
| "Funding ask?" | "We're not raising at the moment — we're going for the venture-track program prize. The pilot economics are in the deck." |
| "Live demo URL?" | "formal-rogers-poster-meanwhile dot trycloudflare dot com — same URL on every slide. Mobile-friendly. Try it now." |
| "Open source?" | "Yes — public on GitHub at damsolanke slash aarogya-atlas. MIT license. Sixty-seven commits over 24 hours." |
| "Team?" | "Solo build. The repo log will tell you the story." |
