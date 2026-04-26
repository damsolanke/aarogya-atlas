"""Dynamic adversarial robustness eval — DAS-style perturbation.

For each base query, generate N mutations (typos, code-switch, partial info,
ambiguous phrasing). Run base + mutations through the agent. Report the
*Benchmarking Gap* — static accuracy vs dynamic-robust accuracy.

Reference: DAS (Dynamic Adversarial Streamlining) — arXiv 2508.00923
(Aug 2025), reproduced for healthcare-agent evals in npj Digital Medicine
2026 agent-system benchmark paper.

Usage:
    cd apps/api
    uv run python ../../scripts/evaluate_robustness.py \\
        --base http://127.0.0.1:8000 \\
        --output ../../docs/ROBUSTNESS_REPORT.md \\
        --base-queries 6 --mutations 3
"""
from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

BASE_QUERIES = [
    "I need an ECG within 15 km of Yeshwantpur, Bengaluru. Open today, accepts Ayushman Bharat.",
    "Find a cardiology consultation near Hubli, cash payment, today.",
    "Pediatric ICU near Mysuru, tonight.",
    "Dialysis centre within 10 km of Patna, Ayushman Bharat empanelled.",
    "Trauma center within 25 km of Indore, open 24x7.",
    "Postpartum hemorrhage emergency near Lucknow — need CEmONC with surgery + blood bank.",
]


