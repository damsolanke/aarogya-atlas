"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  ShieldCheck,
  Wallet,
  Phone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Suggestions from "./Suggestions";

/**
 * Idle hero shown when the chat is empty.
 *
 * Hits hard in 5 seconds:
 *   - Etymology callout (आरोग्य) so judges feel the cultural ground
 *   - Three animated stat counters with the actual numbers
 *   - A mock answer-card preview so judges see what the agent will produce
 *     BEFORE they click anything
 *   - Suggestions row to start the live demo
 */
export default function IdleHero({
  onPick,
}: {
  onPick: (q: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-2 pb-6">
      {/* Etymology + name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <div className="ticker mb-3 inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{background: "var(--accent-saffron)"}} />
          <span className="v">Live</span>
          <span className="sep">│</span>
          <span>Databricks</span>
          <span className="sep">│</span>
          <span className="v">Critic-verified</span>
          <span className="sep">│</span>
          <span className="v">12/12</span>
          <span>tools</span>
        </div>

        {/* The Sanskrit wordmark IS the logo. Tiro Devanagari Hindi at hero scale. */}
        <EtymologyHover />

        <h1 className="display mt-2 text-[36px] leading-[1.05] text-zinc-50 sm:text-[44px]">
          <span>Aarogya </span>
          <span className="display-italic" style={{color: "var(--accent-saffron)"}}>Atlas</span>
        </h1>

        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-zinc-400">
          Triage a photo, score the trust, route to the closest facility that&apos;s actually
          equipped — in 6 tool calls, in your language. Built for ASHA workers and NGO
          planners across India.
        </p>
      </motion.div>

      {/* Stat counters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-3 gap-2"
      >
        <Stat
          big={
            mounted ? (
              <CountUp end={10000} duration={1.6} separator="," />
            ) : (
              "10,000"
            )
          }
          label="facilities"
          sub="all of India"
          tone="cyan"
        />
        <Stat
          big={
            mounted ? (
              <>
                <CountUp end={7.7} duration={1.6} decimals={1} />
                <span className="text-[18px]">×</span>
              </>
            ) : (
              "7.7×"
            )
          }
          label="ICU disparity"
          sub="best vs worst state"
          tone="amber"
        />
        <Stat
          big={
            mounted ? (
              <CountUp end={146} duration={1.6} />
            ) : (
              "146"
            )
          }
          label="critical districts"
          sub="zero dialysis coverage"
          tone="red"
        />
      </motion.div>

      {/* Sample answer preview — illustrates the critic-verified Trust Score
          banner that fronts every recommendation. Numbers below are a static
          example; the real answer lands once you send a query. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-lg border border-zinc-800/80 bg-[var(--bg-card)]/70 shadow-xl shadow-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-zinc-800/80 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent px-3.5 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/30 ring-1 ring-emerald-500/50">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="flex-1 leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Critic-verified
              </span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                PASS
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-[20px] font-semibold tabular-nums text-emerald-200">
                92
              </span>
              <span className="text-[11px] text-zinc-500">/ 100 trust score</span>
            </div>
          </div>
          <span className="rounded-md px-2 py-0.5 text-[10px] tracking-wider text-zinc-400 ring-1 ring-zinc-700/80">
            preview
          </span>
        </div>
        <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3.5 py-2" style={{background: "linear-gradient(90deg, rgba(232,146,61,0.10), transparent)"}}>
          <div className="flex h-6 w-6 items-center justify-center rounded-md ring-1 brand-glow" style={{background: "rgba(232,146,61,0.10)", borderColor: "rgba(232,146,61,0.4)"}}>
            <Sparkles className="h-3.5 w-3.5" style={{color: "var(--accent-saffron)"}} />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold tracking-tight text-zinc-100">
              Sample answer · cardiac ICU · Bengaluru
            </div>
            <div className="ticker text-[10px]">
              <span className="v">6 tools</span>
              <span className="sep">│</span>
              <span className="v">28s</span>
              <span className="sep">│</span>
              <span>GPT-OSS-120B · Groq</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 p-3.5">
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/15 px-3.5 py-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Star className="h-3 w-3 text-zinc-300" />
              <span className="rounded bg-emerald-500/10 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-500/30">
                Best match
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-zinc-50">
                Manipal Hospital, Old Airport Road
              </h3>
              <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 ring-1 ring-zinc-800">
                vf-7821
              </span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">Bengaluru</div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Pill icon={Wallet} value="₹0 (Ayushman OK)" />
              <Pill icon={ArrowRight} value="6.2 km · 34 min" />
              <Pill icon={ShieldCheck} value="Trust 92/100" />
            </div>
            <div className="mt-2.5 rounded-lg border-l-2 border-cyan-500/60 bg-cyan-950/20 px-2.5 py-1.5">
              <div className="mb-0.5 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-cyan-400/80">
                <Phone className="h-3 w-3" />
                Ask the receptionist
              </div>
              <div className="text-[12px] italic leading-relaxed text-zinc-200">
                Call +91 80 2502 4444 — “Cardiac ICU bed available tonight, and
                Ayushman Bharat empanelled?”
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{background: "var(--accent-saffron)"}} />
          Triage one of these
        </div>
        <Suggestions onPick={onPick} />
      </motion.div>
    </div>
  );
}

function EtymologyHover() {
  const [open, setOpen] = useState(false);
  return (
    <button
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      className="group relative inline-flex flex-col items-center cursor-default outline-none"
      aria-label="Sanskrit etymology of Aarogya"
    >
      <span
        className="devanagari leading-none text-[42px] sm:text-[50px]"
        style={{ color: "var(--fg)" }}
        lang="sa"
      >
        आरोग्य
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full mt-1 ticker whitespace-nowrap"
          >
            <span className="devanagari text-zinc-300">अ</span>
            <span className="text-zinc-500">+</span>
            <span className="devanagari text-zinc-300">रोग</span>
            <span className="sep">→</span>
            <span className="v">without disease</span>
            <span className="sep">·</span>
            <span>Sanskrit</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function Stat({
  big,
  label,
  sub,
  tone,
}: {
  big: React.ReactNode;
  label: string;
  sub: string;
  tone: "cyan" | "amber" | "red";
}) {
  const styles = {
    cyan: "border-cyan-800/40 from-cyan-950/30 text-cyan-200",
    amber: "border-amber-800/40 from-amber-950/30 text-amber-200",
    red: "border-red-800/40 from-red-950/30 text-red-200",
  }[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br to-transparent px-3 py-3 ${styles}`}
    >
      <div className="text-[28px] font-semibold leading-none tab-num">
        {big}
      </div>
      <div className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-zinc-300">
        {label}
      </div>
      <div className="text-[10px] text-zinc-500">{sub}</div>
    </div>
  );
}

function Pill({
  icon: Icon,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  tone?: "amber";
}) {
  const colors =
    tone === "amber"
      ? "bg-amber-950/40 text-amber-200 ring-amber-700/40"
      : "bg-zinc-900/70 text-zinc-200 ring-zinc-800/80";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] tab-num ring-1 ${colors}`}
    >
      <Icon className="h-3 w-3 opacity-70" />
      {value}
    </span>
  );
}
