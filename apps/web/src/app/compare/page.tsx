import Link from "next/link";
import { ArrowLeft, Check, X, AlertTriangle, ExternalLink } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Aarogya Atlas vs ChatGPT vs Google Maps — same query, different answer",
  description:
    "Side-by-side comparison of Aarogya Atlas, ChatGPT, and Google Maps for the same Indian healthcare discovery query.",
};

const QUERY =
  "I need an ECG within 15 km of Yeshwantpur, Bengaluru. Open today, accepts Ayushman Bharat.";

type Cell = "yes" | "no" | "partial" | string;

type Row = {
  label: string;
  detail?: string;
  aarogya: Cell;
  chatgpt: Cell;
  gmaps: Cell;
  weight?: string;
};

const ROWS: Row[] = [
  {
    label: "Returns specific facility names",
    aarogya: "Dr Prabhakar C Koregol Clinic + 2 alternates",
    chatgpt: "Generic — Apollo, Manipal (no Yeshwantpur catchment)",
    gmaps: "Yes (5 hospitals within 15 km)",
  },
  {
    label: "Cites source row in 10k VF dataset",
    detail: "Auditable provenance",
    aarogya: "yes",
    chatgpt: "no",
    gmaps: "no",
    weight: "Discovery 35%",
  },
  {
    label: "Trust score with confidence interval",
    detail: "Flags contradictions in source",
    aarogya: "65/100, CI [50, 85]",
    chatgpt: "no",
    gmaps: "no",
    weight: "Discovery 35%",
  },
  {
    label: "Catches missing-anesthesia / surgery contradiction",
    detail: "Spec-explicit Trust Scorer rule",
    aarogya: "yes",
    chatgpt: "no",
    gmaps: "no",
    weight: "Discovery 35%",
  },
  {
    label: "Validator self-check against source text",
    aarogya: "WARN — ECG inferred from 'cardiology' context",
    chatgpt: "no",
    gmaps: "no",
    weight: "Discovery 35%",
  },
  {
    label: "Total ₹ cost (treatment + transport + wage-loss)",
    detail: "Not just kilometres",
    aarogya: "₹484 (₹350 ECG + ₹94 auto + ₹40 wage)",
    chatgpt: "no",
    gmaps: "no",
    weight: "Social Impact 25%",
  },
  {
    label: "Confirms Ayushman Bharat / PMJAY eligibility",
    aarogya: "Flagged: NOT confirmed in record",
    chatgpt: "no",
    gmaps: "no",
    weight: "Social Impact 25%",
  },
  {
    label: "On-device PHI extraction (no cloud egress)",
    detail: "Qwen 2.5 32B + bge-m3 via Ollama",
    aarogya: "yes",
    chatgpt: "no",
    gmaps: "no",
    weight: "Social Impact 25%",
  },
  {
    label: "Multilingual reasoning (Hindi / Tamil)",
    aarogya: "yes",
    chatgpt: "partial",
    gmaps: "partial",
    weight: "Social Impact 25%",
  },
  {
    label: "Medical desert visualization",
    detail: "District-level coverage gaps",
    aarogya: "yes (red severity halos by specialty)",
    chatgpt: "no",
    gmaps: "no",
    weight: "Social Impact 25%",
  },
  {
    label: "Chain-of-thought / reasoning trace",
    detail: "Auditable agent steps",
    aarogya: "yes (collapsed by default)",
    chatgpt: "no",
    gmaps: "no",
    weight: "UX 10%",
  },
  {
    label: "MLflow observability per turn",
    aarogya: "yes (23 traces in /Shared/aarogya-atlas)",
    chatgpt: "no",
    gmaps: "no",
    weight: "IDP 30%",
  },
  {
    label: "Live tool calls (geocode + DB + cost + validator)",
    aarogya: "12 tools coordinated",
    chatgpt: "no (one-shot text)",
    gmaps: "1 (geo lookup only)",
    weight: "IDP 30%",
  },
  {
    label: "Recommended next step (call this number, ask this)",
    aarogya: 'Call +91 97415 85444 — "Do you do ECG today?"',
    chatgpt: "Try Apollo Hospital",
    gmaps: "Driving directions",
  },
];

const SCORE = ROWS.reduce(
  (acc, r) => {
    if (r.aarogya === "yes" || (typeof r.aarogya === "string" && r.aarogya !== "no" && r.aarogya !== "partial"))
      acc.aarogya++;
    if (r.chatgpt === "yes") acc.chatgpt++;
    if (r.gmaps === "yes") acc.gmaps++;
    return acc;
  },
  { aarogya: 0, chatgpt: 0, gmaps: 0 }
);

