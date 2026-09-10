"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search,
  FileText,
  Clock,
  Activity,
  Wrench,
  ShieldCheck,
  Brain,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import type { RunsOn, TraceEvent } from "@/lib/api";
import { runsOnLabel } from "@/lib/useRuntime";

// Labels only. Where a tool runs (on-device / cloud / host) comes from the
// backend's `runs_on` on each event — see `aarogya_api.agent.tool_runs_on`.
const TOOL_LABELS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }
> = {
  geocode:                       { label: "Locating",                icon: MapPin },
  facility_search:               { label: "Searching facilities",    icon: Search },
  check_hours:                   { label: "Checking hours",          icon: Clock },
  status_feed:                   { label: "Reading live status",     icon: Activity },
  extract_capabilities_from_note:{ label: "Extracting capabilities", icon: FileText },
  semantic_intake_search:        { label: "Semantic search",         icon: FileText },
  estimate_journey:              { label: "Estimating journey",      icon: MapPin },
  total_out_of_pocket:           { label: "Computing total cost",    icon: Wallet },
  trust_score:                   { label: "Trust-scoring",           icon: ShieldCheck },
  find_medical_deserts:          { label: "Mapping medical deserts", icon: MapPin },
  validate_recommendation:       { label: "Validating evidence",     icon: CheckCircle2 },
};

function deriveCurrentActivity(trace: TraceEvent[]): {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  runsOn?: RunsOn;
  finished: boolean;
} | null {
  for (let i = trace.length - 1; i >= 0; i--) {
    const ev = trace[i];
    if (ev.type === "tool_request" && ev.tool_calls?.length) {
      const tc = ev.tool_calls[0];
      const meta = TOOL_LABELS[tc.name] || { label: tc.name, icon: Wrench };
      return { label: meta.label, icon: meta.icon, runsOn: tc.runs_on, finished: false };
    }
    if (ev.type === "thought") {
      return { label: "Reasoning", icon: Brain, finished: false };
    }
  }
  return null;
}

export default function LiveStatus({
  trace,
  status,
}: {
  trace: TraceEvent[];
  status: "idle" | "streaming" | "done" | "error";
}) {
  const toolStepCount = trace.filter((e) => e.type === "tool_request").length;
  const activity = status === "streaming" ? deriveCurrentActivity(trace) : null;

  // Last 4 tool calls scrolling — judges see the actual process.
  const recentTools = trace
    .flatMap((e) =>
      e.type === "tool_request" ? (e.tool_calls || []).map((tc) => tc.name) : []
    )
    .slice(-4);

  return (
    <AnimatePresence mode="wait">
      {status === "streaming" && (
        <motion.div
          key="streaming"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5" style={{borderColor: "rgba(232,146,61,0.30)", background: "rgba(232,146,61,0.06)"}}>
            {activity ? (
              <>
                <activity.icon className="h-3.5 w-3.5" style={{color: "var(--accent-saffron)"}} />
                <span className="text-[12px] text-zinc-100">{activity.label}</span>
                {runsOnLabel(activity.runsOn) && (
                  <span
                    className={
                      activity.runsOn === "device"
                        ? "rounded border border-cyan-700/60 bg-cyan-950/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-cyan-300"
                        : "rounded border border-amber-700/60 bg-amber-950/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-300"
                    }
                  >
                    {runsOnLabel(activity.runsOn)}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="dot-pulse" />
                <span className="text-[12px] text-zinc-300">Reasoning</span>
              </>
            )}
            <span className="ml-1 text-[10px] tab-num text-zinc-500">
              · {toolStepCount} {toolStepCount === 1 ? "tool" : "tools"} so far
            </span>
          </div>
          {recentTools.length > 0 && (
            <div className="ticker px-1 overflow-hidden whitespace-nowrap">
              {recentTools.map((name, i) => (
                <span key={i}>
                  <span className={i === recentTools.length - 1 ? "v" : ""}>{name}</span>
                  {i < recentTools.length - 1 && <span className="sep">→</span>}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
      {status === "done" && toolStepCount > 0 && (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5" style={{borderColor: "rgba(20,184,166,0.30)", background: "rgba(20,184,166,0.06)"}}
        >
          <CheckCircle2 className="h-3.5 w-3.5" style={{color: "var(--accent-teal)"}} />
          <span className="text-[12px] text-zinc-100">
            Resolved in {toolStepCount} tool {toolStepCount === 1 ? "call" : "calls"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
