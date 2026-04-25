"use client";

import { useEffect, useRef, useState } from "react";
import { streamQuery, type TraceEvent } from "@/lib/api";

const SAMPLE_QUERIES = [
  "I need an ECG within 2 hours of Yeshwantpur, open today, accepts Ayushman Bharat.",
  "मेरी मां के लिए डायलिसिस चाहिए, बेंगलुरु के पास, आयुष्मान भारत में।",
  "Cardiology consult near Hubli today — cash payment is fine.",
  "Pediatric ICU available in Mysuru tonight?",
];

export type AgentResult = {
  trace: TraceEvent[];
  finalText: string;
  facilities?: { id: string; name: string; lat: number; lon: number }[];
  centerLatLon?: [number, number];
};

export default function AgentChat({
  onResult,
}: {
  onResult: (r: AgentResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [finalText, setFinalText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [trace, finalText]);

  async function run(q: string) {
    if (running) return;
    setError(null);
    setTrace([]);
    setFinalText("");
    setRunning(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let centerLatLon: [number, number] | undefined;
    const facilities: AgentResult["facilities"] = [];

    try {
      for await (const evt of streamQuery(q, abortRef.current.signal)) {
        if (evt.event === "step") {
          setTrace((t) => [...t, evt.data]);
          if (evt.data.type === "tool_result") {
            // Best-effort extraction of structured data from tool results
            try {
              const parsed = parseToolContent(evt.data.content);
              if (evt.data.tool === "geocode" && parsed?.latitude && parsed?.longitude) {
                centerLatLon = [parsed.latitude, parsed.longitude];
              }
              if (evt.data.tool === "facility_search" && Array.isArray(parsed)) {
                for (const f of parsed) {
                  if (f.id && f.latitude && f.longitude) {
                    facilities.push({
                      id: f.id,
                      name: f.name,
                      lat: f.latitude,
                      lon: f.longitude,
                    });
                  }
                }
              }
            } catch {
              /* ignore */
            }
          }
        } else if (evt.event === "final") {
          setFinalText(evt.data.text);
          onResult({ trace: [], finalText: evt.data.text, facilities, centerLatLon });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 border-b border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                run(q);
              }}
              disabled={running}
              className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-50"
            >
              {q.length > 60 ? q.slice(0, 60) + "…" : q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {trace.map((step, i) => (
          <TraceStep key={i} step={step} />
        ))}
        {finalText && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/60 p-4">
            <div className="text-xs uppercase tracking-wider text-emerald-300 mb-2">
              Final answer
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">
              {finalText}
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        <div ref={traceEndRef} />
      </div>

      <form
        className="px-5 py-3 border-t border-zinc-800 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) run(query.trim());
        }}
      >
        <input
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-700"
          placeholder="Ask in English, Hindi, or Tamil…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={running}
        />
        <button
          type="submit"
          disabled={running || !query.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium"
        >
          {running ? "Thinking…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function TraceStep({ step }: { step: TraceEvent }) {
  if (step.type === "tool_request") {
    return (
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
        <div className="text-[11px] uppercase tracking-wider text-cyan-400 mb-1">
          Tool call
        </div>
        {step.tool_calls?.map((tc, i) => (
          <div key={i} className="text-sm font-mono text-zinc-200">
            {tc.name}(
            <span className="text-zinc-500">
              {Object.keys(tc.args).join(", ")}
            </span>
            )
          </div>
        ))}
        {step.content && (
          <div className="text-xs text-zinc-400 mt-2 whitespace-pre-wrap">
            {step.content}
          </div>
        )}
      </div>
    );
  }
  if (step.type === "tool_result") {
    const local =
      step.tool === "extract_capabilities_from_note" ||
      step.tool === "semantic_intake_search";
    return (
      <div className="rounded-lg bg-zinc-900/30 border border-zinc-800/60 p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400">
            Tool result · {step.tool}
          </span>
          {local && (
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
              On-device
            </span>
          )}
        </div>
        <pre className="text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-40">
          {truncate(step.content, 600)}
        </pre>
      </div>
    );
  }
  return (
    <div className="text-sm text-zinc-300 px-1">
      {step.content}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function parseToolContent(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
