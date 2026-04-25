"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { streamQuery, type TraceEvent } from "@/lib/api";
import LiveStatus from "./LiveStatus";
import FinalAnswer from "./FinalAnswer";
import ReasoningDrawer from "./ReasoningDrawer";
import IdleHero from "./IdleHero";

export type AgentResult = {
  centerLatLon?: [number, number];
  origin?: [number, number]; // geocoded user location for routing
  facilities?: { id: string; name: string; lat: number; lon: number; rank?: number }[];
};

type Status = "idle" | "streaming" | "done" | "error";

export default function AgentChat({
  onResult,
}: {
  onResult: (r: AgentResult) => void;
}) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trace.length, finalText, status]);

  const send = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query || status === "streaming") return;

      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;

      setStatus("streaming");
      setTrace([]);
      setFinalText("");
      setError(null);
      setLastQuery(query);
      setInput("");

      const collectedMap = new Map<string, AgentResult["facilities"][number]>();
      let center: AgentResult["centerLatLon"] | undefined;
      let origin: AgentResult["origin"] | undefined;
      const rankOrder: string[] = []; // first-seen order = rank 1, 2, 3...

      const trackFacility = (
        id: string,
        name: string,
        lat: number,
        lon: number
      ) => {
        if (!collectedMap.has(id)) {
          rankOrder.push(id);
          collectedMap.set(id, { id, name, lat, lon, rank: rankOrder.length });
        }
      };

      const pushUpdate = () => {
        const facilities = Array.from(collectedMap.values());
        onResult({ centerLatLon: center, origin, facilities });
      };

      try {
        for await (const evt of streamQuery(query, ctl.signal)) {
          if (evt.event === "step") {
            setTrace((prev) => [...prev, evt.data]);
            if (evt.data.type === "tool_result") {
              try {
                const parsed = JSON.parse(evt.data.content);
                if (evt.data.tool === "geocode" && parsed?.ok) {
                  origin = [parsed.latitude, parsed.longitude];
                  center = [parsed.latitude, parsed.longitude];
                  pushUpdate();
                }
                if (
                  evt.data.tool === "facility_search" &&
                  Array.isArray(parsed)
                ) {
                  for (const f of parsed.slice(0, 6)) {
                    if (typeof f.latitude === "number") {
                      trackFacility(f.id, f.name, f.latitude, f.longitude);
                    }
                  }
                  pushUpdate();
                }
                if (
                  (evt.data.tool === "trust_score" ||
                    evt.data.tool === "validate_recommendation") &&
                  parsed?.facility_id &&
                  typeof parsed.latitude === "number"
                ) {
                  trackFacility(
                    parsed.facility_id,
                    parsed.facility_name || parsed.facility_id,
                    parsed.latitude,
                    parsed.longitude
                  );
                  if (!center) center = [parsed.latitude, parsed.longitude];
                  pushUpdate();
                }
              } catch {
                /* ignore */
              }
            }
          } else if (evt.event === "final") {
            setFinalText(evt.data.text);
            setStatus("done");
          } else if (evt.event === "error") {
            setError(evt.data.text);
            setStatus("error");
          }
        }
        pushUpdate();
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          setStatus("idle");
          return;
        }
        setError((e as Error).message || "Unknown error");
        setStatus("error");
      }
    },
    [status, onResult]
  );

  const stop = () => {
    abortRef.current?.abort();
    setStatus("idle");
  };

  const reset = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setTrace([]);
    setFinalText("");
    setError(null);
    setLastQuery("");
  };

  const idleEmpty = status === "idle" && trace.length === 0 && !finalText;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">
        {idleEmpty ? (
          <IdleHero onPick={(q) => void send(q)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            <UserBubble query={lastQuery} onClear={reset} />
            <LiveStatus trace={trace} status={status} />
            {(status === "streaming" || finalText) && (
              <FinalAnswer text={finalText} streaming={status === "streaming"} />
            )}
            {error && (
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-[13px] text-amber-200">
                {error}
              </div>
            )}
            {trace.length > 0 && status !== "streaming" && (
              <ReasoningDrawer trace={trace} />
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg)]/80 p-3 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-2xl items-end gap-2"
        >
          <div className="glass relative flex-1 rounded-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                status === "streaming"
                  ? "Agent is thinking…"
                  : "Ask in English, हिंदी, or தமிழ்"
              }
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              style={{ maxHeight: 120 }}
              disabled={status === "streaming"}
            />
            {status === "streaming" ? (
              <button
                type="button"
                onClick={stop}
                className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/25"
                aria-label="Stop"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  "absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-all",
                  input.trim()
                    ? "bg-emerald-500 text-emerald-950 ring-emerald-400/60 hover:bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                    : "bg-zinc-800/40 text-zinc-600 ring-zinc-800/60"
                )}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function UserBubble({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  if (!query) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 text-[14px] leading-relaxed text-zinc-300">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
          Question
        </span>
        <p className="mt-1">{query}</p>
      </div>
      <button
        onClick={onClear}
        className="text-[10.5px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        New
      </button>
    </div>
  );
}

