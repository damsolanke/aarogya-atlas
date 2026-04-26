"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Camera,
  GitCompare,
  ShieldAlert,
  Network,
  CheckCircle2,
  Activity,
  Stethoscope,
  Heart,
  Droplet,
  Baby,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Action = {
  label: string;
  hint: string;
  hotkey?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  group: "navigate" | "query" | "feature";
  run: (router: ReturnType<typeof useRouter>) => void;
};

const ACTIONS: Action[] = [
  { label: "Atlas", hint: "Home — agent + map", hotkey: "G  H",
    icon: Activity, group: "navigate",
    run: (r) => r.push("/") },
  { label: "vs ChatGPT / Maps", hint: "Comparison page · 14 / 0 / 0", hotkey: "G  C",
    icon: GitCompare, group: "navigate",
    run: (r) => r.push("/compare") },
  { label: "Equity audit", hint: "Disparate impact + counterfactual planner",
    hotkey: "G  Q", icon: ShieldAlert, group: "navigate",
    run: (r) => r.push("/equity") },
  { label: "Architecture", hint: "12 tools, 4 planes",
    hotkey: "G  A", icon: Network, group: "navigate",
    run: (r) => r.push("/architecture") },
  { label: "Eval", hint: "Auditable evaluation results",
    hotkey: "G  E", icon: CheckCircle2, group: "navigate",
    run: (r) => r.push("/eval") },

  { label: "Triage a photo on-device", hint: "medgemma 27B · ~4 sec",
    icon: Camera, group: "feature",
    run: () => {
      // Trigger the camera button click on the home page if present.
      const btn = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      if (btn) btn.click();
    } },

  { label: "Find an ECG within 15 km", hint: "Yeshwantpur, Bengaluru · Ayushman",
    icon: Heart, group: "query",
    run: () => fillAndSend("I need an ECG within 15 km of Yeshwantpur, Bengaluru. Open today, accepts Ayushman Bharat.") },
  { label: "Pediatric ICU near Mysuru", hint: "tonight",
    icon: Baby, group: "query",
    run: () => fillAndSend("Pediatric ICU near Mysuru, tonight.") },
  { label: "Dialysis near Patna", hint: "Ayushman Bharat empanelled",
    icon: Droplet, group: "query",
    run: () => fillAndSend("Dialysis centre within 10 km of Patna, Ayushman Bharat empanelled.") },
  { label: "Cardiology consult, Hubli", hint: "cash payment, today",
    icon: Stethoscope, group: "query",
    run: () => fillAndSend("Find a cardiology consultation near Hubli, cash payment, today.") },
];

function fillAndSend(q: string) {
  const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
  if (!ta) return;
  // React-controlled input — set via native setter then dispatch
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(ta, q);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  // Submit the form
  setTimeout(() => {
    const form = ta.closest("form");
    form?.requestSubmit();
  }, 80);
}

export default function CmdK() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = q
    ? ACTIONS.filter((a) =>
        (a.label + " " + a.hint).toLowerCase().includes(q.toLowerCase())
      )
    : ACTIONS;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[12%] z-50 w-[min(560px,95vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-zinc-800 bg-[var(--bg-card)] shadow-2xl shadow-black/60">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-3">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type a query, page, or feature…"
              className="flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tab-num text-zinc-400">
              esc
            </kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto py-1.5">
            {(["query", "feature", "navigate"] as const).map((group) => {
              const items = filtered.filter((a) => a.group === group);
              if (!items.length) return null;
              const label = group === "query" ? "Run a query" : group === "feature" ? "Features" : "Go to";
              return (
                <div key={group}>
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {label}
                  </div>
                  {items.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setOpen(false);
                        setTimeout(() => a.run(router), 50);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-900"
                      )}
                    >
                      <a.icon className="h-3.5 w-3.5" style={{color: "var(--accent-saffron)"}} />
                      <div className="flex-1 leading-tight">
                        <div className="text-[13px] text-zinc-100">{a.label}</div>
                        <div className="text-[11px] text-zinc-500">{a.hint}</div>
                      </div>
                      {a.hotkey && (
                        <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tab-num text-zinc-400">
                          {a.hotkey}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="ticker px-3 py-6 text-center">
                no results · <span className="v">ESC</span> to close
              </div>
            )}
          </div>
          <div className="ticker flex items-center justify-between border-t border-zinc-800 px-3 py-1.5 text-[10px]">
            <span>↑↓ navigate · ↵ select · ESC close</span>
            <span><kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-px text-[9px]">⌘ K</kbd> toggle</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
