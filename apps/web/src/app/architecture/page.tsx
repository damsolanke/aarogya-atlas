"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Search,
  FileText,
  Clock,
  Activity,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cloud,
  Cpu,
  Sparkles,
} from "lucide-react";
import Footer from "@/components/Footer";

type Tool = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  local?: boolean;
  databricks?: boolean;
  desc: string;
};

const TOOLS: Tool[] = [
  { name: "geocode", icon: MapPin, desc: "Nominatim → lat/lon" },
  { name: "facility_search", icon: Search, desc: "Postgres + Haversine" },
  { name: "extract_capabilities_from_note", icon: FileText, local: true, desc: "Qwen 32B on Ollama (PHI-safe)" },
  { name: "check_hours", icon: Clock, desc: "FHIR HealthcareService hours" },
  { name: "status_feed", icon: Activity, desc: "Crowd-sourced live updates" },
  { name: "semantic_intake_search", icon: FileText, local: true, desc: "bge-m3 on Ollama (multilingual)" },
  { name: "databricks_vector_search", icon: Cloud, databricks: true, desc: "Mosaic AI VS Delta Sync Index" },
  { name: "estimate_journey", icon: MapPin, desc: "KSRTC bus + auto-rickshaw" },
  { name: "total_out_of_pocket", icon: Wallet, desc: "MGNREGA wage-loss + treatment + transport" },
  { name: "trust_score", icon: ShieldCheck, desc: "7 contradictions + 4 metadata signals + 80% CI" },
  { name: "find_medical_deserts", icon: AlertTriangle, desc: "District-level coverage gaps" },
  { name: "validate_recommendation", icon: CheckCircle2, desc: "PASS / WARN / FAIL with cited evidence" },
];

