import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Languages,
  Phone,
} from "lucide-react";
import Footer from "@/components/Footer";

// The numbers below mirror docs/EVAL_REPORT.md, last refreshed against
// the parallel-tool-fan-out agent. Re-run `make eval` to update both.

const SUMMARY = {
  generated: "2026-04-25 16:43 CDT",
  queries: 12,
  errors: 0,
  meanSec: 31.7,
  prevMeanSec: 40.7,
  p95Sec: 49.5,
  meanTools: 6.92,
  maxTools: 18,
  toolsCovered: 11,
  toolsTotal: 12,
  ciWidth: 38,
  callablePct: 33.3,
  validator: { PASS: 2, WARN: 4, FAIL: 0 },
};

const TOOL_FREQ: { name: string; calls: number; tone: "emerald" | "cyan" | "violet" | "amber" }[] = [
  { name: "trust_score", calls: 12, tone: "emerald" },
  { name: "facility_search", calls: 11, tone: "emerald" },
  { name: "estimate_journey", calls: 11, tone: "emerald" },
  { name: "total_out_of_pocket", calls: 11, tone: "emerald" },
  { name: "validate_recommendation", calls: 8, tone: "emerald" },
  { name: "geocode", calls: 7, tone: "emerald" },
  { name: "semantic_intake_search", calls: 7, tone: "cyan" },
  { name: "check_hours", calls: 7, tone: "emerald" },
  { name: "databricks_vector_search", calls: 4, tone: "amber" },
  { name: "find_medical_deserts", calls: 4, tone: "emerald" },
  { name: "status_feed", calls: 1, tone: "emerald" },
];

const QUERIES: { q: string; tools: number; dur: number; phone: boolean }[] = [
  { q: "I need an ECG within 15 km of Yeshwantpur, Bengaluru.", tools: 18, dur: 56.6, phone: true },
  { q: "Find a cardiology consultation near Hubli, cash payment, today.", tools: 8, dur: 26.5, phone: false },
  { q: "Pediatric ICU near Mysuru, tonight.", tools: 5, dur: 38.7, phone: false },
  { q: "Dialysis centre within 10 km of Patna, Ayushman Bharat.", tools: 11, dur: 49.5, phone: true },
  { q: "Trauma center within 25 km of Indore, open 24x7.", tools: 10, dur: 48.2, phone: true },
  { q: "मेरी मां के लिए डायलिसिस चाहिए, बेंगलुरु में, आयुष्मान भारत.", tools: 15, dur: 48.5, phone: false },
  { q: "சென்னையில் இரவு திறந்திருக்கும் குழந்தைகள் மருத்துவமனை.", tools: 11, dur: 46.2, phone: true },
  { q: "Where in Bihar is dialysis coverage weakest by district?", tools: 1, dur: 16.1, phone: false },
  { q: "Top 5 districts in Maharashtra with the worst oncology coverage.", tools: 1, dur: 14.4, phone: false },
  { q: "Which states have the lowest neonatal-care facility density?", tools: 1, dur: 18.2, phone: false },
  { q: "trust score for vf-1 with confidence interval", tools: 1, dur: 9.5, phone: false },
  { q: "trust score for vf-3263", tools: 1, dur: 8.6, phone: false },
];

