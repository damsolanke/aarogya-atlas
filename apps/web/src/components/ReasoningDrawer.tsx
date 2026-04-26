"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Brain, Wrench, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TraceEvent, CriticVerdict } from "@/lib/api";

const LOCAL_TOOLS = new Set([
  "extract_capabilities_from_note",
  "semantic_intake_search",
]);

export default function ReasoningDrawer({
  trace,
  critic,
}: {
  trace: TraceEvent[];
  critic?: CriticVerdict | null;
}) {
  const [open, setOpen] = useState(false);
  const stepCount = trace.filter(
    (e) => e.type === "tool_request" || e.type === "thought"
  ).length;
  if (stepCount === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[var(--bg-card)]/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-zinc-900/40"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-zinc-500 transition-transform",
            open && "rotate-90"
          )}
        />
        <span className="text-[12.5px] font-medium text-zinc-200">
          Reasoning trace
        </span>
        <span className="text-[10.5px] tab-num text-zinc-500">
          · {stepCount} step{stepCount === 1 ? "" : "s"}
        </span>
        <span className="ml-auto text-[10.5px] text-zinc-500">
          {open ? "hide" : "view"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ol className="space-y-px border-t border-zinc-800/60 px-2 py-2">
              {trace.map((step, i) => (
                <li key={i}>
                  <Row step={step} index={i} />
                </li>
              ))}
              {critic && (
                <li>
                  <CriticRow critic={critic} />
                </li>
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CriticRow({ critic }: { critic: CriticVerdict }) {
  const tone =
    critic.verdict === "PASS"
      ? { color: "text-emerald-300", bg: "bg-emerald-950/30", border: "border-emerald-800/40", dot: "bg-emerald-400" }
      : critic.verdict === "WARN"
      ? { color: "text-amber-300", bg: "bg-amber-950/30", border: "border-amber-800/40", dot: "bg-amber-400" }
      : { color: "text-red-300", bg: "bg-red-950/30", border: "border-red-800/40", dot: "bg-red-400" };
  return (
    <div className={cn("mt-2 rounded-md border px-2.5 py-1.5", tone.border, tone.bg)}>
      <div className="flex items-center gap-2 text-[11.5px]">
        <ShieldCheck className={cn("h-3.5 w-3.5", tone.color)} />
        <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-wider", tone.color)}>
          critic verdict
        </span>
        <span className={cn("inline-flex h-1.5 w-1.5 rounded-full", tone.dot)} />
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", tone.color)}>
          {critic.verdict}
        </span>
        <span className="ml-auto font-mono text-[11px] text-zinc-300 tab-num">
          {critic.trust_score}/100
        </span>
      </div>
      {critic.summary && (
        <div className="mt-1 pl-5 text-[11.5px] leading-snug text-zinc-300">
          {critic.summary}
        </div>
      )}
      {critic.flags && critic.flags.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-5">
          {critic.flags.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
              <AlertTriangle
                className={cn(
                  "mt-[2px] h-3 w-3 shrink-0",
                  f.severity === "high" ? "text-red-400" : f.severity === "med" ? "text-amber-400" : "text-zinc-500"
                )}
              />
              <span>{f.issue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ step, index }: { step: TraceEvent; index: number }) {
  if (step.type === "thought") {
    return (
      <div className="flex gap-2.5 px-2 py-1.5">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
        </span>
        <p className="text-[12px] leading-relaxed text-zinc-300">
          {step.content || (
            <span className="italic text-zinc-500">(adaptive thinking)</span>
          )}
        </p>
      </div>
    );
  }

  if (step.type === "tool_request") {
    return (
      <div className="space-y-1 px-2 py-1.5">
        {step.content && (
          <p className="text-[12px] leading-relaxed text-zinc-300">
            {step.content}
          </p>
        )}
        {step.tool_calls?.map((tc, i) => {
          const isLocal = LOCAL_TOOLS.has(tc.name);
          return (
            <div
              key={i}
              className="flex items-center gap-2 text-[11.5px]"
            >
              <Wrench
                className={cn(
                  "h-3 w-3",
                  isLocal ? "text-cyan-400" : "text-zinc-500"
                )}
              />
              <span className={cn("font-mono font-medium", isLocal ? "text-cyan-300" : "text-zinc-300")}>
                {tc.name}
              </span>
              {isLocal && (
                <span className="rounded border border-cyan-700/60 bg-cyan-950/40 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
                  on-device
                </span>
              )}
              <span className="truncate font-mono text-[10.5px] text-zinc-600">
                {Object.entries(tc.args)
                  .slice(0, 3)
                  .map(([k, v]) => `${k}=${trim(JSON.stringify(v))}`)
                  .join(" · ")}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (step.type === "tool_result") {
    let summary = "";
    try {
      const parsed = JSON.parse(step.content);
      if (Array.isArray(parsed)) summary = `${parsed.length} results`;
      else if (parsed?.trust_score !== undefined)
        summary = `score ${parsed.trust_score}/100`;
      else if (parsed?.verdict) summary = parsed.verdict;
      else if (parsed?.total_inr !== undefined)
        summary = `₹${parsed.total_inr}`;
      else if (parsed?.distance_km !== undefined)
        summary = `${parsed.distance_km} km`;
      else if (parsed?.ok !== undefined) summary = parsed.ok ? "ok" : "no match";
      else summary = "received";
    } catch {
      summary = "received";
    }
    return (
      <div className="flex items-center gap-2 px-2 py-1 pl-7 text-[11px] text-zinc-500">
        <CheckCircle2 className="h-3 w-3 text-emerald-500/80" />
        <span className="font-mono text-zinc-500">{step.tool}</span>
        <span className="text-zinc-600">→ {summary}</span>
      </div>
    );
  }

  return null;
}

function trim(s: string) {
  return s.length > 26 ? s.slice(0, 24) + "…" : s;
}