export default function ArchitecturePage() {
  const [hoverTool, setHoverTool] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-zinc-100">
      <div className="aurora" />

      <header className="relative z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Aarogya Atlas
          </Link>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
            Architecture · 5 planes · 12 tools · critic-verified
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-300" />
          <h1 className="display text-[36px] leading-tight text-zinc-50 sm:text-[42px]">
            How <span className="display-italic" style={{color: "var(--accent-saffron)"}}>Aarogya Atlas</span> thinks
          </h1>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-zinc-400">
          Five planes — UI, supervisor, twelve tools, critic, data. The supervisor
          (GPT-OSS-120B via Groq, OpenAI-compatible function calling) coordinates
          the tools in a streaming loop, and every final answer is then graded by
          a separate critic LLM that issues a 0–100 trust score + structured flags
          before the user sees it. Vision triage routes to Gemini Flash-Lite (cloud)
          or on-device medgemma; PHI tools run on-device; everything else runs in
          Postgres or Databricks. Hover any tool to see what it does.
        </p>

        {/* Animated flow diagram */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 shadow-2xl shadow-black/40">
          <svg viewBox="0 0 980 560" className="w-full" aria-label="Aarogya Atlas architecture">
            <defs>
              <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="strokeGradV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.85" />
              </linearGradient>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Plane 1 — UI */}
            <Plane x={20} y={30} w={200} h={70} title="UI Plane" sub="Next.js 16 · MapLibre" />
            {/* Plane 2 — Supervisor */}
            <Plane x={280} y={30} w={200} h={70} title="Supervisor" sub="GPT-OSS-120B · Groq" accent />
            {/* Plane 3 — Tools */}
            <Plane x={540} y={30} w={200} h={70} title="12 Tools" sub="manual streaming loop" />
            {/* Plane 4 — Critic */}
            <Plane x={800} y={30} w={160} h={70} title="Critic" sub="Trust 0–100 · PASS/WARN/FAIL" criticAccent />
            {/* Plane 5 — Data */}
            <Plane x={20} y={460} w={940} h={70} title="Data Plane" sub="Postgres 17 + pgvector  ·  Databricks (UC + Genie + MLflow + Mosaic VS)  ·  Ollama" />

            {/* Flowing connectors UI → Supervisor → Tools → Critic */}
            <path d="M 220 65 H 280" fill="none" stroke="url(#strokeGrad)" strokeWidth="2.5" className="flow-stroke" />
            <path d="M 480 65 H 540" fill="none" stroke="url(#strokeGrad)" strokeWidth="2.5" className="flow-stroke" />
            <path d="M 740 65 H 800" fill="none" stroke="url(#strokeGrad)" strokeWidth="2.5" className="flow-stroke" />

            {/* Critic feedback arrow back to UI (every answer is verified) */}
            <path
              d="M 880 100 V 130 H 120 V 65"
              fill="none"
              stroke="rgba(94,234,212,0.55)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text x={400} y={123} fill="#5eead4" fontSize="10" fontFamily="ui-sans-serif, system-ui">
              critic verdict streamed back to UI
            </text>

            {/* Connector Supervisor ↓ Data */}
            <path
              d="M 380 100 V 460"
              fill="none"
              stroke="url(#strokeGradV)"
              strokeWidth="2.5"
              strokeDasharray="8 8"
              className="flow-stroke"
            />

            {/* Tool grid (3 cols × 4 rows) */}
            {TOOLS.map((t, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const x = 100 + col * 270;
              const y = 145 + row * 70;
              return (
                <ToolNode
                  key={t.name}
                  x={x}
                  y={y}
                  tool={t}
                  hover={hoverTool === t.name}
                  onEnter={() => setHoverTool(t.name)}
                  onLeave={() => setHoverTool(null)}
                />
              );
            })}
          </svg>

          {/* Hover detail */}
          <div className="mt-3 flex h-10 items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3">
            {hoverTool ? (
              <>
                <div className="font-mono text-[12px] text-cyan-300">{hoverTool}</div>
                <div className="text-[12px] text-zinc-300">
                  {TOOLS.find((t) => t.name === hoverTool)?.desc}
                </div>
                {TOOLS.find((t) => t.name === hoverTool)?.local && (
                  <span className="ml-auto rounded-md border border-cyan-700/60 bg-cyan-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    on-device
                  </span>
                )}
                {TOOLS.find((t) => t.name === hoverTool)?.databricks && (
                  <span className="ml-auto rounded-md border border-orange-700/60 bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
                    databricks
                  </span>
                )}
              </>
            ) : (
              <div className="text-[12px] text-zinc-500">
                Hover a tool to inspect.
              </div>
            )}
          </div>
        </div>

        {/* Plane explanations */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlaneCard
            title="UI Plane"
            icon={Activity}
            tone="cyan"
            items={[
              "Next.js 16 + React 19 + MapLibre + framer-motion",
              "Server-Sent Events stream the trace + final answer",
              "Map shows clusters, heatmap, 3D buildings, ranked DOM pins, OSRM routes, desert overlay",
            ]}
          />
          <PlaneCard
            title="Supervisor"
            icon={Cpu}
            tone="emerald"
            items={[
              "Groq SDK — openai/gpt-oss-120b (free tier, 30 RPM / 1,000 RPD)",
              "OpenAI-compatible function calling, max_iterations=14",
              "Manual streaming loop — no LangGraph, no LangChain",
              "Provider-agnostic loop — swap Groq → Cerebras with one config change",
            ]}
          />
          <PlaneCard
            title="12 Tools"
            icon={Sparkles}
            tone="violet"
            items={[
              "Trust Scorer with 80% bootstrap CI",
              "Validator agent (PASS/WARN/FAIL)",
              "On-device Qwen 2.5 32B + bge-m3 for PHI",
              "Mosaic AI Vector Search for cloud retrieval",
              "Cost ranker: ₹ + travel time + MGNREGA wage-loss",
            ]}
          />
          <PlaneCard
            title="Critic"
            icon={ShieldCheck}
            tone="emerald"
            items={[
              "Mandatory second-pass LLM verification on every supervisor answer",
              "Strict rubric: -25 for unscored facility, -25 for high-stakes without validate, -20 for hallucinated capability, etc.",
              "Returns 0-100 trust score + PASS/WARN/FAIL + structured flags",
              "Streamed as a typed event so the banner appears as soon as it lands",
              "Answers the brief's 'how do you account for messy data' question by surfacing every contradiction the supervisor missed",
            ]}
          />
          <PlaneCard
            title="Data Plane"
            icon={Database}
            tone="amber"
            items={[
              "Postgres 17 + pgvector — local Lakebase analog",
              "Databricks Unity Catalog · Genie · MLflow · Mosaic AI VS",
              "Cloud vision: Gemini Flash-Lite (live demo path)",
              "On-device fallback: Ollama (Qwen 2.5 32B + bge-m3 + medgemma 27B) — hospital-VPC mode",
              "PHI mask UDF on patient_phone column",
            ]}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Plane({
  x,
  y,
  w,
  h,
  title,
  sub,
  accent,
  criticAccent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  accent?: boolean;
  criticAccent?: boolean;
}) {
  const stroke = criticAccent
    ? "rgba(94,234,212,0.85)"
    : accent
    ? "rgba(94,234,212,0.55)"
    : "rgba(63,63,70,0.85)";
  const fill = criticAccent
    ? "rgba(20,184,166,0.18)"
    : accent
    ? "url(#strokeGradV)"
    : "rgba(24,28,38,0.6)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={fill}
        fillOpacity={accent ? 0.12 : 1}
        stroke={stroke}
        strokeWidth={1.4}
        filter={accent ? "url(#softGlow)" : undefined}
      />
      <text
        x={x + 14}
        y={y + 26}
        fill="#f4f5f7"
        fontSize="13"
        fontWeight="600"
        fontFamily="ui-sans-serif, system-ui"
      >
        {title}
      </text>
      <text
        x={x + 14}
        y={y + 46}
        fill="#a8acba"
        fontSize="10.5"
        fontFamily="ui-sans-serif, system-ui"
      >
        {sub}
      </text>
    </g>
  );
}

function ToolNode({
  x,
  y,
  tool,
  hover,
  onEnter,
  onLeave,
}: {
  x: number;
  y: number;
  tool: Tool;
  hover: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const accent = tool.local
    ? "rgba(34,211,238,0.55)"
    : tool.databricks
    ? "rgba(251,146,60,0.55)"
    : "rgba(94,234,212,0.45)";
  const fill = hover
    ? "rgba(34,211,238,0.18)"
    : "rgba(17,20,27,0.85)";
  return (
    <g
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={x - 110}
        y={y - 22}
        width={220}
        height={44}
        rx={9}
        fill={fill}
        stroke={accent}
        strokeWidth={hover ? 1.8 : 1.1}
      />
      <text
        x={x}
        y={y - 2}
        textAnchor="middle"
        fill="#f4f5f7"
        fontSize="11"
        fontWeight="600"
        fontFamily="ui-monospace, monospace"
      >
        {tool.name}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fill="#a8acba"
        fontSize="9.5"
        fontFamily="ui-sans-serif, system-ui"
      >
        {tool.desc.slice(0, 36)}
        {tool.desc.length > 36 ? "…" : ""}
      </text>
      {tool.local && (
        <circle cx={x + 95} cy={y - 12} r={3.5} fill="#22d3ee" />
      )}
      {tool.databricks && (
        <circle cx={x + 95} cy={y - 12} r={3.5} fill="#fb923c" />
      )}
    </g>
  );
}

function PlaneCard({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "cyan" | "emerald" | "violet" | "amber";
  items: string[];
}) {
  const styles = {
    cyan: "border-cyan-800/40 bg-cyan-950/15",
    emerald: "border-emerald-800/40 bg-emerald-950/15",
    violet: "border-violet-800/40 bg-violet-950/15",
    amber: "border-amber-800/40 bg-amber-950/15",
  }[tone];
  const iconColor = {
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
    violet: "text-violet-300",
    amber: "text-amber-300",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border ${styles} px-5 py-4`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-300">
          {title}
        </span>
      </div>
      <ul className="space-y-1 text-[12.5px] leading-relaxed text-zinc-300">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-zinc-600">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
