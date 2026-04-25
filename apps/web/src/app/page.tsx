"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import AgentChat, { type AgentResult } from "@/components/AgentChat";
import { listFacilities, type Facility } from "@/lib/api";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm">
      Loading map…
    </div>
  ),
});

const KARNATAKA_CENTER: [number, number] = [12.9716, 77.5946];

export default function HomePage() {
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [center, setCenter] = useState<[number, number]>(KARNATAKA_CENTER);
  const [zoom, setZoom] = useState(7);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());

  useEffect(() => {
    listFacilities("Karnataka", 500).then(setAllFacilities).catch(() => {});
  }, []);

  function handleResult(r: AgentResult) {
    if (r.centerLatLon) {
      setCenter(r.centerLatLon);
      setZoom(12);
    }
    if (r.facilities && r.facilities.length > 0) {
      setHighlight(new Set(r.facilities.map((f) => f.id)));
      // Add agent-returned facilities to the map even if not in the random 500
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
  }

  const pins = allFacilities.map((f) => ({
    id: f.id,
    name: f.name,
    lat: f.latitude,
    lon: f.longitude,
    highlight: highlight.has(f.id),
    subtitle: f.services?.slice(0, 3).join(" · "),
  }));

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Aarogya Atlas
          </h1>
          <p className="text-xs text-zinc-500">
            On-device, FHIR-native healthcare facility intelligence for India
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded">
            Zero PHI egress
          </span>
          <span className="text-[11px] uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-1 rounded">
            FHIR R4
          </span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
            Hack-Nation 2026
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[42%] min-w-[420px] border-r border-zinc-800 flex flex-col">
          <AgentChat onResult={handleResult} />
        </aside>
        <main className="flex-1 relative">
          <MapView pins={pins} center={center} zoom={zoom} />
          <div className="absolute bottom-3 left-3 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
            <span className="text-zinc-400">Facilities loaded: </span>
            <span className="font-mono text-zinc-100">{allFacilities.length}</span>
            <span className="text-zinc-400 ml-3">Highlighted: </span>
            <span className="font-mono text-cyan-400">{highlight.size}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