export default function EvalPage() {
  const perfDelta = ((SUMMARY.prevMeanSec - SUMMARY.meanSec) / SUMMARY.prevMeanSec) * 100;
  return (
    <div className="min-h-screen bg-[var(--bg)] text-zinc-100">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-100">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Aarogya Atlas
          </Link>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
            Auditable evaluation · {SUMMARY.queries} queries · {SUMMARY.errors} errors
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="display text-[36px] leading-tight text-zinc-50 sm:text-[42px]">
          We score ourselves <span className="display-italic" style={{color: "var(--accent-saffron)"}}>in public.</span>
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-zinc-400">
          Hackathons reward demos. We reward audits. Every metric below
          comes from <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-cyan-300">scripts/evaluate.py</code> running
          {" "}{SUMMARY.queries} fixed queries against the live agent. Re-run
          locally with <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-cyan-300">make eval</code>.
        </p>

        {/* Top 4 metrics */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            big={`${SUMMARY.meanSec}s`}
            label="Mean wall-clock"
            sub={`${perfDelta.toFixed(0)}% faster after parallel fan-out`}
            tone="emerald"
            icon={Clock}
          />
          <Stat
            big={`${SUMMARY.toolsCovered}/${SUMMARY.toolsTotal}`}
            label="Tools invoked"
            sub="all but find_medical_deserts in this run"
            tone="cyan"
            icon={Wrench}
          />
          <Stat
            big={`${SUMMARY.errors}/${SUMMARY.queries}`}
            label="Errors"
            sub="0 stack traces, 0 timeouts"
            tone="emerald"
            icon={CheckCircle2}
          />
          <Stat
            big="3"
            label="Languages cleared"
            sub="EN · हिंदी · தமிழ்"
            tone="amber"
            icon={Languages}
          />
        </div>

        {/* Validator distribution */}
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            Validator verdicts
          </div>
          <div className="flex h-12 overflow-hidden rounded-xl border border-zinc-800/80">
            <div
              className="flex items-center justify-center bg-emerald-500/20 text-[11.5px] font-semibold text-emerald-200"
              style={{ width: `${100 * SUMMARY.validator.PASS / SUMMARY.queries}%` }}
            >
              PASS · {SUMMARY.validator.PASS}
            </div>
            <div
              className="flex items-center justify-center bg-amber-500/20 text-[11.5px] font-semibold text-amber-200"
              style={{ width: `${100 * SUMMARY.validator.WARN / SUMMARY.queries}%` }}
            >
              WARN · {SUMMARY.validator.WARN}
            </div>
            <div
              className="flex items-center justify-center bg-red-500/20 text-[11.5px] font-semibold text-red-200"
              style={{ width: `${100 * SUMMARY.validator.FAIL / SUMMARY.queries}%`, minWidth: SUMMARY.validator.FAIL ? "10%" : "0" }}
            >
              {SUMMARY.validator.FAIL > 0 && `FAIL · ${SUMMARY.validator.FAIL}`}
            </div>
            <div
              className="flex items-center justify-center bg-zinc-800/40 text-[11px] text-zinc-500"
              style={{ width: `${100 * (SUMMARY.queries - SUMMARY.validator.PASS - SUMMARY.validator.WARN - SUMMARY.validator.FAIL) / SUMMARY.queries}%` }}
            >
              not validated this turn
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-zinc-500">
            The Validator agent re-checks high-stakes recommendations against
            the source text. WARN means the agent surfaced uncertainty in the
            answer card — never silent.
          </p>
        </section>

        {/* Tool frequency bars */}
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
            <Wrench className="h-3.5 w-3.5 text-cyan-300" />
            Tool frequency across {SUMMARY.queries} queries
          </div>
          <div className="space-y-1.5">
            {TOOL_FREQ.map((t) => {
              const pct = (t.calls / TOOL_FREQ[0].calls) * 100;
              const bar = {
                emerald: "bg-emerald-500/30",
                cyan: "bg-cyan-500/30",
                violet: "bg-violet-500/30",
                amber: "bg-amber-500/30",
              }[t.tone];
              const dot = {
                emerald: "bg-emerald-400",
                cyan: "bg-cyan-400",
                violet: "bg-violet-400",
                amber: "bg-amber-400",
              }[t.tone];
              return (
                <div key={t.name} className="flex items-center gap-3 text-[12px]">
                  <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  <span className="w-56 shrink-0 font-mono text-zinc-200">{t.name}</span>
                  <div className="flex-1">
                    <div
                      className={`h-3 rounded-r-md ${bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tab-num text-zinc-400">{t.calls}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Per-query table */}
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            Per-query results
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Query</th>
                  <th className="px-3 py-2 text-right font-semibold">Tools</th>
                  <th className="px-3 py-2 text-right font-semibold">Wall-clock</th>
                  <th className="px-3 py-2 text-center font-semibold">Callable</th>
                </tr>
              </thead>
              <tbody>
                {QUERIES.map((q, i) => (
                  <tr key={i} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                    <td className="px-3 py-2 tab-num text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2 text-zinc-200">{q.q}</td>
                    <td className="px-3 py-2 text-right tab-num text-zinc-300">{q.tools}</td>
                    <td className="px-3 py-2 text-right tab-num text-zinc-300">{q.dur.toFixed(1)}s</td>
                    <td className="px-3 py-2 text-center">
                      {q.phone ? (
                        <Phone className="mx-auto h-3 w-3 text-emerald-400" />
                      ) : (
                        <span className="text-zinc-600">·</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            Generated {SUMMARY.generated}. Source: <code className="rounded bg-zinc-800/80 px-1.5 py-0.5">docs/EVAL_REPORT.md</code>.
            MLflow eval runs land at <code className="rounded bg-zinc-800/80 px-1.5 py-0.5">/Shared/aarogya-atlas-eval</code>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({
  big,
  label,
  sub,
  tone,
  icon: Icon,
}: {
  big: string;
  label: string;
  sub: string;
  tone: "emerald" | "cyan" | "amber" | "violet";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const colors = {
    emerald: "border-emerald-700/40 bg-emerald-950/15 text-emerald-200",
    cyan: "border-cyan-700/40 bg-cyan-950/15 text-cyan-200",
    amber: "border-amber-700/40 bg-amber-950/15 text-amber-200",
    violet: "border-violet-700/40 bg-violet-950/15 text-violet-200",
  }[tone];
  return (
    <div className={`rounded-xl border ${colors} px-4 py-3.5`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider opacity-90">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-3xl font-semibold tab-num">{big}</div>
      <div className="mt-1 text-[11px] text-zinc-400">{sub}</div>
    </div>
  );
}
