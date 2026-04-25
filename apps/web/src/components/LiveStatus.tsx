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
import type { TraceEvent } from "@/lib/api";

const TOOL_LABELS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; local?: boolean }
> = {
  geocode:                       { label: "Locating",                icon: MapPin },
  facility_search:               { label: "Searching facilities",    icon: Search },
  check_hours:                   { label: "Checking hours",          icon: Clock },
  status_feed:                   { label: "Reading live status",     icon: Activity },
  extract_capabilities_from_note:{ label: "Extracting on-device",    icon: FileText, local: true },
  semantic_intake_search:        { label: "Semantic search on-device", icon: FileText, local: true },
  estimate_journey:              { label: "Estimating journey",      icon: MapPin },
  total_out_of_pocket:           { label: "Computing total cost",    icon: Wallet },
  trust_score:                   { label: "Trust-scoring",           icon: ShieldCheck },
  find_medical_deserts:          { label: "Mapping medical deserts", icon: MapPin },
  validate_recommendation:       { label: "Validating evidence",     icon: CheckCircle2 },
};

function deriveCurrentActivity(trace: TraceEvent[]): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  local?: boolean;
  finished: boolean;
} | null {
  for (let i = trace.length - 1; i >= 0; i--) {
    const ev = trace[i];
    if (ev.type === "tool_request" && ev.tool_calls?.length) {
      const tc = ev.tool_calls[0];
      const meta = TOOL_LABELS[tc.name] || { label: tc.name, icon: Wrench };
      return { label: meta.label, icon: meta.icon, local: meta.local, finished: false };
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
  const stepCount = trace.filter(
    (e) => e.type === "tool_request" || e.type === "thought"
  ).length;
  const toolStepCount = trace.filter((e) => e.type === "tool_request").length;
  const activity = status === "streaming" ? deriveCurrentActivity(trace) : null;

  return (
    <AnimatePresence mode="wait">
      {status === "streaming" && (
        <motion.div
          key="streaming"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-2 rounded-full border border-cyan-900/60 bg-cyan-950/30 px-3 py-1.5"
        >
          {activity ? (
            <>
              <activity.icon className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-[12px] text-zinc-100">{activity.label}</span>
              {activity.local && (
                <span className="rounded border border-cyan-700/60 bg-cyan-950/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
                  on-device
                </span>
              )}
            </>
          ) : (
            <>
              <span className="dot-pulse" />
              <span className="text-[12px] text-zinc-300">Thinking</span>
            </>
          )}
          <span className="ml-1 text-[10px] tab-num text-zinc-500">
            · step {stepCount}
          </span>
        </motion.div>
      )}
      {status === "done" && toolStepCount > 0 && (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
          <span className="text-[12px] text-zinc-100">
            Resolved in {toolStepCount} tool {toolStepCount === 1 ? "call" : "calls"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
