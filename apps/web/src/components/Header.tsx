"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { fetchHealth } from "@/lib/api";

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
      title={typeof children === "string" ? children : undefined}
    >
      <Icon className="h-3.5 w-3.5 opacity-80" />
      <span className="hidden sm:inline">{children}</span>
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
            <div className="flex h-9 w-9 items-center justify-center rounded-md ring-1 brand-glow" style={{background: "rgba(232,146,61,0.10)", borderColor: "rgba(232,146,61,0.30)"}}>
              <Activity className="h-5 w-5" strokeWidth={2.2} style={{color: "var(--accent-saffron)"}} />
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{background: "var(--accent-saffron)", boxShadow: "0 0 8px rgba(232,146,61,0.9)"}} />
          </div>
          <div className="leading-tight">
            <div className="display text-[18px] tracking-tight text-zinc-50">
              <span>Aarogya </span>
              <span className="display-italic" style={{color: "var(--accent-saffron)"}}>Atlas</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              <span className="devanagari">आरोग्य</span> · agentic facility triage · India
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badges — hidden on mobile to keep header on one line */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <Pill icon={ShieldCheck} label="Zero PHI Egress" tone="mint" />
            <Pill icon={Database} label="FHIR R4" tone="cyan" />
            <Pill icon={Sparkles} label="Hack-Nation 2026" />
          </div>

          <div className="hidden h-5 w-px bg-zinc-800 lg:block" />

          {/* Nav links — collapse to icon-only on small screens */}
          <nav className="flex items-center gap-0.5 text-[11.5px] font-medium text-zinc-400">
            <NavLink href="/" icon={Activity}>Atlas</NavLink>
            <NavLink href="/compare" icon={GitCompare}>vs ChatGPT</NavLink>
            <NavLink href="/equity" icon={ShieldAlert}>Equity</NavLink>
            <NavLink href="/architecture" icon={Network}>Arch</NavLink>
            <NavLink href="/eval" icon={CheckCircle2}>Eval</NavLink>
          </nav>

          <div className="hidden h-5 w-px bg-zinc-800 md:block" />

          <LiveOps loaded={loaded} />
        </div>
      </div>
    </header>
  );
}

function LiveOps({ loaded }: { loaded: boolean }) {
  const [health, setHealth] = useState<{
    facilities?: number;
    cacheHitRate?: number;
    cacheSize?: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const h = await fetchHealth();
      if (cancelled || !h) return;
      setHealth({
        facilities: h.facilities,
        cacheHitRate: h.tool_cache?.hit_rate,
        cacheSize: h.tool_cache?.size,
      });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="hidden items-center gap-2 text-[11px] text-zinc-500 md:flex">
      {loaded && health?.facilities ? (
        <>
          <span className="dot-pulse" />
          <span className="tab-num text-zinc-300">
            {health.facilities.toLocaleString()}
          </span>
          <span>indexed</span>
          {(health.cacheSize ?? 0) > 0 && (
            <span className="ml-1 text-zinc-600">
              · cache {health.cacheSize}
              {health.cacheHitRate !== undefined &&
                health.cacheHitRate > 0 && (
                  <span className="ml-0.5 tab-num text-emerald-400">
                    {" "}
                    {Math.round(health.cacheHitRate * 100)}% hit
                  </span>
                )}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400/80" />
          <span>connecting…</span>
        </>
      )}
    </div>
  );
}
