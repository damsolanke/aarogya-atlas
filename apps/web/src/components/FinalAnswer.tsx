"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronDown,
  Star,
  MapPin,
  LightbulbIcon,
  Wallet,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Info,
  Phone,
  Copy,
  ExternalLink,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/cn";

/* ----------------------------------------------------------------------------
   Public component
---------------------------------------------------------------------------- */

export default function FinalAnswer({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  const parsed = useMemo(() => (streaming ? null : parseAnswer(text)), [text, streaming]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[var(--bg-card)]/70 shadow-2xl shadow-black/30 backdrop-blur-sm"
    >
      <Header streaming={streaming} stats={parsed?.summary} />

      <div className="space-y-2.5 p-3.5">
        {streaming || !parsed ? (
          <StreamingBody text={text} />
        ) : (
          <>
            {parsed.sections.map((s, i) => (
              <SectionRenderer key={i} section={s} />
            ))}
            {parsed.sections.length > 0 && (
              <ActionBar text={text} primaryFacility={parsed.primaryFacility} />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------------------
   Header — model row + summary stat strip
---------------------------------------------------------------------------- */

function Header({
  streaming,
  stats,
}: {
  streaming: boolean;
  stats?: SummaryStats;
}) {
  return (
    <div className="border-b border-zinc-800/80 bg-gradient-to-r from-emerald-950/20 via-transparent to-violet-950/10 px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold tracking-tight text-zinc-100">
            Aarogya Atlas
          </div>
          <div className="text-[10px] text-zinc-500">
            Claude Opus 4.7 · adaptive thinking
          </div>
        </div>
        {streaming && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-cyan-950/40 px-2 py-0.5 text-[10px] font-medium text-cyan-300 ring-1 ring-cyan-700/40">
            <span className="dot-pulse" />
            streaming
          </span>
        )}
        {!streaming && stats && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-700/40">
            <CheckCircle2 className="h-3 w-3" />
            answer
          </span>
        )}
      </div>

      {stats && (stats.cost || stats.distance || stats.trust !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stats.cost && (
            <Stat icon={Wallet} label="Total" value={stats.cost} tone="emerald" />
          )}
          {stats.distance && (
            <Stat icon={Navigation} label="Distance" value={stats.distance} tone="cyan" />
          )}
          {stats.trust !== undefined && (
            <Stat
              icon={ShieldCheck}
              label="Trust"
              value={`${stats.trust}/100`}
              tone={stats.trust >= 75 ? "emerald" : stats.trust >= 50 ? "amber" : "red"}
            />
          )}
          {stats.trustFlagCount > 0 && (
            <Stat
              icon={AlertTriangle}
              label="Flags"
              value={String(stats.trustFlagCount)}
              tone="amber"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "amber" | "red" | "zinc";
}) {
  const styles = {
    emerald: "border-emerald-700/40 bg-emerald-950/40 text-emerald-200",
    cyan: "border-cyan-700/40 bg-cyan-950/40 text-cyan-200",
    amber: "border-amber-700/40 bg-amber-950/40 text-amber-200",
    red: "border-red-700/40 bg-red-950/40 text-red-200",
    zinc: "border-zinc-700/40 bg-zinc-900/40 text-zinc-200",
  }[tone];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] tab-num",
        styles
      )}
    >
      <Icon className="h-3 w-3 opacity-80" />
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Streaming body — markdown with typing caret
---------------------------------------------------------------------------- */

function StreamingBody({ text }: { text: string }) {
  return (
    <div className="prose-aarogya">
      {text ? (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          <span className="caret" />
        </>
      ) : (
        <span className="caret text-zinc-500">Composing answer</span>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Sections
---------------------------------------------------------------------------- */

function SectionRenderer({ section }: { section: ParsedSection }) {
  if (section.kind === "recommendation") return <RecommendationCard rec={section} />;
  if (section.kind === "trust") return <TrustFlagsBlock section={section} />;
  if (section.kind === "data_gap") return <DataGapBlock section={section} />;
  if (section.kind === "free") return <FreeBlock section={section} />;
  return null;
}

const TIER_META = {
  best: {
    label: "Best match",
    icon: Star,
    accent: "from-emerald-500/80 via-emerald-500/40 to-transparent",
    bg: "bg-emerald-950/15",
    border: "border-emerald-800/40",
    chip: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30",
  },
  closest: {
    label: "Closest",
    icon: MapPin,
    accent: "from-cyan-500/80 via-cyan-500/40 to-transparent",
    bg: "bg-cyan-950/10",
    border: "border-cyan-800/40",
    chip: "bg-cyan-500/10 text-cyan-200 ring-cyan-500/30",
  },
  backup: {
    label: "Backup",
    icon: LightbulbIcon,
    accent: "from-amber-500/80 via-amber-500/40 to-transparent",
    bg: "bg-amber-950/10",
    border: "border-amber-800/40",
    chip: "bg-amber-500/10 text-amber-200 ring-amber-500/30",
  },
} as const;

function RecommendationCard({ rec }: { rec: RecommendationSection }) {
  const meta = TIER_META[rec.tier];
  const Icon = meta.icon;
  const [showDetails, setShowDetails] = useState(rec.tier === "best");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border",
        meta.border,
        meta.bg
      )}
    >
      {/* accent stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b",
          meta.accent
        )}
      />

      <div className="px-3.5 py-2.5">
        {/* tier label */}
        <div className="mb-1 flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-zinc-300" />
          <span
            className={cn(
              "rounded px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider ring-1",
              meta.chip
            )}
          >
            {meta.label}
          </span>
          {rec.title.includes("caveat") && (
            <span className="text-[10px] italic text-zinc-500">
              with caveats
            </span>
          )}
        </div>

        {/* facility name + id chip */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[14.5px] font-semibold text-zinc-50">
            {rec.facilityName || "Facility"}
          </h3>
          {rec.facilityId && (
            <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 ring-1 ring-zinc-800">
              {rec.facilityId}
            </span>
          )}
        </div>
        {rec.location && (
          <div className="mt-0.5 text-[11.5px] text-zinc-500">
            {rec.location}
          </div>
        )}

        {/* metric pills inline */}
        {rec.metrics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {rec.metrics.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-900/70 px-1.5 py-0.5 text-[11px] text-zinc-300 ring-1 ring-zinc-800/80 tab-num"
              >
                <span className="text-zinc-500">{m.key}</span>
                <span className="font-medium text-zinc-100">{m.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* details (collapsible for non-best tiers) */}
        <AnimatePresence initial={false}>
          {showDetails && rec.details.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 border-t border-zinc-800/60 pt-2">
                {rec.details.map((d, i) => (
                  <DetailRow key={i} label={d.key} value={d.value} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* expand toggle for non-best */}
        {rec.tier !== "best" && rec.details.length > 0 && (
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-zinc-500 hover:text-zinc-300"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showDetails && "rotate-180"
              )}
            />
            {showDetails ? "Hide details" : "Show details"}
          </button>
        )}

        {/* call-to-action quote */}
        {rec.cta && (
          <div className="mt-2.5 rounded-lg border-l-2 border-cyan-500/60 bg-cyan-950/20 px-2.5 py-1.5">
            <div className="mb-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-cyan-400/80">
              Ask the receptionist
            </div>
            <div className="text-[12px] italic leading-relaxed text-zinc-200">
              {rec.cta}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const Icon = iconForLabel(label);
  return (
    <div className="flex items-baseline gap-2 text-[12.5px] leading-snug">
      <Icon className="h-3 w-3 shrink-0 translate-y-[2px] text-zinc-500" />
      <span className="shrink-0 text-zinc-500">{label}:</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function iconForLabel(label: string) {
  const l = label.toLowerCase();
  if (l.includes("hour")) return Clock;
  if (l.includes("payer") || l.includes("cost") || l.includes("total"))
    return Wallet;
  if (l.includes("trust")) return ShieldCheck;
  if (l.includes("validator")) return CheckCircle2;
  if (l.includes("distance") || l.includes("km")) return Navigation;
  return Info;
}

/* ----------------------------------------------------------------------------
   Trust flags — collapsed by default
---------------------------------------------------------------------------- */

function TrustFlagsBlock({ section }: { section: TrustSection }) {
  const [open, setOpen] = useState(false);
  if (section.flags.length === 0 && !section.text) return null;

  const severityColor = (sev: string) =>
    sev === "high" || sev === "High"
      ? "bg-red-500/15 text-red-300 ring-red-500/30"
      : sev === "medium" || sev === "Medium"
      ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
      : "bg-zinc-700/30 text-zinc-300 ring-zinc-600/40";

  return (
    <div className="overflow-hidden rounded-xl border border-amber-900/40 bg-amber-950/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors hover:bg-amber-950/20"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[12.5px] font-medium text-amber-100">
          {section.flags.length > 0
            ? `${section.flags.length} trust flag${
                section.flags.length === 1 ? "" : "s"
              }`
            : "Trust notes"}
        </span>
        {section.flags.length > 0 && (
          <div className="ml-1 flex gap-1">
            {section.flags.slice(0, 4).map((f, i) => (
              <span
                key={i}
                className={cn(
                  "rounded px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider ring-1",
                  severityColor(f.severity)
                )}
              >
                {f.severity}
              </span>
            ))}
          </div>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-amber-300/70 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 border-t border-amber-900/40 px-3.5 py-2.5">
              {section.flags.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px]">
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ring-1",
                      severityColor(f.severity)
                    )}
                  >
                    {f.severity}
                  </span>
                  <span className="leading-relaxed text-zinc-300">{f.text}</span>
                </div>
              ))}
              {section.text && section.flags.length === 0 && (
                <div className="prose-aarogya text-[12.5px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {section.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Honest data gap
---------------------------------------------------------------------------- */

function DataGapBlock({ section }: { section: FreeSection }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3.5 py-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Info className="h-3 w-3 text-zinc-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {section.title || "Honest data gap"}
        </span>
      </div>
      <div className="prose-aarogya text-[12.5px] text-zinc-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function FreeBlock({ section }: { section: FreeSection }) {
  return (
    <div className="prose-aarogya px-1 text-[13px]">
      {section.title && (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {section.title}
        </div>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.text}</ReactMarkdown>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Action bar
---------------------------------------------------------------------------- */

function ActionBar({
  text,
  primaryFacility,
}: {
  text: string;
  primaryFacility?: { name: string; location?: string };
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const mapsUrl = primaryFacility
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        primaryFacility.name +
          (primaryFacility.location ? " " + primaryFacility.location : "")
      )}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-800/60 pt-2">
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-md bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-300 ring-1 ring-zinc-800 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        {copied ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-300 ring-1 ring-zinc-800 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Maps
        </a>
      )}
      <a
        href="tel:104"
        className="inline-flex items-center gap-1 rounded-md bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-700/40 transition-colors hover:bg-emerald-900/40"
      >
        <Phone className="h-3 w-3" />
        Health helpline (104)
      </a>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Markdown parser → structured sections
---------------------------------------------------------------------------- */

type SummaryStats = {
  cost?: string;
  distance?: string;
  trust?: number;
  trustFlagCount: number;
};

type RecommendationSection = {
  kind: "recommendation";
  tier: "best" | "closest" | "backup";
  title: string;
  facilityName?: string;
  facilityId?: string;
  location?: string;
  metrics: { key: string; value: string }[];
  details: { key: string; value: string }[];
  cta?: string;
};

type TrustSection = {
  kind: "trust";
  flags: { severity: string; text: string }[];
  text?: string;
};

type FreeSection = {
  kind: "data_gap" | "free";
  title?: string;
  text: string;
};

type ParsedSection = RecommendationSection | TrustSection | FreeSection;

type ParsedAnswer = {
  sections: ParsedSection[];
  summary: SummaryStats;
  primaryFacility?: { name: string; location?: string };
};

function parseAnswer(text: string): ParsedAnswer {
  // Split on h2 headings (## ...). Keep heading + body.
  const blocks = text.split(/^##\s+/gm).filter((b) => b.trim().length > 0);

  const sections: ParsedSection[] = [];
  let summary: SummaryStats = { trustFlagCount: 0 };
  let primary: { name: string; location?: string } | undefined;

  // First block may be intro text without a heading
  const first = blocks[0];
  if (first && !looksLikeHeader(first)) {
    const intro = first.trim();
    if (intro) sections.push({ kind: "free", text: intro });
    blocks.shift();
  }

  for (const raw of blocks) {
    const lines = raw.split("\n");
    const title = (lines.shift() || "").trim();
    const body = lines.join("\n").trim();
    const titleLower = title.toLowerCase();

    if (
      /best\s*(match|pick|choice)/i.test(title) ||
      /^⭐/.test(title) ||
      titleLower.startsWith("best")
    ) {
      const rec = parseRecommendation("best", title, body);
      sections.push(rec);
      if (!primary && rec.facilityName) {
        primary = { name: rec.facilityName, location: rec.location };
      }
      // Promote metrics into summary
      promoteToSummary(rec, summary);
      continue;
    }
    if (
      /closest/i.test(title) ||
      /payer/i.test(title) ||
      /^📍/.test(title)
    ) {
      sections.push(parseRecommendation("closest", title, body));
      continue;
    }
    if (/backup/i.test(title) || /^💡/.test(title)) {
      sections.push(parseRecommendation("backup", title, body));
      continue;
    }
    if (/trust\s*flag/i.test(title) || /^⚠/.test(title)) {
      const flags = parseTrustFlags(body);
      summary.trustFlagCount += flags.length;
      sections.push({ kind: "trust", flags, text: body });
      continue;
    }
    if (/honest|data\s*gap|caveat|limitation/i.test(title) || /^🎯/.test(title)) {
      sections.push({
        kind: "data_gap",
        title: stripEmoji(title),
        text: body,
      });
      continue;
    }
    sections.push({ kind: "free", title: stripEmoji(title), text: body });
  }

  return { sections, summary, primaryFacility: primary };
}

function looksLikeHeader(s: string): boolean {
  // Headings start with what would have been "## ..." — first non-empty line
  // is a short title-y line.
  const first = s.split("\n").find((l) => l.trim().length > 0) || "";
  return first.length < 80 && /^[\p{Emoji_Presentation}\p{So}\w]/u.test(first);
}

function parseRecommendation(
  tier: "best" | "closest" | "backup",
  title: string,
  body: string
): RecommendationSection {
  // Find the facility line: first line with **bold** OR with `vf-XXX`. Skip
  // pure intro sentences ("If none confirm…", "The closest match is…").
  const rawLines = body.split("\n");
  let facilityName: string | undefined;
  let facilityId: string | undefined;
  let location: string | undefined;
  let consumedIdx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i].trim();
    if (!l) continue;
    const hasId = /`?vf-[\w-]+`?/i.test(l);
    const hasBold = /\*\*[^*]+\*\*/.test(l);
    const isBullet = /^\s*[-*]\s/.test(l);
    if (!hasId && !hasBold) continue;
    if (isBullet) continue;
    consumedIdx = i;
    const idMatch = l.match(/`?(vf-[\w-]+)`?/i);
    if (idMatch) facilityId = idMatch[1];
    // Pull bold name first if present, else fall back to dash split
    const boldMatch = l.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) {
      facilityName = boldMatch[1].trim();
      // Location = everything after the bold name + id, ignoring the id paren
      const after = l
        .slice(l.indexOf(boldMatch[0]) + boldMatch[0].length)
        .replace(/\(\s*`?vf-[\w-]+`?\s*\)/i, "")
        .replace(/^[\s—–-]+/, "")
        .trim();
      if (after) location = stripTrailingPunct(cleanInlineMd(after));
    } else {
      const cleaned = l.replace(/[*`]/g, "").replace(/\(\s*vf-[\w-]+\s*\)/i, "");
      const dashIdx = cleaned.search(/—|–/);
      if (dashIdx > 0) {
        facilityName = cleaned.slice(0, dashIdx).trim();
        const tail = cleaned.slice(dashIdx + 1).trim();
        if (tail) location = stripTrailingPunct(tail);
      } else {
        facilityName = cleaned.trim();
      }
    }
    break;
  }

  // Build line list excluding the facility-line we consumed
  const lines = rawLines.map((l, i) => (i === consumedIdx ? "" : l));

  // Bullets: - **key:** value  OR  * **key:** value
  const bulletRegex = /^\s*[-*]\s+\*\*([^:*]+):\*\*\s*(.+)$/;
  const details: { key: string; value: string }[] = [];
  const remaining: string[] = [];
  for (const l of lines) {
    const m = l.match(bulletRegex);
    if (m) {
      details.push({ key: m[1].trim(), value: cleanInlineMd(m[2].trim()) });
    } else if (l.trim().length > 0) {
      remaining.push(l);
    }
  }

  // CTA: italic single line containing 'call', 'ask', 'pmjay', 'ayushman'
  let cta: string | undefined;
  const ctaIdx = remaining.findIndex((l) => /^_.*_$|^\*[^*].*[^*]\*$/.test(l.trim()));
  if (ctaIdx >= 0) {
    cta = remaining[ctaIdx].trim().replace(/^[_*]+|[_*]+$/g, "");
    remaining.splice(ctaIdx, 1);
  } else {
    const callLine = remaining.find((l) =>
      /(\bcall\b|\bask\b|pmjay|ayushman|helpline)/i.test(l)
    );
    if (callLine && callLine.trim().startsWith("**")) {
      cta = callLine.trim().replace(/^[*]+|[*]+$/g, "");
    }
  }

  // Build metric pills from details we recognize as headline numbers
  const metrics: { key: string; value: string }[] = [];
  const detailsClean: { key: string; value: string }[] = [];
  for (const d of details) {
    const k = d.key.toLowerCase();
    if (/^total/.test(k) || /^cost/.test(k)) {
      metrics.push({ key: "₹", value: extractNumberOrFirst(d.value, "₹") });
      detailsClean.push(d);
    } else if (/distance|km/.test(k)) {
      metrics.push({ key: "•", value: extractNumberOrFirst(d.value, "km") });
      detailsClean.push(d);
    } else if (/trust\s*score/.test(k)) {
      metrics.push({ key: "Trust", value: extractNumberOrFirst(d.value, "/100") });
      detailsClean.push(d);
    } else {
      detailsClean.push(d);
    }
  }
  // Distance also often comes as a free line "8.5 km south of Yeshwantpur"
  if (!metrics.find((m) => m.key === "•")) {
    for (const d of detailsClean) {
      const m = d.value.match(/(\d+(?:\.\d+)?)\s*km/i);
      if (m) {
        metrics.push({ key: "•", value: `${m[1]} km` });
        break;
      }
    }
  }

  // If no bullet details but we have remaining narrative text, try to detect
  // the model's inline " · " separated metric format
  // ("2.7 km · ₹1,084 · hours unknown · Trust 65/100 · narrative…").
  if (detailsClean.length === 0 && remaining.length > 0) {
    const narrative = remaining
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (narrative) {
      const parts = narrative.split(/\s+·\s+/);
      if (parts.length >= 2) {
        for (const p of parts) {
          const trimmed = cleanInlineMd(p.trim());
          if (!trimmed) continue;
          const km = trimmed.match(/^(\d+(?:\.\d+)?\s*km\b.*)$/i);
          const rupee = trimmed.match(/^₹/);
          const trust = trimmed.match(/^trust\s+(\d{1,3})/i);
          const hours = trimmed.match(/^hours?\b/i);
          const payer = trimmed.match(/^payer\b/i);
          if (km) {
            metrics.push({ key: "•", value: km[1] });
          } else if (rupee) {
            metrics.push({ key: "₹", value: trimmed });
          } else if (trust) {
            metrics.push({ key: "Trust", value: `${trust[1]}/100` });
          } else if (hours) {
            detailsClean.push({ key: "Hours", value: trimmed.replace(/^hours?\s*/i, "") });
          } else if (payer) {
            detailsClean.push({ key: "Payer", value: trimmed.replace(/^payer\s*/i, "") });
          } else {
            detailsClean.push({ key: "Note", value: trimmed });
          }
        }
      } else {
        detailsClean.push({ key: "Note", value: cleanInlineMd(narrative) });
      }
    }
  }
  // For recommendations without an extracted facility name, build one from
  // the tier title (e.g. "Backup plan").
  if (!facilityName) {
    facilityName = stripEmoji(title);
  }

  return {
    kind: "recommendation",
    tier,
    title: stripEmoji(title),
    facilityName,
    facilityId,
    location,
    metrics,
    details: detailsClean,
    cta,
  };
}

function parseTrustFlags(body: string): { severity: string; text: string }[] {
  const out: { severity: string; text: string }[] = [];
  const bulletRegex = /^\s*[-*]\s+(.+)$/;
  for (const l of body.split("\n")) {
    const m = l.match(bulletRegex);
    if (!m) continue;
    const inner = m[1].trim();
    // Try: **<severity-word>** — text
    const sevMatch = inner.match(/^\*\*([^*]+)\*\*\s*[—–:-]\s*(.+)$/);
    if (sevMatch) {
      const word = sevMatch[1].trim().split(/\s+/)[0].toLowerCase();
      const sev =
        /^(high|severe|critical)$/.test(word)
          ? "high"
          : /^(med|medium|moderate)$/.test(word)
          ? "medium"
          : /^(low|minor|info|note)$/.test(word)
          ? "low"
          : sevMatch[1].trim().split(/\s+/)[0];
      out.push({ severity: sev, text: cleanInlineMd(sevMatch[2].trim()) });
      continue;
    }
    // Fallback: try to detect severity inline ("(high)" / "high severity:")
    const looseSev = inner.match(/\b(high|medium|moderate|low|severe)\b/i);
    const sev = looseSev ? looseSev[1].toLowerCase() : "info";
    out.push({ severity: sev, text: cleanInlineMd(inner) });
  }
  return out;
}

function promoteToSummary(rec: RecommendationSection, sum: SummaryStats) {
  for (const m of rec.metrics) {
    if (m.key === "₹" && !sum.cost) sum.cost = m.value;
    if (m.key === "•" && !sum.distance) sum.distance = m.value;
    if (m.key === "Trust" && sum.trust === undefined) {
      const n = parseInt(m.value);
      if (!Number.isNaN(n)) sum.trust = n;
    }
  }
}

function stripEmoji(s: string): string {
  return s
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}]+\s*/u, "")
    .trim();
}

function stripTrailingPunct(s: string): string {
  return s.replace(/[\s,;:.]+$/, "");
}

function cleanInlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

function extractNumberOrFirst(s: string, hint: string): string {
  // Try to pull out the headline number with hint unit
  if (hint === "₹") {
    const m = s.match(/₹\s*[\d,]+/);
    if (m) return m[0].replace(/\s+/g, "");
  }
  if (hint === "km") {
    const m = s.match(/(\d+(?:\.\d+)?)\s*km/i);
    if (m) return `${m[1]} km`;
  }
  if (hint === "/100") {
    const m = s.match(/\b(\d{1,3})\b/);
    if (m) return m[1];
  }
  return s.length > 18 ? s.slice(0, 16) + "…" : s;
}
