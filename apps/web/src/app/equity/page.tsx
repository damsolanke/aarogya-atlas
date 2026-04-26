"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ShieldAlert, Globe } from "lucide-react";
import { API_URL, fetchCounterfactual, type Counterfactual } from "@/lib/api";
import Footer from "@/components/Footer";

type StateRow = {
  state: string;
  facilities: number;
  specialties: Record<
    string,
    { count: number; pct: number }
  >;
};

type EquityData = {
  states: StateRow[];
  disparate_impact: Record<
    string,
    { best_pct: number; worst_pct: number; ratio: number | null }
  >;
};

const SPECIALTIES = [
  { key: "dialysis", label: "Dialysis", tone: "cyan" },
  { key: "oncology", label: "Oncology", tone: "violet" },
  { key: "trauma", label: "Trauma", tone: "amber" },
  { key: "icu", label: "ICU", tone: "red" },
  { key: "cardiac", label: "Cardiac", tone: "emerald" },
  { key: "neonatal", label: "Neonatal", tone: "pink" },
] as const;

export default function EquityPage() {
  const [data, setData] = useState<EquityData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/equity`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-zinc-100">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Aarogya Atlas
          </Link>
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
            Equity audit · 25 states · 10,000 facilities
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-300" />
          <h1 className="bg-gradient-to-br from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Where coverage isn&apos;t equal
          </h1>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-zinc-400">
          A recommender that doesn&apos;t name its own bias <em>creates</em>{" "}
          one. Aarogya Atlas runs over the Virtue Foundation&apos;s
          10,000-facility India dataset, which itself reflects historical
          investment patterns. Below: where every recommendation we surface
          comes from, and how unevenly capacity is distributed across states
          and specialties.
        </p>

        {err && (
          <div className="mt-6 rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-[13px] text-amber-200">
            Unable to fetch equity data: {err}
          </div>
        )}

        {data && (
          <>
            {/* Disparate impact summary */}
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Disparate impact ratio (best state ÷ worst state)
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SPECIALTIES.map((s) => {
                  const di = data.disparate_impact[s.key];
                  if (!di) return null;
                  const tone =
                    di.ratio && di.ratio >= 5
                      ? "border-red-700/50 bg-red-950/30 text-red-200"
                      : di.ratio && di.ratio >= 3
                      ? "border-amber-700/50 bg-amber-950/30 text-amber-200"
                      : "border-emerald-700/50 bg-emerald-950/30 text-emerald-200";
                  return (
                    <div
                      key={s.key}
                      className={`rounded-xl border p-4 ${tone}`}
                    >
                      <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-80">
                        {s.label}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="tab-num text-3xl font-semibold">
                          {di.ratio?.toFixed(1)}×
                        </span>
                        <span className="text-[11px] opacity-80">
                          gap
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] opacity-80">
                        {di.best_pct}% best · {di.worst_pct}% worst
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Coverage table by state */}
            <section className="mt-10">
              <div className="mb-3 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                Coverage by state — % of facilities offering each specialty
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-800/80">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-[var(--bg-elevated)] text-[10.5px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold">State</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Facilities</th>
                      {SPECIALTIES.map((s) => (
                        <th key={s.key} className="px-3 py-2.5 text-right font-semibold">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.states.map((r, i) => (
                      <tr
                        key={i}
                        className="border-t border-zinc-800/60 hover:bg-zinc-900/30"
                      >
                        <td className="px-3 py-2 font-medium text-zinc-100">
                          {r.state}
                        </td>
                        <td className="px-3 py-2 text-right tab-num text-zinc-300">
                          {r.facilities.toLocaleString()}
                        </td>
                        {SPECIALTIES.map((s) => {
                          const v = r.specialties[s.key];
                          if (!v) return <td key={s.key} className="px-3 py-2 text-right text-zinc-600">—</td>;
                          const intensity = Math.min(1, v.pct / 12);
                          const isLow = v.pct < 1;
                          return (
                            <td
                              key={s.key}
                              className="px-3 py-2 text-right tab-num"
                              style={{
                                color: isLow ? "#fca5a5" : `rgba(94, 234, 212, ${0.6 + intensity * 0.4})`,
                              }}
                            >
                              {v.pct.toFixed(1)}%
                              <span className="ml-1 text-[10px] opacity-50">
                                {v.count}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-10 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-5 py-4">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                Where Aarogya Atlas applies these signals
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-zinc-300">
                <li>
                  When a query lands in a low-coverage state, the agent
                  surfaces the gap explicitly in the answer card (&quot;Honest data
                  gap&quot;) instead of pretending to have a recommendation.
                </li>
                <li>
                  Trust Score CIs widen on facilities from low-completeness
                  source records — most common in under-served districts. We
                  expose the CI in the answer card so the user knows when our
                  confidence is low.
                </li>
                <li>
                  Medical desert overlay (red halos on the map) renders the
                  most underserved districts visually so NGO planners can
                  target where they invest, not where the loudest data lives.
                </li>
              </ul>
            </section>

            <CounterfactualSlider />

            <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card
                title="What we audit"
                items={[
                  "Per-state facility density (raw count)",
                  "Per-specialty coverage % within state",
                  "Disparate-impact ratio across states",
                  "Trust-score CI width vs source completeness",
                ]}
                tone="emerald"
              />
              <Card
                title="What we acknowledge we don't yet audit"
                items={[
                  "Caste / religion / urban-rural split (not in VF schema)",
                  "Gender-specific access (data sparse)",
                  "Insurance-vs-cash differential pricing per facility",
                  "Language barriers at the receptionist level",
                ]}
                tone="zinc"
              />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

const COUNTERFACTUAL_DISTRICTS = [
  "Patna",
  "Lucknow",
  "Ranchi",
  "Bhopal",
  "Hyderabad",
  "Bengaluru Rural",
  "Ahmedabad",
  "Kolkata",
];

function CounterfactualSlider() {
  const [district, setDistrict] = useState("Patna");
  const [beds, setBeds] = useState(10);
  const [data, setData] = useState<Counterfactual | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchCounterfactual(district, beds)
      .then(setData)
      .finally(() => setLoading(false));
  }, [district, beds]);

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Equity counterfactual — what if we add CEmONC beds?
      </div>
      <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/15 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
              District
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {COUNTERFACTUAL_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
              Add CEmONC beds: <span className="text-emerald-300 tab-num">{beds}</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={beds}
              onChange={(e) => setBeds(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-400"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500 tab-num">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {data && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CFStat
              label="Coverage today"
              value={`${data.coverage_now_pct}%`}
              sub={`${data.cemonc_now} / ${data.facilities_now} facilities`}
              tone="zinc"
            />
            <CFStat
              label="Coverage after"
              value={`${data.coverage_after_pct}%`}
              sub={`${data.cemonc_after} / ${data.facilities_now + beds} facilities`}
              tone="cyan"
            />
            <CFStat
              label="Maternal deaths averted / yr"
              value={`~${data.estimated_averted_deaths_per_year}`}
              sub={`out of ~${data.annual_district_maternal_deaths_est} estimated`}
              tone="emerald"
              big
            />
          </div>
        )}
        {!data && !loading && (
          <div className="mt-4 text-[12px] text-zinc-500">
            District not in dataset. Try Patna, Lucknow, Hyderabad, etc.
          </div>
        )}
        <p className="mt-4 text-[10.5px] leading-relaxed text-zinc-500">
          Method: gravity-model + Six-Delays attribution against the UN/WHO
          2024 baseline of 67,000 annual maternal deaths in India. Numbers
          are illustrative — a planning prior, not an epidemiological forecast.
        </p>
      </div>
    </section>
  );
}

function CFStat({
  label,
  value,
  sub,
  tone,
  big,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "cyan" | "zinc";
  big?: boolean;
}) {
  const colors = {
    emerald: "border-emerald-700/40 bg-emerald-950/30 text-emerald-200",
    cyan: "border-cyan-700/40 bg-cyan-950/30 text-cyan-200",
    zinc: "border-zinc-800 bg-zinc-900/40 text-zinc-300",
  }[tone];
  return (
    <div className={`rounded-lg border ${colors} px-3 py-3`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className={`mt-1 ${big ? "text-3xl" : "text-2xl"} font-semibold tab-num`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] text-zinc-400">{sub}</div>
    </div>
  );
}

function Card({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "zinc";
}) {
  const accent =
    tone === "emerald"
      ? "border-emerald-700/40 bg-emerald-950/20"
      : "border-zinc-800 bg-zinc-900/40";
  return (
    <div className={`rounded-xl border ${accent} px-5 py-4`}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] leading-relaxed text-zinc-300">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
