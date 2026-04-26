# Aarogya Atlas — Adversarial Robustness Eval

> ⚠ **Stack note:** generated against the 5th-edition stack
> (Anthropic Claude supervisor · Llama 3.3 70B on Groq · no critic pass).
> Current architecture is **GPT-OSS-120B (Groq) + critic v1**; pass rates
> will be re-measured on the new stack.

_Generated: 2026-04-25 22:46 CDT_  
_Base queries: **3** · mutations: **6**_  
_Architecture: pre-2026-04-26 (Anthropic + Llama 3.3 70B, no critic pass)_

**DAS-style adversarial perturbation** (typos, Hinglish code-switch, truncation, ambiguity).
Reports static accuracy vs dynamic-robust accuracy, plus the *Benchmarking Gap*.

## Headline

| Metric | Static | Dynamic | Gap |
| --- | ---: | ---: | ---: |
| Robust pass rate | **100.0%** | **100.0%** | **+0.0%** |
| Mean wall-clock | 53.3s | 46.0s | -7.3s |

Robust = final answer cites at least one VF facility id AND no error event.

## Mutation strategies

- **Typo + caps stress** — 'neer' for 'near', mixed-case payer name
- **Hinglish code-switch** — medical terms English, glue Hindi (matches real ASHA worker phrasing)
- **Truncation** — drop everything after first comma
- **Ambiguity** — replace specific city with region

## Per-query breakdown

| # | Query | Mutation | Robust? | Tools | Dur |
| --- | --- | --- | :-: | ---: | ---: |
| 1 | I need an ECG within 15 km of Yeshwantpur, Bengaluru… | 📋 base | ✓ | 14 | 62.64s |
| 2 | i need an ecg withing 15 km of yeshwantpur, bengalur… | 🆎 mut | ✓ | 11 | 61.69s |
| 3 | Mujhe chahiye an ECG within 15 km of Yeshwantpur, Be… | 🆎 mut | ✓ | 10 | 46.94s |
| 4 | Find a cardiology consultation near Hubli, cash paym… | 📋 base | ✓ | 7 | 27.3s |
| 5 | find a cardiology consultation neer hubli, cash paym… | 🆎 mut | ✓ | 7 | 26.52s |
| 6 | Dhundo a cardiology consultation near Hubli, cash pa… | 🆎 mut | ✓ | 7 | 26.94s |
| 7 | Pediatric ICU near Mysuru, tonight. | 📋 base | ✓ | 14 | 69.91s |
| 8 | pediatric icu neer mysuru, tonight. | 🆎 mut | ✓ | 9 | 52.28s |
| 9 | Pediatric ICU near Mysuru, tonight. | 🆎 mut | ✓ | 7 | 61.8s |