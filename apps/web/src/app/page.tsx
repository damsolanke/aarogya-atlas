"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import AgentChat, { type AgentResult } from "@/components/AgentChat";
import { listFacilities, type Facility } from "@/lib/api";

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

const KARNATAKA_CENTER: [number, number] = [12.9716, 77.5946];

export default function HomePage() {
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [center, setCenter] = useState<[number, number]>(KARNATAKA_CENTER);
  const [zoom, setZoom] = useState<number>(6.4);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());

  useEffect(() => {
    listFacilities("Karnataka", 800)
      .then(setAllFacilities)
      .catch(() => {});
  }, []);

  const handleResult = useCallback((r: AgentResult) => {
    if (r.centerLatLon) {
      setCenter(r.centerLatLon);
      setZoom(12.5);
    }
    if (r.facilities && r.facilities.length > 0) {
      setHighlight(new Set(r.facilities.map((f) => f.id)));
      setAllFacilities((prev) => {
        const map = new Map(prev.map((f) => [f.id, f]));
        for (const f of r.facilities!) {
          if (!map.has(f.id)) {
            map.set(f.id, {
              id: f.id,
              name: f.name,
              latitude: f.lat,
              longitude: f.lon,
              address_district: null,
              address_state: "Karnataka",
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
    highlight: highlight.has(f.id),
    subtitle: f.services?.slice(0, 2).join(" · ") || undefined,
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header facilityCount={allFacilities.length} loaded={allFacilities.length > 0} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[44%] min-w-[440px] max-w-[640px] flex-col border-r border-[var(--border)] bg-[var(--bg)]/50">
          <AgentChat onResult={handleResult} />
        </aside>

        <main className="relative flex-1 bg-[var(--bg-elevated)]">
          <MapView pins={pins} center={center} zoom={zoom} />

          {/* Legend overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1.5">
            <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              Selected by agent
              <span className="ml-1 tab-num text-cyan-300">
                {highlight.size}
              </span>
            </div>
            <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-500/70" />
              All indexed facilities
              <span className="ml-1 tab-num text-zinc-300">
                {allFacilities.length.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Top-right info chip */}
          <div className="pointer-events-none absolute right-4 top-4 z-10">
            <div className="glass rounded-lg px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-zinc-400">
              Karnataka · 8,504 facilities · OSM + ABDM-aligned
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