def mutate(q: str, n: int = 3) -> list[str]:
    """Generate n adversarial perturbations for q."""
    mutations: list[str] = []

    # 1. Typo + capitalization stress
    typo = (
        q.lower()
        .replace("near", "neer")
        .replace("within", "withing")
        .replace("ayushman bharat", "AYushman Bharath")
    )
    mutations.append(typo)

    # 2. Code-switched Hinglish (medical terms in English, glue in Hinglish)
    hinglish = (
        q.replace("I need", "Mujhe chahiye")
        .replace("Find", "Dhundo")
        .replace("Open today", "aaj khula hai")
        .replace("accepts", "leta hai")
    )
    mutations.append(hinglish)

    # 3. Truncated / minimal info
    truncated = (
        q.split(",")[0].split(" near")[0].split(" within")[0]
    )
    if not truncated.strip():
        truncated = q[: max(20, len(q) // 3)]
    mutations.append(truncated.strip() + " — urgent")

    # 4. Ambiguous (drop the location)
    if n >= 4:
        ambig = q.replace("Yeshwantpur, Bengaluru", "south India").replace("Hubli", "north Karnataka")
        mutations.append(ambig)

    # 5. Sarcastic / informal
    if n >= 5:
        mutations.append(f"yo so basically {q.lower()} but make it actually work this time pls")

    return mutations[:n]


@dataclass
class RunResult:
    query: str
    is_mutation: bool
    duration_s: float
    tool_calls: int = 0
    final_text: str = ""
    has_facility: bool = False
    has_phone: bool = False
    error: str | None = None


async def run_query(client: httpx.AsyncClient, base: str, q: str, is_mut: bool) -> RunResult:
    res = RunResult(query=q, is_mutation=is_mut, duration_s=0.0)
    t0 = time.perf_counter()
    try:
        async with client.stream("POST", f"{base}/api/query", json={"query": q}) as r:
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                payload = line[len("data:"):].strip()
                if not payload:
                    continue
                try:
                    msg = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                ev = msg.get("event")
                data = msg.get("data") or {}
                if ev == "step" and data.get("type") == "tool_request":
                    res.tool_calls += len(data.get("tool_calls") or [])
                elif ev == "final":
                    res.final_text = data.get("text", "")
                elif ev == "error":
                    res.error = data.get("text") or data.get("kind")
    except Exception as e:
        res.error = f"{type(e).__name__}: {e}"
    res.duration_s = round(time.perf_counter() - t0, 2)
    res.has_facility = "vf-" in res.final_text.lower()
    res.has_phone = any(k in res.final_text for k in ("+91", "104", "108", "helpline"))
    return res


def is_robust(r: RunResult) -> bool:
    """A run is 'robust' if it produced a final answer with at least one
    facility id (vf-*) and no error."""
    return r.error is None and r.has_facility and len(r.final_text) > 100


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://127.0.0.1:8000")
    p.add_argument("--output", default="docs/ROBUSTNESS_REPORT.md")
    p.add_argument("--base-queries", type=int, default=len(BASE_QUERIES))
    p.add_argument("--mutations", type=int, default=3)
    args = p.parse_args()

    base_set = BASE_QUERIES[: args.base_queries]
    print(f"Base queries: {len(base_set)} · mutations per: {args.mutations}\n")

    base_results: list[RunResult] = []
    mut_results: list[RunResult] = []

    timeout = httpx.Timeout(180.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for i, q in enumerate(base_set, 1):
            print(f"  [base {i}] {q[:60]}…")
            base_results.append(await run_query(client, args.base, q, is_mut=False))
            for j, mq in enumerate(mutate(q, args.mutations), 1):
                print(f"        mut {j}: {mq[:60]}…")
                mut_results.append(await run_query(client, args.base, mq, is_mut=True))

    # Compute robustness gap
    static_robust_pct = round(100 * sum(is_robust(r) for r in base_results) / max(len(base_results), 1), 1)
    dynamic_robust_pct = round(100 * sum(is_robust(r) for r in mut_results) / max(len(mut_results), 1), 1)
    benchmarking_gap = round(static_robust_pct - dynamic_robust_pct, 1)

    base_dur = statistics.mean(r.duration_s for r in base_results) if base_results else 0
    mut_dur = statistics.mean(r.duration_s for r in mut_results) if mut_results else 0

    md = ["# Aarogya Atlas — Adversarial Robustness Eval", ""]
    md.append(f"_Generated: {time.strftime('%Y-%m-%d %H:%M %Z')}_  ")
    md.append(f"_Base queries: **{len(base_results)}** · mutations: **{len(mut_results)}**_")
    md.append("")
    md.append("**DAS-style adversarial perturbation** (typos, Hinglish code-switch, truncation, ambiguity).")
    md.append("Reports static accuracy vs dynamic-robust accuracy, plus the *Benchmarking Gap*.")
    md.append("")
    md.append("## Headline")
    md.append("")
    md.append("| Metric | Static | Dynamic | Gap |")
    md.append("| --- | ---: | ---: | ---: |")
    md.append(f"| Robust pass rate | **{static_robust_pct}%** | **{dynamic_robust_pct}%** | **{benchmarking_gap:+}%** |")
    md.append(f"| Mean wall-clock | {base_dur:.1f}s | {mut_dur:.1f}s | {(mut_dur - base_dur):+.1f}s |")
    md.append("")
    md.append("Robust = final answer cites at least one VF facility id AND no error event.")
    md.append("")
    md.append("## Mutation strategies")
    md.append("")
    md.append("- **Typo + caps stress** — 'neer' for 'near', mixed-case payer name")
    md.append("- **Hinglish code-switch** — medical terms English, glue Hindi (matches real ASHA worker phrasing)")
    md.append("- **Truncation** — drop everything after first comma")
    md.append("- **Ambiguity** — replace specific city with region")
    md.append("")
    md.append("## Per-query breakdown")
    md.append("")
    md.append("| # | Query | Mutation | Robust? | Tools | Dur |")
    md.append("| --- | --- | --- | :-: | ---: | ---: |")
    n = 1
    for base, *muts in zip(base_results, *[
        mut_results[i :: args.mutations] for i in range(args.mutations)
    ]):
        rows = [base, *muts]
        for r in rows:
            mark = "🆎 mut" if r.is_mutation else "📋 base"
            ok = "✓" if is_robust(r) else "✗"
            err = f" ERR" if r.error else ""
            q = r.query.replace("|", "\\|")
            if len(q) > 55:
                q = q[:52] + "…"
            md.append(f"| {n} | {q} | {mark} | {ok} | {r.tool_calls} | {r.duration_s}s |")
            n += 1

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(md))
    print(f"\n✓ wrote {out}")
    print(f"static={static_robust_pct}% dynamic={dynamic_robust_pct}% gap={benchmarking_gap:+}%")


if __name__ == "__main__":
    asyncio.run(main())
