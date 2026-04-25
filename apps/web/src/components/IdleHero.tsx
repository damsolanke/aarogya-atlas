"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import {
  Star,
  ShieldCheck,
  Wallet,
  Phone,
  Sparkles,
  AlertTriangle,
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
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1 text-[10.5px] font-medium uppercase tracking-wider text-emerald-300">
          <span className="dot-pulse" />
          Live in Databricks · 23 traces · 10 of 12 tools used
        </div>
        <h1 className="bg-gradient-to-br from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-[34px]">
          Aarogya Atlas
        </h1>
        <div className="mt-1 text-[11px] tracking-wide text-zinc-500">
          <span lang="sa" className="text-base text-zinc-300">
            आरोग्य
          </span>{" "}
          <span className="text-zinc-500">— Sanskrit</span>{" "}
          <span className="text-zinc-400">
            “the absence of disease, complete wellness”
          </span>
        </div>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-zinc-400">
          Agentic facility intelligence over the Virtue Foundation&apos;s
          10,000-facility India dataset — trust-scored, cost-aware, on-device
          PHI, multilingual.
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

      {/* Sample answer card preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[var(--bg-card)]/70 shadow-2xl shadow-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-gradient-to-r from-emerald-950/20 via-transparent to-violet-950/10 px-3.5 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-500/40">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold tracking-tight text-zinc-100">
              Sample answer
            </div>
            <div className="text-[10px] text-zinc-500">
              Click a query below to run live · this card animates in real time
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400 ring-1 ring-zinc-700">
            preview
          </span>
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
                Dr Prabhakar C Koregol Clinic
              </h3>
              <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 ring-1 ring-zinc-800">
                vf-3263
              </span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">Bengaluru</div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Pill icon={Wallet} value="₹484" />
              <Pill icon={ArrowRight} value="2.7 km · 21 min" />
              <Pill icon={ShieldCheck} value="Trust 65/100" tone="amber" />
              <Pill icon={AlertTriangle} value="Validator: WARN" tone="amber" />
            </div>
            <div className="mt-2.5 rounded-lg border-l-2 border-cyan-500/60 bg-cyan-950/20 px-2.5 py-1.5">
              <div className="mb-0.5 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-cyan-400/80">
                <Phone className="h-3 w-3" />
                Ask the receptionist
              </div>
              <div className="text-[12px] italic leading-relaxed text-zinc-200">
                Call +91 97415 85444 — “Do you do ECG today, and are you
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
          <span className="dot-pulse" />
          Run a real one
        </div>
        <Suggestions onPick={onPick} />
      </motion.div>
    </div>
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
