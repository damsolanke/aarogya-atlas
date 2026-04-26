# Aarogya Atlas — Adversarial Robustness Eval

_Generated: 2026-04-25 22:00 CDT_  
_Base queries: **4** · mutations: **12**_

**DAS-style adversarial perturbation** (typos, Hinglish code-switch, truncation, ambiguity).
Reports static accuracy vs dynamic-robust accuracy, plus the *Benchmarking Gap*.

## Headline

| Metric | Static | Dynamic | Gap |
| --- | ---: | ---: | ---: |
| Robust pass rate | **100.0%** | **50.0%** | **+50.0%** |
| Mean wall-clock | 51.6s | 30.1s | -21.4s |

Robust = final answer cites at least one VF facility id AND no error event.

## Mutation strategies

- **Typo + caps stress** — 'neer' for 'near', mixed-case payer name
- **Hinglish code-switch** — medical terms English, glue Hindi (matches real ASHA worker phrasing)
- **Truncation** — drop everything after first comma
- **Ambiguity** — replace specific city with region

## Per-query breakdown

| # | Query | Mutation | Robust? | Tools | Dur |
| --- | --- | --- | :-: | ---: | ---: |
| 1 | I need an ECG within 15 km of Yeshwantpur, Bengaluru… | 📋 base | ✓ | 18 | 78.88s |
| 2 | i need an ecg withing 15 km of yeshwantpur, bengalur… | 🆎 mut | ✓ | 7 | 41.52s |
| 3 | Mujhe chahiye an ECG within 15 km of Yeshwantpur, Be… | 🆎 mut | ✓ | 12 | 50.62s |
| 4 | I need an ECG — urgent | 🆎 mut | ✗ | 0 | 4.46s |
| 5 | Find a cardiology consultation near Hubli, cash paym… | 📋 base | ✓ | 7 | 27.67s |
| 6 | find a cardiology consultation neer hubli, cash paym… | 🆎 mut | ✓ | 7 | 28.47s |
| 7 | Dhundo a cardiology consultation near Hubli, cash pa… | 🆎 mut | ✓ | 7 | 29.14s |
| 8 | Find a cardiology consultation — urgent | 🆎 mut | ✗ | 0 | 5.19s |
| 9 | Pediatric ICU near Mysuru, tonight. | 📋 base | ✓ | 11 | 55.0s |
| 10 | pediatric icu neer mysuru, tonight. | 🆎 mut | ✗ | 5 | 40.44s |
| 11 | Pediatric ICU near Mysuru, tonight. | 🆎 mut | ✗ | 7 | 44.85s |
| 12 | Pediatric ICU — urgent | 🆎 mut | ✗ | 0 | 5.04s |
| 13 | Dialysis centre within 10 km of Patna, Ayushman Bhar… | 📋 base | ✓ | 7 | 44.78s |
| 14 | dialysis centre withing 10 km of patna, AYushman Bha… | 🆎 mut | ✓ | 10 | 41.12s |
| 15 | Dialysis centre within 10 km of Patna, Ayushman Bhar… | 🆎 mut | ✓ | 13 | 64.82s |
| 16 | Dialysis centre — urgent | 🆎 mut | ✗ | 0 | 5.95s |