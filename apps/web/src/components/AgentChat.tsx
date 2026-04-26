"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Camera, Loader2, X as XIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  streamQuery,
  triagePhoto,
  type ChatMessage,
  type TraceEvent,
  type TriageResult,
  type CriticVerdict,
} from "@/lib/api";
import LiveStatus from "./LiveStatus";
import FinalAnswer from "./FinalAnswer";
import ReasoningDrawer from "./ReasoningDrawer";
import IdleHero from "./IdleHero";

export type AgentResult = {
  centerLatLon?: [number, number];
  origin?: [number, number]; // geocoded user location for routing
  facilities?: { id: string; name: string; lat: number; lon: number; rank?: number }[];
};

type TurnStatus = "streaming" | "done" | "error";

type Turn = {
  id: string;
  userQuery: string;
  trace: TraceEvent[];
  finalText: string;
  critic: CriticVerdict | null;
  error: string | null;
  status: TurnStatus;
  startedAt: number;
  computedAt?: number;
  durationMs?: number;
};

export default function AgentChat({
  onResult,
}: {
  onResult: (r: AgentResult) => void;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isStreaming = turns.some((t) => t.status === "streaming");

  useEffect(() => {
    if (turns.length === 0) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const updateTurn = useCallback((id: string, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const send = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query || isStreaming) return;

      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;

      const turnId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newTurn: Turn = {
        id: turnId,
        userQuery: query,
        trace: [],
        finalText: "",
        critic: null,
        error: null,
        status: "streaming",
        startedAt: Date.now(),
      };

      // Build the message history that will be sent to the API: every prior
      // completed turn contributes a (user, assistant) pair so the model has
      // full context for the follow-up.
      const history: ChatMessage[] = [];
      for (const t of turns) {
        history.push({ role: "user", content: t.userQuery });
        if (t.finalText) {
          history.push({ role: "assistant", content: t.finalText });
        }
      }
      history.push({ role: "user", content: query });

      setTurns((prev) => [...prev, newTurn]);
      setInput("");

      // Map results: rebuild from this turn's tool results only.
      const collectedMap = new Map<string, NonNullable<AgentResult["facilities"]>[number]>();
      let center: AgentResult["centerLatLon"] | undefined;
      let origin: AgentResult["origin"] | undefined;
      const rankOrder: string[] = [];

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
        for await (const evt of streamQuery(history, ctl.signal)) {
          if (evt.event === "step") {
            const step = evt.data;
            setTurns((prev) =>
              prev.map((t) =>
                t.id === turnId ? { ...t, trace: [...t.trace, step] } : t
              )
            );
            if (step.type === "tool_result") {
              try {
                const parsed = JSON.parse(step.content);
                if (step.tool === "geocode" && parsed?.ok) {
                  origin = [parsed.latitude, parsed.longitude];
                  center = [parsed.latitude, parsed.longitude];
                  pushUpdate();
                }
                if (step.tool === "facility_search" && Array.isArray(parsed)) {
                  for (const f of parsed.slice(0, 6)) {
                    if (typeof f.latitude === "number") {
                      trackFacility(f.id, f.name, f.latitude, f.longitude);
                    }
                  }
                  pushUpdate();
                }
                if (
                  (step.tool === "trust_score" ||
                    step.tool === "validate_recommendation") &&
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
            const finishedAt = Date.now();
            updateTurn(turnId, {
              finalText: evt.data.text,
              status: "done",
              computedAt: finishedAt,
              durationMs: finishedAt - newTurn.startedAt,
            });
          } else if (evt.event === "critic") {
            updateTurn(turnId, { critic: evt.data });
          } else if (evt.event === "error") {
            updateTurn(turnId, { error: evt.data.text, status: "error" });
          }
        }
        pushUpdate();
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // Stop button pressed mid-stream — leave the partial turn in place
          // so the user can see what was collected before the abort.
          updateTurn(turnId, { status: "done" });
          return;
        }
        updateTurn(turnId, {
          error: (e as Error).message || "Unknown error",
          status: "error",
        });
      }
    },
    [turns, isStreaming, onResult, updateTurn]
  );

  const stop = () => {
    abortRef.current?.abort();
  };

  const newConversation = () => {
    abortRef.current?.abort();
    setTurns([]);
    setInput("");
    setTriage(null);
    onResult({ facilities: [] });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setTriage(null);
    setTriageLoading(true);
    try {
      const t = await triagePhoto(f);
      setTriage(t);
      const r = t?.result;
      if (r?.recommended_specialty) {
        setInput(
          `${r.condition || r.observation} — need ${r.recommended_specialty} care nearby. Severity: ${r.severity}.`
        );
      }
    } finally {
      setTriageLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const idleEmpty = turns.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">
        {idleEmpty ? (
          <IdleHero onPick={(q) => void send(q)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            {turns.map((t) => (
              <TurnView key={t.id} turn={t} />
            ))}
            {turns.length > 0 && (
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={newConversation}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[10.5px] uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  <Plus className="h-3 w-3" />
                  New conversation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg)]/80 p-3 backdrop-blur-xl">
        <TriageCard triage={triage} onClose={() => setTriage(null)} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-2xl items-end gap-2"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={triageLoading || isStreaming}
            title="Attach a photo (wound, prescription, X-ray) — runs medgemma 27B on-device"
            className="glass mb-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800/40 hover:text-cyan-300 disabled:opacity-40"
          >
            {triageLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
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
                isStreaming
                  ? "Reasoning…"
                  : turns.length > 0
                  ? "Follow up · 'what about Mumbai instead' · 'which is open 24/7'"
                  : "Find me cardiac ICU within 40 km · हिंदी · தமிழ் · or press ⌘K"
              }
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              style={{ maxHeight: 120 }}
              disabled={isStreaming}
            />
            {isStreaming ? (
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
        <SystemBar />
      </div>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  return (
    <div className="space-y-3">
      <UserBubble query={turn.userQuery} />
      <LiveStatus trace={turn.trace} status={turn.status === "streaming" ? "streaming" : "done"} />
      {(turn.status === "streaming" || turn.finalText) && (
        <FinalAnswer
          text={turn.finalText}
          streaming={turn.status === "streaming"}
          computedAt={turn.computedAt}
          durationMs={turn.durationMs}
          toolCalls={turn.trace.filter((e) => e.type === "tool_request").length}
          critic={turn.critic}
        />
      )}
      {turn.error && (
        <div
          className="rounded-md border px-4 py-3 text-[13px]"
          style={{
            borderColor: "rgba(245,158,11,0.40)",
            background: "rgba(245,158,11,0.06)",
            color: "rgb(252, 211, 77)",
          }}
        >
          <div className="ticker mb-1 text-[10px]">
            <span>error</span>
            <span className="sep">·</span>
            <span>{Date().toString().split(" ").slice(1, 4).join(" ")}</span>
          </div>
          <div className="text-zinc-100">{turn.error}</div>
          <div className="mt-1.5 ticker text-[10.5px]">
            <span>Likely cause: backend cold start or API rate limit.</span>{" "}
            <span className="v">Wait 5s · retry the same query · or click a suggestion.</span>
          </div>
        </div>
      )}
      {turn.trace.length > 0 && turn.status !== "streaming" && (
        <ReasoningDrawer trace={turn.trace} critic={turn.critic} />
      )}
    </div>
  );
}

function TriageCard({
  triage,
  onClose,
}: {
  triage: TriageResult | null;
  onClose: () => void;
}) {
  if (!triage?.result) return null;
  const r = triage.result;
  const sevColor = {
    low: "border-emerald-700/40 bg-emerald-950/30 text-emerald-200",
    moderate: "border-amber-700/40 bg-amber-950/30 text-amber-200",
    high: "border-orange-700/40 bg-orange-950/30 text-orange-200",
    critical: "border-red-700/40 bg-red-950/30 text-red-200",
  }[r.severity] || "border-zinc-700/40 bg-zinc-900/30 text-zinc-200";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="mx-auto mb-2 max-w-2xl"
    >
      <div className={`flex items-start gap-2 rounded-xl border ${sevColor} px-3 py-2.5`}>
        <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" />
        <div className="flex-1 text-[12.5px] leading-relaxed">
          <div className="flex items-center gap-1.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-wider opacity-90">
              On-device triage · medgemma 27B
            </span>
            <span className="text-[9.5px] opacity-60">· severity {r.severity}</span>
          </div>
          <div className="mt-1 font-medium text-zinc-100">
            {r.condition || r.observation}
          </div>
          <div className="text-[11.5px] opacity-80">
            Recommended specialty: <span className="font-mono">{r.recommended_specialty}</span> · {r.rationale}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 transition-colors hover:text-zinc-200"
          aria-label="Dismiss triage"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function SystemBar() {
  return (
    <div className="mx-auto mt-2 flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-600">
      <SystemPill dot="emerald">12/12 tools</SystemPill>
      <SystemPill dot="cyan">critic-verified</SystemPill>
      <SystemPill dot="emerald">multi-turn</SystemPill>
      <SystemPill dot="violet">MLflow traced</SystemPill>
      <SystemPill dot="amber">EN · हिंदी · தமிழ்</SystemPill>
    </div>
  );
}

function SystemPill({
  dot,
  children,
}: {
  dot: "emerald" | "cyan" | "violet" | "amber";
  children: React.ReactNode;
}) {
  const colors = {
    emerald: "bg-emerald-400",
    cyan: "bg-cyan-400",
    violet: "bg-violet-400",
    amber: "bg-amber-400",
  }[dot];
  return (
    <span className="inline-flex items-center gap-1 tab-num">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors}`} />
      {children}
    </span>
  );
}

function UserBubble({ query }: { query: string }) {
  if (!query) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 text-[14px] leading-relaxed text-zinc-300">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
          You
        </span>
        <p className="mt-1">{query}</p>
      </div>
    </div>
  );
}
