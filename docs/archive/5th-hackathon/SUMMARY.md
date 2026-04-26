# Aarogya Atlas — Project Summary

**Hack-Nation 2026 · Challenge 3 (Databricks): Building Agentic Healthcare Maps for 1.4 Billion Lives**

In rural India, a postal code can determine a lifespan. Families travel hours to a
clinic only to learn the dialysis machine broke yesterday or the brochure's
Ayushman Bharat coverage was outdated. **Aarogya Atlas reduces Discovery-to-Care
time** by turning the 10,000-record Virtue Foundation dataset of Indian medical
facilities into a queryable, trust-scored, multilingual intelligence network for
NGO planners, ASHA workers, and families.

**Trust Scorer** flags the spec example verbatim — *"Claims Advanced Surgery but
no Anesthesiologist"* — plus six other clinical contradictions and four soft
metadata signals. Each flag carries a cited evidence snippet from the source. A
**Validator Agent** re-checks high-stakes claims against source text. **Trust
Score Confidence Intervals** report `[low, high]` based on source completeness
and flag-severity bootstrap. **Medical Desert detection** answers NGO planner
questions like *"where in Bihar is dialysis coverage weakest?"* and renders the
result as red severity halos at district centroids on the map.

**On-device PHI**: free-text extraction (Qwen 2.5 32B) and multilingual
embeddings (bge-m3, Hindi/Tamil/English) run on Apple Silicon via Ollama. The
supervisor uses GPT-OSS-120B (Groq) with adaptive thinking; the agent ranks
facilities by **total ₹ cost + travel time** (MGNREGA wage-loss + KSRTC bus fare
heuristics), in three tiers — *Best · Closest payer-eligible · Backup*.

**Live in Databricks**: Unity Catalog (raw + curated + PHI-mask UDF), Genie
Space NL→SQL over `workspace.aarogya.facilities`, **Mosaic AI Vector Search**
Delta Sync Index with managed `databricks-bge-large-en` embeddings, and
**MLflow 3 Tracing** capturing every supervisor turn + tool call as a span at
`/Shared/aarogya-atlas`.

12 agent tools · 10,000 facilities · multilingual · cost-aware · on-device PHI
· cited evidence · CIs · medical-desert visual. Built in 24 hours.
