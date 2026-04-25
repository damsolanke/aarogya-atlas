"use client";

import Link from "next/link";
import {
  Activity,
  ShieldCheck,
  Database,
  Sparkles,
  GitCompare,
  ShieldAlert,
  Network,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";

function Pill({
  icon: Icon,
  label,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "neutral" | "mint" | "cyan" | "purple";
}) {
  const tones: Record<string, string> = {
    neutral: "text-zinc-300 bg-zinc-900/60 border-zinc-800",
    mint: "text-emerald-300 bg-emerald-950/40 border-emerald-900/60",
    cyan: "text-cyan-300 bg-cyan-950/40 border-cyan-900/60",
    purple: "text-violet-300 bg-violet-950/40 border-violet-900/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase",
        tones[tone]
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-zinc-900/60 hover:text-zinc-100"
    >
      <Icon className="h-3 w-3 opacity-70" />
      {children}
    </Link>
  );
}

export default function Header({
  facilityCount,
  loaded,
}: {
  facilityCount: number;
  loaded: boolean;
}) {
  return (
    <header className="relative z-30 border-b border-[var(--border)] bg-[var(--bg)]/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 via-cyan-500/20 to-violet-500/20 ring-1 ring-white/10">
              <Activity className="h-5 w-5 text-emerald-300" strokeWidth={2.2} />
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(94,234,212,0.9)]" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-zinc-50">
              Aarogya Atlas
            </div>
            <div className="text-[11px] text-zinc-500">
              On-device healthcare facility intelligence · India
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badges */}
          <div className="flex items-center gap-1.5">
            <Pill icon={ShieldCheck} label="Zero PHI Egress" tone="mint" />
            <Pill icon={Database} label="FHIR R4" tone="cyan" />
            <Pill icon={Sparkles} label="Hack-Nation 2026" />
          </div>

          {/* Visual divider */}
          <div className="hidden h-5 w-px bg-zinc-800 md:block" />

          {/* Nav links */}
          <nav className="flex items-center gap-0.5 text-[11.5px] font-medium text-zinc-400">
            <NavLink href="/" icon={Activity}>Atlas</NavLink>
            <NavLink href="/compare" icon={GitCompare}>vs ChatGPT</NavLink>
            <NavLink href="/equity" icon={ShieldAlert}>Equity</NavLink>
            <NavLink href="/architecture" icon={Network}>Architecture</NavLink>
            <NavLink href="/eval" icon={CheckCircle2}>Eval</NavLink>
          </nav>

          <div className="hidden h-5 w-px bg-zinc-800 md:block" />

          <div className="hidden items-center gap-1.5 text-[11px] text-zinc-500 md:flex">
            {loaded ? (
              <>
                <span className="dot-pulse" />
                <span className="tab-num text-zinc-300">10,000</span>
                <span>indexed</span>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400/80" />
                <span>connecting…</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
