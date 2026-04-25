"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { streamQuery, type TraceEvent } from "@/lib/api";
import Suggestions from "./Suggestions";
import TraceStep from "./TraceStep";

export type AgentResult = {
  centerLatLon?: [number, number];
  facilities?: { id: string; name: string; lat: number; lon: number }[];
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

  // auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trace, finalText]);

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

      const collectedFacilities: AgentResult["facilities"] = [];
      let center: AgentResult["centerLatLon"] | undefined;

      try {
        for await (const evt of streamQuery(query, ctl.signal)) {
          if (evt.event === "step") {
            setTrace((prev) => [...prev, evt.data]);

            if (evt.data.type === "tool_result") {
              try {
                const parsed = JSON.parse(evt.data.content);
                if (evt.data.tool === "geocode" && parsed?.ok) {
                  center = [parsed.latitude, parsed.longitude];
                }
                if (
                  evt.data.tool === "facility_search" &&
                  Array.isArray(parsed)
                ) {
                  for (const f of parsed.slice(0, 6)) {
                    if (typeof f.latitude === "number") {
                      collectedFacilities.push({
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
            setStatus("done");
          } else if (evt.event === "error") {
            setError(evt.data.text);
            setStatus("error");
          }
        }
        onResult({ centerLatLon: center, facilities: collectedFacilities });
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

  const idleEmpty = status === "idle" && trace.length === 0 && !finalText;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">
        {idleEmpty ? (
          <IdleHero onPick={send} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <UserBubble query={lastQuery} />
            <AnimatePresence initial={false}>
              {trace.map((step, i) => (
                <TraceStep key={i} step={step} />
              ))}
            </AnimatePresence>
            {(status === "streaming" || finalText) && (
              <FinalAnswerCard text={finalText} streaming={status === "streaming"} />
            )}
            {error && (
              <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-[12px] text-red-300">
                {error}
              </div>
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
              placeholder="Ask in English, हिंदी, or தமிழ் — e.g., dialysis near Bengaluru, Ayushman Bharat…"
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              style={{ maxHeight: 120 }}
              disabled={status === "streaming"}
            />
            {status === "streaming" ? (
              <button
                type="button"
                onClick={stop}
                className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/30"
                aria-label="Stop streaming"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  "absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-all",
                  input.trim()
                    ? "bg-emerald-500 text-emerald-950 ring-emerald-400/60 hover:bg-emerald-400"
                    : "bg-zinc-800/60 text-zinc-600 ring-zinc-800"
                )}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>
        <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between text-[10px] text-zinc-600">
          <span>
            Local: Qwen 2.5 32B · MedGemma 27B · bge-m3 · Cloud: Claude Opus 4.7
          </span>
          <span>↵ to send</span>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ query }: { query: string }) {
  if (!query) return null;
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-zinc-700/60 bg-zinc-100/95 px-4 py-2.5 text-[14px] leading-relaxed text-zinc-900 shadow-md">
        {query}
      </div>
    </div>
  );
}

function FinalAnswerCard({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/30 via-[var(--bg-card)] to-[var(--bg-card)] p-4 shadow-lg shadow-black/20"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
          Final answer
        </span>
        {streaming && !text && (
          <span className="text-[10px] text-zinc-500">streaming…</span>
        )}
      </div>
      <div
        className={cn(
          "max-w-none whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-100",
          streaming && !text && "caret"
        )}
      >
        {text || ""}
      </div>
    </motion.div>
  );
}

function IdleHero({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-8">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1 text-[10.5px] font-medium uppercase tracking-wider text-emerald-300">
          <span className="dot-pulse" />
          Live · 8,504 facilities indexed · Karnataka pilot
        </div>
        <h1 className="bg-gradient-to-br from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-semibold leading-tight tracking-tight text-transparent sm:text-4xl">
          The right hospital,
          <br />
          before the journey begins.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-zinc-500">
          Ask in any language. The agent reasons across capabilities, hours,
          payer (Ayushman Bharat / cash / private), and live status — with{" "}
          <span className="text-cyan-300">PHI extraction running on-device</span>.
        </p>
      </div>

      <div className="mt-8 w-full">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Try one
        </div>
        <Suggestions onPick={onPick} />
      </div>
    </div>
  );
}
