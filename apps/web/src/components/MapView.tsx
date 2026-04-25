"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  highlight?: boolean;
  subtitle?: string;
};

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function MapView({
  pins,
  center,
  zoom = 6.4,
  onPinClick,
}: {
  pins: MapPin[];
  center: [number, number];
  zoom?: number;
  onPinClick?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;

  // Mount once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [77.5946, 12.9716],
      zoom: 6.4,
      pitch: 24,
      attributionControl: false,
      cooperativeGestures: false,
      antialias: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
      "top-right"
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to new center / zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const fly = () => {
      map.flyTo({
        center: [center[1], center[0]],
        zoom,
        pitch: zoom > 9 ? 38 : 24,
        duration: 1400,
        essential: true,
      });
    };
    if (map.isStyleLoaded()) fly();
    else map.once("load", fly);
  }, [center, zoom]);

  // Reconcile markers when pins change. Cap to 400 to keep DOM light.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      // Always render every highlighted pin; cap regulars to keep DOM light.
      const highlighted = pins.filter((p) => p.highlight);
      const regular = pins.filter((p) => !p.highlight).slice(0, 400);
      const visible = [...highlighted, ...regular];
      const seen = new Set<string>();

      for (const p of visible) {
        seen.add(p.id);
        const existing = markersRef.current.get(p.id);
        if (existing) {
          // Update highlight state
          const el = existing.getElement();
          el.classList.toggle("aa-highlight", !!p.highlight);
          continue;
        }
        const el = document.createElement("div");
        el.className = `aa-marker ${p.highlight ? "aa-highlight" : ""}`;
        el.title = p.name;
        if (onPinClickRef.current) {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onPinClickRef.current?.(p.id);
          });
        }

        const popupHtml = `
          <div style="font: 500 12px/1.4 system-ui; color:#f4f5f7; background:#11141b; border:1px solid #1f2330; padding:8px 10px; border-radius:8px; min-width:160px;">
            <div style="font-weight:600">${escapeHtml(p.name)}</div>
            ${p.subtitle ? `<div style="color:#a8acba; font-size:10.5px; margin-top:2px">${escapeHtml(p.subtitle)}</div>` : ""}
          </div>`;

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lon, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(popupHtml)
          )
          .addTo(map);

        markersRef.current.set(p.id, marker);
      }

      for (const [id, m] of markersRef.current) {
        if (!seen.has(id)) {
          m.remove();
          markersRef.current.delete(id);
        }
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [pins]);

  return (
    <div className="relative h-full w-full bg-[#08090d]">
      <div ref={containerRef} className="h-full w-full" />
      <style jsx global>{`
        .aa-marker {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(148, 163, 184, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.2);
          cursor: pointer;
          transition: transform 200ms ease, background 200ms ease,
            box-shadow 300ms ease;
        }
        .aa-marker:hover {
          transform: scale(1.6);
          background: rgba(244, 245, 247, 0.85);
        }
        .aa-marker.aa-highlight {
          width: 16px;
          height: 16px;
          background: #22d3ee;
          border: 2px solid #a5f3fc;
          box-shadow: 0 0 18px rgba(34, 211, 238, 0.85),
            0 0 0 8px rgba(34, 211, 238, 0.18);
          z-index: 5;
          animation: aa-pulse 2.4s ease-in-out infinite;
        }
        @keyframes aa-pulse {
          0%, 100% {
            box-shadow: 0 0 18px rgba(34, 211, 238, 0.85),
              0 0 0 6px rgba(34, 211, 238, 0.18);
          }
          50% {
            box-shadow: 0 0 28px rgba(34, 211, 238, 1),
              0 0 0 14px rgba(34, 211, 238, 0.08);
          }
        }
      `}</style>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
