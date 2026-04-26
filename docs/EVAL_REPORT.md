# Aarogya Atlas — Evaluation Report

> ⚠ **Stack note:** these numbers were generated against the 5th-edition
> Hack-Nation submission stack (Anthropic Claude supervisor · Llama 3.3 70B
> on Groq · no critic pass). The current architecture has since moved to
> **GPT-OSS-120B (Groq) + critic v1**. Latency, tool-call counts, and trust
> distributions will change once `make eval` is re-run on the new stack —
> the rerun is tracked as a follow-up.

_Generated: 2026-04-25 16:43 CDT_
_Queries: **12** · errors: **0**_
_Architecture: pre-2026-04-26 (Anthropic + Llama 3.3 70B, no critic pass)_

## Headline metrics

| Metric | Value |
| --- | --- |
| Mean wall-clock per query | 31.74s |
| P95 wall-clock | 49.53s |
| Mean tool calls / query | 6.92 |
| Max tool calls / query | 18 |
| Mean Trust Score CI width | 38 (n=1) |
| Answers with callable next-step | 33.3% |

## Tool frequency

| Tool | Calls |
| --- | --- |
| `trust_score` | 12 |
| `facility_search` | 11 |
| `estimate_journey` | 11 |
| `total_out_of_pocket` | 11 |
| `validate_recommendation` | 8 |
| `geocode` | 7 |
| `semantic_intake_search` | 7 |
| `check_hours` | 7 |
| `databricks_vector_search` | 4 |
| `find_medical_deserts` | 4 |
| `status_feed` | 1 |

## Validator verdicts

- **PASS**: 2
- **WARN**: 4
- **FAIL**: 0

## Per-query results

| # | Query | Tools | Dur | Phone? | Error |
| --- | --- | ---:| ---:| --- | --- |
| 1 | I need an ECG within 15 km of Yeshwantpur, Bengaluru. Ope… | 18 | 56.57s | ✓ |  |
| 2 | Find a cardiology consultation near Hubli, cash payment, … | 8 | 26.47s | · |  |
| 3 | Pediatric ICU near Mysuru, tonight. | 5 | 38.72s | · |  |
| 4 | Dialysis centre within 10 km of Patna, Ayushman Bharat em… | 11 | 49.53s | ✓ |  |
| 5 | Trauma center within 25 km of Indore, open 24x7. | 10 | 48.2s | ✓ |  |
| 6 | मेरी मां के लिए डायलिसिस चाहिए, बेंगलुरु में, आयुष्मान भारत. | 15 | 48.51s | · |  |
| 7 | சென்னையில் இரவு திறந்திருக்கும் குழந்தைகள் மருத்துவமனை. | 11 | 46.15s | ✓ |  |
| 8 | Where in Bihar is dialysis coverage weakest by district? | 1 | 16.12s | · |  |
| 9 | Top 5 districts in Maharashtra with the worst oncology co… | 1 | 14.36s | · |  |
| 10 | Which states have the lowest neonatal-care facility density? | 1 | 18.18s | · |  |
| 11 | trust score for vf-1 with confidence interval | 1 | 9.5s | · |  |
| 12 | trust score for vf-3263 | 1 | 8.57s | · |  |

## Phase 3 item 14 — Mosaic AI Vector Search smoke (2026-04-26)

Query: `dialysis center bengaluru` (k=3)
Index: `workspace.aarogya.facilities_idx`
Embedding: `databricks-bge-large-en`

Results:
1. vf-9481 Tai Maa Dialysis Center And Polyclinic (0.749)
2. vf-537  Al Ehsan Diagnostic Centre (0.758)
3. vf-8114 Pravar Hospital (0.702)

Verdict: ranked correctly — dialysis-named facility ranks first by semantic relevance even though Al Ehsan Diagnostic Centre has higher raw cosine score.