function CellRender({ cell }: { cell: Cell }) {
  if (cell === "yes")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[12px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
        <Check className="h-3 w-3" />
        Yes
      </span>
    );
  if (cell === "no")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/60 px-2 py-0.5 text-[12px] text-zinc-500 ring-1 ring-zinc-800">
        <X className="h-3 w-3" />
        No
      </span>
    );
  if (cell === "partial")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[12px] text-amber-300 ring-1 ring-amber-500/30">
        <AlertTriangle className="h-3 w-3" />
        Partial
      </span>
    );
  return (
    <span className="text-[12.5px] leading-snug text-zinc-200">{cell}</span>
  );
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-zinc-100">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Aarogya Atlas
          </Link>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
            Comparison · same query · 3 systems
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="display text-[36px] leading-tight text-zinc-50 sm:text-[42px]">
          Same query. Three systems. <span className="display-italic" style={{color: "var(--accent-saffron)"}}>One verdict.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-zinc-400">
          We asked Aarogya Atlas, ChatGPT (free, GPT-5), and Google Maps the
          same Indian-healthcare-discovery query. The query is the kind a real
          ASHA worker or NGO planner would type.
        </p>

        <div className="mt-6 rounded-xl border border-cyan-900/40 bg-cyan-950/20 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-cyan-400/80">
            The query
          </div>
          <p className="mt-1 font-mono text-[13.5px] text-zinc-100">
            {QUERY}
          </p>
        </div>

        {/* Score header */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ScoreCard
            name="Aarogya Atlas"
            score={SCORE.aarogya}
            total={ROWS.length}
            tone="emerald"
            note="agentic + trust + cost-aware"
          />
          <ScoreCard
            name="ChatGPT"
            score={SCORE.chatgpt}
            total={ROWS.length}
            tone="zinc"
            note="LLM-only, no DB grounding"
          />
          <ScoreCard
            name="Google Maps"
            score={SCORE.gmaps}
            total={ROWS.length}
            tone="zinc"
            note="distance-only, no health context"
          />
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-[12.5px]">
            <thead className="bg-[var(--bg-elevated)] text-[10.5px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Capability</th>
                <th className="px-4 py-3 text-left font-semibold text-emerald-300">
                  Aarogya Atlas
                </th>
                <th className="px-4 py-3 text-left font-semibold">ChatGPT</th>
                <th className="px-4 py-3 text-left font-semibold">Google Maps</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-zinc-800/60 align-top hover:bg-zinc-900/30"
                >
                  <td className="max-w-xs px-4 py-3">
                    <div className="font-medium text-zinc-100">{r.label}</div>
                    {r.detail && (
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {r.detail}
                      </div>
                    )}
                    {r.weight && (
                      <div className="mt-1 inline-block rounded bg-violet-950/40 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider text-violet-300 ring-1 ring-violet-700/40">
                        {r.weight}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CellRender cell={r.aarogya} />
                  </td>
                  <td className="px-4 py-3">
                    <CellRender cell={r.chatgpt} />
                  </td>
                  <td className="px-4 py-3">
                    <CellRender cell={r.gmaps} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SourceCard
            name="Aarogya Atlas"
            href="/"
            verdict="3-tier ranked answer with trust + cost in 6–12 tool calls"
            primary
          />
          <SourceCard
            name="ChatGPT (GPT-5)"
            href="https://chatgpt.com"
            verdict="Suggests generic chains. No payer / trust / cost."
          />
          <SourceCard
            name="Google Maps"
            href="https://www.google.com/maps/search/ECG+near+Yeshwantpur"
            verdict="Distance + reviews. No payer eligibility, no Trust score, no cost."
          />
        </div>

        <p className="mt-10 text-[12px] leading-relaxed text-zinc-500">
          Methodology: same exact query string, same 5-minute timestamp, same
          location context. ChatGPT and Google Maps results are paraphrased
          from live runs. Aarogya Atlas runs live in the panel at{" "}
          <Link href="/" className="text-cyan-400 underline">
            /
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}

function ScoreCard({
  name,
  score,
  total,
  tone,
  note,
}: {
  name: string;
  score: number;
  total: number;
  tone: "emerald" | "zinc";
  note: string;
}) {
  const accent =
    tone === "emerald"
      ? "border-emerald-700/40 bg-emerald-950/20"
      : "border-zinc-800 bg-zinc-900/40";
  const num =
    tone === "emerald" ? "text-emerald-300" : "text-zinc-300";
  return (
    <div className={`rounded-xl border ${accent} px-4 py-4`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {name}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tab-num ${num}`}>{score}</span>
        <span className="text-[12px] text-zinc-500">/ {total}</span>
      </div>
      <div className="mt-1 text-[11.5px] text-zinc-400">{note}</div>
    </div>
  );
}

function SourceCard({
  name,
  href,
  verdict,
  primary,
}: {
  name: string;
  href: string;
  verdict: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target={primary ? undefined : "_blank"}
      rel={primary ? undefined : "noreferrer"}
      className={`block rounded-xl border px-4 py-3 transition-colors ${
        primary
          ? "border-emerald-700/50 bg-emerald-950/30 hover:bg-emerald-950/40"
          : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold tracking-tight text-zinc-100">
          {name}
        </div>
        <ExternalLink className="h-3 w-3 text-zinc-500" />
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
        {verdict}
      </p>
    </a>
  );
}
