"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Wrench,
  CheckCircle2,
  MapPin,
  Search,
  Clock,
  Activity,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { TraceEvent } from "@/lib/api";

const LOCAL_TOOLS = new Set([
  "extract_capabilities_from_note",
  "semantic_intake_search",
]);

const TOOL_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  geocode: { icon: MapPin, label: "Resolving location" },
  facility_search: { icon: Search, label: "Searching facilities" },
  check_hours: { icon: Clock, label: "Checking hours" },
  status_feed: { icon: Activity, label: "Reading live status" },
  extract_capabilities_from_note: {
    icon: FileText,
    label: "Extracting capabilities (on-device)",
  },
  semantic_intake_search: {
    icon: FileText,
    label: "Semantic search (on-device)",
  },
};

export default function TraceStep({ step }: { step: TraceEvent }) {
  if (step.type === "thought") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex gap-3 rounded-lg border border-[var(--border-soft)] bg-violet-950/10 px-3 py-2.5"
      >
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 ring-1 ring-violet-500/20">
          <Brain className="h-3.5 w-3.5 text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
            Reasoning · GPT-OSS-120B (Groq)
          </div>
          <div className="mt-1 text-[13px] leading-relaxed text-zinc-200">
            {step.content || (
              <span className="italic text-zinc-500">(thinking…)</span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (step.type === "tool_request") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-2"
      >
        {step.content && (
          <div className="text-[13px] leading-relaxed text-zinc-300">
            {step.content}
          </div>
        )}
        {step.tool_calls?.map((tc, i) => (
          <ToolCallCard key={`${tc.name}-${i}`} name={tc.name} args={tc.args} />
        ))}
      </motion.div>
    );
  }

  if (step.type === "tool_result") {
    return <ToolResultCard tool={step.tool} content={step.content} />;
  }

  return null;
}

function ToolCallCard({
  name,
  args,
}: {
  name: string;
  args: Record<string, unknown>;
}) {
  const meta = TOOL_META[name] || { icon: Wrench, label: name };
  const isLocal = LOCAL_TOOLS.has(name);
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-[var(--bg-card)]/60 px-3 py-2",
        isLocal
          ? "border-cyan-900/60"
          : "border-[var(--border-soft)]"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          isLocal
            ? "bg-cyan-500/10 ring-cyan-500/30"
            : "bg-zinc-800 ring-zinc-700"
        )}
      >
        <Icon
          className={cn("h-3.5 w-3.5", isLocal ? "text-cyan-300" : "text-zinc-300")}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-zinc-100">
            {meta.label}
          </span>
          {isLocal && (
            <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
              On-device
            </span>
          )}
        </div>
        <div className="mt-1 truncate font-mono text-[10.5px] text-zinc-500">
          {Object.entries(args)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(" · ")}
        </div>
      </div>
    </div>
  );
}

function ToolResultCard({ tool, content }: { tool: string; content: string }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[tool] || { icon: CheckCircle2, label: tool };
  const isLocal = LOCAL_TOOLS.has(tool);

  let summary = "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      summary = `${parsed.length} result${parsed.length === 1 ? "" : "s"}`;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if ("ok" in obj) summary = obj.ok ? "ok" : "no match";
      else if ("status" in obj) summary = String(obj.status);
      else if ("open" in obj) summary = `open: ${obj.open}`;
      else summary = "received";
    }
  } catch {
    summary = `${content.length} bytes`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)]/40 px-3 py-2"
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          isLocal
            ? "bg-cyan-500/10 ring-cyan-500/30"
            : "bg-emerald-500/10 ring-emerald-500/20"
        )}
      >
        <CheckCircle2
          className={cn(
            "h-3.5 w-3.5",
            isLocal ? "text-cyan-300" : "text-emerald-300"
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-zinc-300">
            {meta.label}
          </span>
          <span className="text-[10px] tab-num text-zinc-500">→ {summary}</span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                open && "rotate-180"
              )}
            />
            {open ? "hide" : "raw"}
          </button>
        </div>
        {open && (
          <pre className="scrollbar-thin mt-2 max-h-48 overflow-auto rounded border border-[var(--border-soft)] bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">
            {typeof parsed === "object"
              ? JSON.stringify(parsed, null, 2)
              : content}
          </pre>
        )}
      </div>
    </motion.div>
  );
}
