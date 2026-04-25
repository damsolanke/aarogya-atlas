"""
Evaluation harness for Aarogya Atlas.

Runs a fixed query set through the agent and computes:
  - tool-call distribution
  - mean Trust Score CI width
  - Validator verdict distribution (PASS / WARN / FAIL)
  - fraction of answers that include a callable next step (phone or helpline)
  - total wall-clock per query

Logs each query as an MLflow run under /Shared/aarogya-atlas-eval so the
results are visible in the workspace alongside the per-turn agent traces.

Usage:
    cd apps/api
    uv run python ../../scripts/evaluate.py \
        --base http://127.0.0.1:8000 \
        --output ../../docs/EVAL_REPORT.md
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

QUERIES: list[str] = [
    # Discovery — typical
    "I need an ECG within 15 km of Yeshwantpur, Bengaluru. Open today, accepts Ayushman Bharat.",
    "Find a cardiology consultation near Hubli, cash payment, today.",
    "Pediatric ICU near Mysuru, tonight.",
    "Dialysis centre within 10 km of Patna, Ayushman Bharat empanelled.",
    "Trauma center within 25 km of Indore, open 24x7.",
    # Multilingual
    "मेरी मां के लिए डायलिसिस चाहिए, बेंगलुरु में, आयुष्मान भारत.",
    "சென்னையில் இரவு திறந்திருக்கும் குழந்தைகள் மருத்துவமனை.",
    # NGO planner — desert detection
    "Where in Bihar is dialysis coverage weakest by district?",
    "Top 5 districts in Maharashtra with the worst oncology coverage.",
    "Which states have the lowest neonatal-care facility density?",
    # Trust scorer — direct
    "trust score for vf-1 with confidence interval",
    "trust score for vf-3263",
    "Validate vf-6477 — does it actually offer ECG?",
    # Edge cases / robustness
    "",  # empty
    "asdfghjkl qwerty zxcvbnm",  # gibberish
    "Help me find a hospital",  # vague
    # Stress
    "Closest empanelled hospital that does pediatric heart surgery within 50 km of Lucknow.",
    "Compare oncology coverage between Bengaluru Urban and Bengaluru Rural.",
    "Out-of-pocket cost for an ECG in Tier-2 cities of Karnataka.",
    "Which facilities in Bihar lack anesthesia despite claiming surgery?",
]

PHONE_PATTERN = re.compile(r"(\+91[\s\-]?\d{4,5}[\s\-]?\d{4,6}|\b1[08]4\b|\bhelpline\b)", re.I)
TRUST_CI_PATTERN = re.compile(r"CI[\s\[]*?(\d{1,3})\s*[,–-]\s*(\d{1,3})\s*\]?", re.I)


@dataclass
class QueryResult:
    query: str
    duration_s: float
    tool_calls: list[str] = field(default_factory=list)
    iterations: int = 0
    final_text: str = ""
    error: str | None = None
    trust_ci_widths: list[int] = field(default_factory=list)
    validator_verdicts: list[str] = field(default_factory=list)
    has_phone_or_helpline: bool = False
    streamed_chars: int = 0


async def run_query(client: httpx.AsyncClient, base: str, q: str) -> QueryResult:
    """Stream the agent and collect telemetry."""
    res = QueryResult(query=q, duration_s=0.0)
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
                _consume(res, msg.get("event") or "", msg.get("data") or {})
    except Exception as e:
        res.error = f"{type(e).__name__}: {e}"
    res.duration_s = round(time.perf_counter() - t0, 2)
    res.iterations = max(1, len(res.tool_calls))
    res.streamed_chars = len(res.final_text)
    res.has_phone_or_helpline = bool(PHONE_PATTERN.search(res.final_text))
    for m in TRUST_CI_PATTERN.finditer(res.final_text):
        lo, hi = int(m.group(1)), int(m.group(2))
        if 0 <= lo <= 100 and 0 <= hi <= 100 and hi >= lo:
            res.trust_ci_widths.append(hi - lo)
    for verdict in ("PASS", "WARN", "FAIL"):
        if re.search(rf"\b{verdict}\b", res.final_text):
            res.validator_verdicts.append(verdict)
    return res


def _consume(res: QueryResult, event_kind: str, data: dict) -> None:
    if event_kind == "step":
        if data.get("type") == "tool_request":
            for tc in data.get("tool_calls", []):
                res.tool_calls.append(tc.get("name", ""))
    elif event_kind == "final":
        res.final_text = data.get("text", "")
    elif event_kind == "error":
        res.error = data.get("text") or data.get("kind")


def aggregate(results: list[QueryResult]) -> dict:
    durations = [r.duration_s for r in results if not r.error]
    tool_counts = [len(r.tool_calls) for r in results if not r.error]
    ci_widths = [w for r in results for w in r.trust_ci_widths]
    has_phone_count = sum(1 for r in results if r.has_phone_or_helpline)
    tool_freq: dict[str, int] = {}
    for r in results:
        for t in r.tool_calls:
            tool_freq[t] = tool_freq.get(t, 0) + 1
    verdict_counts: dict[str, int] = {}
    for r in results:
        for v in r.validator_verdicts:
            verdict_counts[v] = verdict_counts.get(v, 0) + 1
    return {
        "n_queries": len(results),
        "n_errors": sum(1 for r in results if r.error),
        "duration_s_mean": round(statistics.mean(durations), 2) if durations else 0,
        "duration_s_p95": round(_p95(durations), 2) if durations else 0,
        "tool_calls_mean": round(statistics.mean(tool_counts), 2) if tool_counts else 0,
        "tool_calls_max": max(tool_counts) if tool_counts else 0,
        "trust_ci_width_mean": round(statistics.mean(ci_widths), 1) if ci_widths else 0.0,
        "trust_ci_width_n": len(ci_widths),
        "has_phone_or_helpline_pct": round(100.0 * has_phone_count / len(results), 1) if results else 0,
        "tool_frequency": dict(sorted(tool_freq.items(), key=lambda x: -x[1])),
        "validator_verdict_counts": verdict_counts,
    }


def _p95(xs: list[float]) -> float:
    if not xs:
        return 0.0
    s = sorted(xs)
    k = max(0, int(0.95 * len(s)) - 1)
    return s[k]


def write_report(out: Path, summary: dict, results: list[QueryResult]) -> None:
    md = ["# Aarogya Atlas — Evaluation Report", ""]
    md.append(f"_Generated: {time.strftime('%Y-%m-%d %H:%M %Z')}_")
    md.append(f"_Queries: **{summary['n_queries']}** · errors: **{summary['n_errors']}**_")
    md.append("")
    md.append("## Headline metrics")
    md.append("")
    md.append("| Metric | Value |")
    md.append("| --- | --- |")
    md.append(f"| Mean wall-clock per query | {summary['duration_s_mean']}s |")
    md.append(f"| P95 wall-clock | {summary['duration_s_p95']}s |")
    md.append(f"| Mean tool calls / query | {summary['tool_calls_mean']} |")
    md.append(f"| Max tool calls / query | {summary['tool_calls_max']} |")
    md.append(
        f"| Mean Trust Score CI width | {summary['trust_ci_width_mean']} (n={summary['trust_ci_width_n']}) |"
    )
    md.append(
        f"| Answers with callable next-step | {summary['has_phone_or_helpline_pct']}% |"
    )
    md.append("")
    md.append("## Tool frequency")
    md.append("")
    md.append("| Tool | Calls |")
    md.append("| --- | --- |")
    for k, v in summary["tool_frequency"].items():
        md.append(f"| `{k}` | {v} |")
    md.append("")
    if summary["validator_verdict_counts"]:
        md.append("## Validator verdicts")
        md.append("")
        for k in ("PASS", "WARN", "FAIL"):
            md.append(f"- **{k}**: {summary['validator_verdict_counts'].get(k, 0)}")
        md.append("")
    md.append("## Per-query results")
    md.append("")
    md.append("| # | Query | Tools | Dur | Phone? | Error |")
    md.append("| --- | --- | ---:| ---:| --- | --- |")
    for i, r in enumerate(results, 1):
        q = (r.query or "<empty>").replace("|", "\\|")
        if len(q) > 60:
            q = q[:57] + "…"
        md.append(
            f"| {i} | {q} | {len(r.tool_calls)} | {r.duration_s}s | "
            f"{'✓' if r.has_phone_or_helpline else '·'} | {r.error or ''} |"
        )
    out.write_text("\n".join(md))


def push_to_mlflow(summary: dict, results: list[QueryResult]) -> bool:
    """Best-effort push to MLflow. Returns True if logged."""
    try:
        import mlflow  # type: ignore
    except ImportError:
        return False
    try:
        mlflow.set_tracking_uri("databricks")
        mlflow.set_experiment("/Shared/aarogya-atlas-eval")
        with mlflow.start_run(run_name=f"eval-{time.strftime('%Y%m%d-%H%M')}"):
            mlflow.log_params(
                {"n_queries": summary["n_queries"], "n_errors": summary["n_errors"]}
            )
            mlflow.log_metrics(
                {
                    "duration_s_mean": summary["duration_s_mean"],
                    "duration_s_p95": summary["duration_s_p95"],
                    "tool_calls_mean": summary["tool_calls_mean"],
                    "tool_calls_max": summary["tool_calls_max"],
                    "trust_ci_width_mean": summary["trust_ci_width_mean"],
                    "has_phone_or_helpline_pct": summary["has_phone_or_helpline_pct"],
                }
            )
            for tool, count in summary["tool_frequency"].items():
                mlflow.log_metric(f"tool_calls.{tool}", count)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  [MLflow] skipped: {e}", file=sys.stderr)
        return False


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://127.0.0.1:8000")
    p.add_argument("--output", default="docs/EVAL_REPORT.md")
    p.add_argument("--mlflow", action="store_true", help="Push to MLflow eval experiment")
    p.add_argument("--queries", type=int, default=len(QUERIES))
    args = p.parse_args()

    print(f"Running {min(args.queries, len(QUERIES))} queries against {args.base}\n")
    results: list[QueryResult] = []
    timeout = httpx.Timeout(180.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for i, q in enumerate(QUERIES[: args.queries], 1):
            label = q[:60] + ("…" if len(q) > 60 else "") or "<empty>"
            print(f"  [{i:>2}/{args.queries}] {label}")
            r = await run_query(client, args.base, q)
            err = f" ERROR={r.error}" if r.error else ""
            print(
                f"        {r.duration_s}s · tools={len(r.tool_calls)} "
                f"phone={'Y' if r.has_phone_or_helpline else 'N'}{err}"
            )
            results.append(r)

    summary = aggregate(results)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_report(out, summary, results)
    print(f"\n✓ wrote {out}")
    print(json.dumps(summary, indent=2))

    if args.mlflow:
        ok = push_to_mlflow(summary, results)
        print(f"  MLflow: {'logged' if ok else 'skipped'}")


if __name__ == "__main__":
    asyncio.run(main())
