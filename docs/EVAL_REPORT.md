# Aarogya Atlas — Evaluation Report

_Generated: 2026-04-25 16:01 CDT_
_Queries: **5** · errors: **0**_

## Headline metrics

| Metric | Value |
| --- | --- |
| Mean wall-clock per query | 40.7s |
| P95 wall-clock | 49.93s |
| Mean tool calls / query | 9.8 |
| Max tool calls / query | 15 |
| Mean Trust Score CI width | 62 (n=1) |
| Answers with callable next-step | 40.0% |

## Tool frequency

| Tool | Calls |
| --- | --- |
| `facility_search` | 7 |
| `trust_score` | 6 |
| `estimate_journey` | 6 |
| `validate_recommendation` | 6 |
| `total_out_of_pocket` | 6 |
| `geocode` | 5 |
| `semantic_intake_search` | 4 |
| `databricks_vector_search` | 4 |
| `check_hours` | 4 |
| `status_feed` | 1 |

## Validator verdicts

- **PASS**: 2
- **WARN**: 1
- **FAIL**: 0

## Per-query results

| # | Query | Tools | Dur | Phone? | Error |
| --- | --- | ---:| ---:| --- | --- |
| 1 | I need an ECG within 15 km of Yeshwantpur, Bengaluru. Ope… | 12 | 53.95s | ✓ |  |
| 2 | Find a cardiology consultation near Hubli, cash payment, … | 7 | 26.16s | ✓ |  |
| 3 | Pediatric ICU near Mysuru, tonight. | 5 | 36.86s | · |  |
| 4 | Dialysis centre within 10 km of Patna, Ayushman Bharat em… | 10 | 36.6s | · |  |
| 5 | Trauma center within 25 km of Indore, open 24x7. | 15 | 49.93s | · |  |