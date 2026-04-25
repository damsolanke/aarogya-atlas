"use client";

import { Stethoscope, Activity, Hospital, Pill } from "lucide-react";
import { cn } from "@/lib/cn";

export type Suggestion = {
  prompt: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "cyan" | "mint" | "purple" | "amber";
};

export const SUGGESTIONS: Suggestion[] = [
  {
    prompt:
      "I need an ECG within 15 km of Yeshwantpur, Bengaluru. Open today, accepts Ayushman Bharat.",
    label: "ECG, today, Ayushman Bharat",
    sublabel: "Yeshwantpur, Bengaluru",
    icon: Activity,
    tone: "cyan",
  },
  {
    prompt:
      "मेरी मां के लिए डायलिसिस चाहिए, बेंगलुरु के पास, आयुष्मान भारत स्वीकार करता हो।",
    label: "डायलिसिस — मेरी मां के लिए",
    sublabel: "बेंगलुरु · आयुष्मान भारत",
    icon: Hospital,
    tone: "mint",
  },
  {
    prompt: "Cardiology consult near Hubli today — cash payment is fine.",
    label: "Cardiology consult, cash",
    sublabel: "Hubli, today",
    icon: Stethoscope,
    tone: "purple",
  },
  {
    prompt: "Pediatric ICU available in Mysuru tonight?",
    label: "Pediatric ICU, tonight",
    sublabel: "Mysuru",
    icon: Pill,
    tone: "amber",
  },
];

const TONES: Record<Suggestion["tone"], { ring: string; icon: string; glow: string }> = {
  cyan:   { ring: "hover:ring-cyan-500/40",   icon: "text-cyan-300",   glow: "from-cyan-500/10" },
  mint:   { ring: "hover:ring-emerald-500/40", icon: "text-emerald-300", glow: "from-emerald-500/10" },
  purple: { ring: "hover:ring-violet-500/40", icon: "text-violet-300", glow: "from-violet-500/10" },
  amber:  { ring: "hover:ring-amber-500/40",  icon: "text-amber-300",  glow: "from-amber-500/10" },
};

export default function Suggestions({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => {
        const Icon = s.icon;
        const tone = TONES[s.tone];
        return (
          <button
            key={s.prompt}
            onClick={() => onPick(s.prompt)}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/60 p-3 text-left transition-all duration-200",
              "hover:border-zinc-700 hover:bg-[var(--bg-card)] hover:shadow-lg hover:shadow-black/40",
              "ring-1 ring-transparent",
              tone.ring
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
                tone.glow
              )}
            />
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900/80 ring-1 ring-zinc-800">
                <Icon className={cn("h-4 w-4", tone.icon)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-zinc-100">
                  {s.label}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {s.sublabel}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
