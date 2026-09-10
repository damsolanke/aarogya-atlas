"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import AgentChat, { type AgentResult } from "@/components/AgentChat";
import {
  listFacilities,
  fetchDeserts,
  fetchStockout,
  type Facility,
  type DesertFeature,
  type StockoutPayload,
} from "@/lib/api";
import { AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/cn";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-elevated)]">
      <div className="flex flex-col items-center gap-2 text-zinc-500">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        </div>
        <span className="text-[11px] uppercase tracking-wider">
          Loading basemap
        </span>
      </div>
    </div>
  ),
});

// All-India centroid — first impression is the country, not Karnataka.
const INDIA_CENTER: [number, number] = [22.5937, 78.9629];

export default function HomePage() {
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [center, setCenter] = useState<[number, number]>(INDIA_CENTER);
  const [zoom, setZoom] = useState<number>(4.4);
  const [origin, setOrigin] = useState<[number, number] | undefined>();
  const [highlightRanks, setHighlightRanks] = useState<Map<string, number>>(new Map());
  const [desertSpecialty, setDesertSpecialty] = useState<string | null>(null);
  // Desert features are stored with the specialty that produced them, so the
  // loading flag is derived rather than set synchronously in the effect.
  const [desertLayer, setDesertLayer] = useState<{ specialty: string | null; features: DesertFeature[] }>({
    specialty: null,
    features: [],
  });
  const deserts = desertLayer.features;
  const desertLoading = desertSpecialty !== null && desertLayer.specialty !== desertSpecialty;
  const [stockoutCommodity, setStockoutCommodity] = useState<string | null>(null);
  const [stockout, setStockout] = useState<StockoutPayload | null>(null);

  useEffect(() => {
    if (!stockoutCommodity) return;
    let cancelled = false;
    fetchStockout(stockoutCommodity)
      .then((s) => {
        if (!cancelled) setStockout(s);
      })
      .catch(() => {
        if (!cancelled) setStockout(null);
      });
    return () => {
      cancelled = true;
    };
  }, [stockoutCommodity]);

  useEffect(() => {
    let cancelled = false;
    const specialty = desertSpecialty;
    // With no overlay selected, preload the top critical dialysis districts
    // so the map has narrative before the user picks one.
    fetchDeserts(specialty ?? "dialysis")
      .then((d) => {
        if (!cancelled) setDesertLayer({ specialty, features: specialty ? d : d.slice(0, 8) });
      })
      .catch(() => {
        if (!cancelled) setDesertLayer({ specialty, features: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [desertSpecialty]);

  const desertPoints = deserts.map((f) => ({
    district: f.properties.district,
    state: f.properties.state,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    total: f.properties.total_facilities,
    coverage: f.properties.coverage,
    severity: f.properties.severity,
    specialty: f.properties.specialty,
  }));

  useEffect(() => {
    // Load a stratified sample across India for the map dataviz; the agent
    // can pull more facilities into the visible set on demand.
    listFacilities(undefined, 1500)
      .then(setAllFacilities)
      .catch(() => {});
  }, []);

  const handleResult = useCallback((r: AgentResult) => {
    if (r.origin) setOrigin(r.origin);

    // Center: prefer agent-provided geocoded center, else centroid of picks.
    let nextCenter = r.centerLatLon;
    if (!nextCenter && r.facilities && r.facilities.length > 0) {
      const valid = r.facilities.filter(
        (f) => Number.isFinite(f.lat) && Number.isFinite(f.lon)
      );
      if (valid.length > 0) {
        const lat = valid.reduce((s, f) => s + f.lat, 0) / valid.length;
        const lon = valid.reduce((s, f) => s + f.lon, 0) / valid.length;
        nextCenter = [lat, lon];
      }
    }
    if (nextCenter) {
      setCenter(nextCenter);
      setZoom(13);
    }

    if (r.facilities && r.facilities.length > 0) {
      const ranks = new Map<string, number>();
      r.facilities.forEach((f) => ranks.set(f.id, f.rank ?? 99));
      setHighlightRanks(ranks);
      setAllFacilities((prev) => {
        const map = new Map(prev.map((f) => [f.id, f]));
        for (const f of r.facilities!) {
          if (!map.has(f.id) && Number.isFinite(f.lat) && Number.isFinite(f.lon)) {
            map.set(f.id, {
              id: f.id,
              name: f.name,
              latitude: f.lat,
              longitude: f.lon,
              address_district: null,
              address_state: null,
              services: [],
            });
          }
        }
        return Array.from(map.values());
      });
    }
  }, []);

  const pins = allFacilities.map((f) => ({
    id: f.id,
    name: f.name,
    lat: f.latitude,
    lon: f.longitude,
    highlight: highlightRanks.has(f.id),
    rank: highlightRanks.get(f.id),
    subtitle: f.services?.slice(0, 2).join(" · ") || undefined,
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header loaded={allFacilities.length > 0} />

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <aside className="relative flex max-h-[60vh] w-full flex-col overflow-hidden border-b border-[var(--border)] bg-[var(--bg)]/50 md:max-h-none md:w-[44%] md:min-w-[440px] md:max-w-[640px] md:border-b-0 md:border-r">
          <div className="aurora" />
          <div className="relative z-10 flex h-full flex-col">
            <AgentChat onResult={handleResult} />
          </div>
        </aside>

        <main className="relative min-h-[40vh] flex-1 bg-[var(--bg-elevated)] md:min-h-0">
          <MapView
            pins={pins}
            center={center}
            zoom={zoom}
            origin={origin}
            deserts={desertPoints}
          />

          {/* Legend overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1.5">
            <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-[9px] font-bold text-zinc-900">
                1
              </span>
              Agent picks (ranked)
              <span className="ml-1 tab-num text-cyan-300">
                {highlightRanks.size}
              </span>
            </div>
            {origin && (
              <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300">
                <span className="inline-block h-2 w-6 rounded-full bg-cyan-400" />
                OSRM route (driving)
              </div>
            )}
            <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400/40" />
              <span className="tab-num text-zinc-300">10,000</span>
              <span>facilities · agent searches all,</span>
              <span className="tab-num text-zinc-300">
                {allFacilities.length.toLocaleString()}
              </span>
              <span>rendered for perf</span>
            </div>
          </div>

          {/* Top-right info chip */}
          <div className="pointer-events-none absolute right-4 top-4 z-10">
            <div className="glass rounded-lg px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-zinc-400">
              India · 10,000 facilities · Virtue Foundation dataset
            </div>
          </div>

          {/* Stockout chip (when active) */}
          {stockout && (
            <div className="pointer-events-none absolute right-4 bottom-20 z-10">
              <div className="glass rounded-lg px-3 py-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Package className="h-3 w-3" />
                  <span className="font-semibold uppercase tracking-wider">{stockout.label}</span>
                  <span className="rounded border border-amber-700/60 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-400">
                    simulated
                  </span>
                </div>
                <div className="mt-1 text-zinc-300">
                  <span className="tab-num font-semibold text-amber-200">{stockout.stockout_pct}%</span> stockout · <span className="tab-num">{stockout.in_stock_count}/{stockout.facilities_polled}</span> in stock
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  simulated · deterministic per facility id, not real stock data
                </div>
              </div>
            </div>
          )}

          {/* Desert overlay toggles (top-left) */}
          <div className="absolute left-4 top-4 z-10">
            <div className="glass rounded-lg p-2">
              <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                Medical desert overlay
              </div>
              <div className="flex flex-wrap gap-1">
                {(["dialysis", "oncology", "trauma", "icu"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setDesertSpecialty(desertSpecialty === s ? null : s)
                    }
                    className={cn(
                      "rounded px-2 py-0.5 text-[10.5px] transition-colors",
                      desertSpecialty === s
                        ? "bg-red-500/20 text-red-200 ring-1 ring-red-500/40"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
                {desertSpecialty && (
                  <span className="ml-1 text-[10px] text-zinc-500">
                    {desertLoading ? "loading…" : `${desertPoints.length} districts`}
                  </span>
                )}
              </div>

              {/* Stockout / commodity layer */}
              <div className="mt-2 flex items-center gap-1.5 px-1 pb-1.5 text-[10px] uppercase tracking-wider text-zinc-400 border-t border-zinc-800/60 pt-2">
                <Package className="h-3 w-3 text-amber-400" />
                Stockout layer · simulated
              </div>
              <div className="flex flex-wrap gap-1">
                {(["antivenom", "oxytocin", "magsulf", "oxygen", "blood"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      const next = stockoutCommodity === c ? null : c;
                      setStockoutCommodity(next);
                      if (!next) setStockout(null);
                    }}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10.5px] transition-colors",
                      stockoutCommodity === c
                        ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    )}
                  >
                    {c}
                  </button>
                ))}
                {stockout && (
                  <span className="ml-1 text-[10px] text-zinc-500">
                    {stockout.in_stock_count}/{stockout.facilities_polled} in stock
                  </span>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
