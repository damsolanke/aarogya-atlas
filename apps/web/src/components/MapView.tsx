"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  highlight?: boolean;
  rank?: number; // 1, 2, 3 for ranked tiers
  subtitle?: string;
};

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// OpenFreeMap planet tileset for 3D buildings overlay (no key required).
const OFM_VECTOR = "https://tiles.openfreemap.org/planet";
const OFM_URL = "https://openfreemap.org";

const SRC_FACILITIES = "facilities";
const LAYER_HEAT = "facilities-heat";
const LAYER_CLUSTER = "facilities-cluster";
const LAYER_CLUSTER_COUNT = "facilities-cluster-count";
const LAYER_UNCLUSTERED = "facilities-unclustered";
const LAYER_ROUTE = "route-line";
const LAYER_BUILDINGS = "ofm-3d-buildings";

export default function MapView({
  pins,
  center,
  zoom = 5.4,
  origin,
}: {
  pins: MapPin[];
  center: [number, number];
  zoom?: number;
  origin?: [number, number]; // [lat, lon] of user / agent's geocoded start
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const rankedMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // ---- Mount once ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [78.9629, 22.5937], // India centroid
      zoom: 4.4,
      pitch: 18,
      bearing: 0,
      attributionControl: false,
      antialias: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
      "top-right"
    );
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: `<a href="${OFM_URL}" target="_blank">OpenFreeMap</a>`,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      // ---- Facilities GeoJSON source (clustered) ----
      map.addSource(SRC_FACILITIES, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 48,
      });

      // ---- Heatmap (visible at low zoom, fades as you zoom in) ----
      map.addLayer({
        id: LAYER_HEAT,
        type: "heatmap",
        source: SRC_FACILITIES,
        maxzoom: 11,
        paint: {
          "heatmap-weight": 0.6,
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"],
            0, 0.6, 11, 2.5,
          ],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,    "rgba(0,0,0,0)",
            0.15, "rgba(34,211,238,0.30)",
            0.35, "rgba(94,234,212,0.50)",
            0.55, "rgba(167,139,250,0.65)",
            0.75, "rgba(251,146,60,0.80)",
            1.0,  "rgba(248,113,113,0.90)",
          ],
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            0, 14, 11, 38,
          ],
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"],
            7, 0.85, 11, 0,
          ],
        },
      });

      // ---- Cluster circles ----
      map.addLayer({
        id: LAYER_CLUSTER,
        type: "circle",
        source: SRC_FACILITIES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "rgba(34,211,238,0.65)", 25,
            "rgba(94,234,212,0.70)", 100,
            "rgba(167,139,250,0.75)", 500,
            "rgba(251,146,60,0.80)",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            14, 25, 18, 100, 24, 500, 30,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.35)",
          "circle-blur": 0.15,
        },
      });

      map.addLayer({
        id: LAYER_CLUSTER_COUNT,
        type: "symbol",
        source: SRC_FACILITIES,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-offset": [0, 0],
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.4)",
          "text-halo-width": 1,
        },
      });

      // ---- Unclustered points ----
      map.addLayer({
        id: LAYER_UNCLUSTERED,
        type: "circle",
        source: SRC_FACILITIES,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(34,211,238,0.85)",
          "circle-radius": 4,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.5)",
        },
      });

      // ---- 3D buildings (OpenFreeMap, kicks in at zoom ≥14) ----
      map.addSource("ofm", { type: "vector", url: OFM_VECTOR });
      map.addLayer({
        id: LAYER_BUILDINGS,
        source: "ofm",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 13.5,
        paint: {
          "fill-extrusion-color": [
            "interpolate", ["linear"], ["get", "render_height"],
            0, "#1f2937", 50, "#334155", 200, "#64748b",
          ],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.8,
        },
      });

      // ---- Cluster click → expand ----
      map.on("click", LAYER_CLUSTER, async (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [LAYER_CLUSTER],
        });
        const f = features[0];
        if (!f) return;
        const src = map.getSource(SRC_FACILITIES) as maplibregl.GeoJSONSource;
        const z = await src.getClusterExpansionZoom(
          f.properties!.cluster_id as number
        );
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({
          center: coords,
          zoom: z + 0.3,
          duration: 800,
          essential: true,
        });
      });
      map.on("mouseenter", LAYER_CLUSTER, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", LAYER_CLUSTER, () => (map.getCanvas().style.cursor = ""));

      // ---- Hover tooltip on individual points ----
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: "aa-popup",
      });
      map.on("mouseenter", LAYER_UNCLUSTERED, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as { name?: string; subtitle?: string };
        const html = `<div style="font:500 12px/1.4 system-ui;color:#f4f5f7;background:#11141b;border:1px solid #1f2330;padding:8px 10px;border-radius:8px;min-width:160px"><div style="font-weight:600">${escape(props.name || "")}</div>${
          props.subtitle ? `<div style="color:#a8acba;font-size:10.5px;margin-top:2px">${escape(props.subtitle)}</div>` : ""
        }</div>`;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup.setLngLat(coords).setHTML(html).addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_UNCLUSTERED, () => {
        popup.remove();
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      rankedMarkersRef.current.forEach((m) => m.remove());
      rankedMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- Update facilities source whenever pins change ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(SRC_FACILITIES) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const features: GeoJSON.Feature<GeoJSON.Point>[] = pins.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          id: p.id,
          name: p.name,
          subtitle: p.subtitle || "",
        },
      }));
      src.setData({ type: "FeatureCollection", features });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [pins]);

  // ---- Update ranked DOM markers (numbered) for agent-picked facilities ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const ranked = pins.filter((p) => p.highlight);
      const seen = new Set<string>();

      ranked.forEach((p, i) => {
        seen.add(p.id);
        const rank = p.rank ?? i + 1;
        const existing = rankedMarkersRef.current.get(p.id);
        if (existing) {
          existing.setLngLat([p.lon, p.lat]);
          // update rank number text if changed
          const span = existing.getElement().querySelector(".aa-rank-num");
          if (span) span.textContent = String(rank);
          return;
        }
        const el = document.createElement("div");
        el.className = "aa-rank-pin";
        el.innerHTML = `<span class="aa-rank-num">${rank}</span>`;
        el.title = p.name;
        const m = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([p.lon, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(
              `<div style="font:500 12px/1.4 system-ui;color:#f4f5f7;background:#11141b;border:1px solid #1f2330;padding:8px 10px;border-radius:8px;min-width:180px"><div style="font-weight:600">${escape(p.name)}</div>${
                p.subtitle ? `<div style="color:#a8acba;font-size:10.5px;margin-top:2px">${escape(p.subtitle)}</div>` : ""
              }</div>`
            )
          )
          .addTo(map);
        rankedMarkersRef.current.set(p.id, m);
      });

      // Remove any markers no longer ranked
      for (const [id, m] of rankedMarkersRef.current) {
        if (!seen.has(id)) {
          m.remove();
          rankedMarkersRef.current.delete(id);
        }
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [pins]);

  // ---- Cinematic flyTo when center / zoom changes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const fly = () => {
      const targetZoom = zoom > 9 ? Math.max(zoom, 12) : zoom;
      map.flyTo({
        center: [center[1], center[0]],
        zoom: targetZoom,
        pitch: targetZoom > 11 ? 55 : 24,
        bearing: targetZoom > 11 ? -17 : 0,
        speed: 0.6,
        curve: 1.42,
        duration: 2000,
        easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        essential: true,
      });
    };
    if (map.isStyleLoaded()) fly();
    else map.once("load", fly);
  }, [center, zoom]);

  // ---- Draw OSRM route from `origin` to top-ranked facility (rank=1) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    const top = pins.find((p) => p.highlight && (p.rank ?? 99) === 1) || pins.find((p) => p.highlight);
    if (!top) {
      // remove any existing route
      if (map.getLayer(LAYER_ROUTE)) map.removeLayer(LAYER_ROUTE);
      if (map.getSource("route")) map.removeSource("route");
      return;
    }
    const drawRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${top.lon},${top.lat}?overview=full&geometries=geojson`;
        const r = await fetch(url);
        if (!r.ok) return;
        const j = await r.json();
        const geometry = j.routes?.[0]?.geometry;
        if (!geometry) return;
        if (map.getLayer(LAYER_ROUTE)) map.removeLayer(LAYER_ROUTE);
        if (map.getSource("route")) map.removeSource("route");
        map.addSource("route", {
          type: "geojson",
          lineMetrics: true,
          data: { type: "Feature", geometry, properties: {} },
        });
        map.addLayer({
          id: LAYER_ROUTE,
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": 4.5,
            "line-color": "#22d3ee",
            "line-opacity": 0.85,
            "line-blur": 0.5,
          },
        }, LAYER_UNCLUSTERED);
      } catch {
        /* OSRM rate-limited or down — silently skip */
      }
    };
    if (map.isStyleLoaded()) drawRoute();
    else map.once("load", drawRoute);
  }, [origin, pins]);

  return (
    <div className="relative h-full w-full bg-[#08090d]">
      <div ref={containerRef} className="h-full w-full" />
      <style jsx global>{`
        .aa-rank-pin {
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg) translateY(-4px);
          background: linear-gradient(135deg, #22d3ee, #6366f1);
          box-shadow:
            0 0 0 4px rgba(34, 211, 238, 0.22),
            0 6px 20px rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          cursor: pointer;
          animation: aa-rank-pulse 2.2s ease-out infinite;
        }
        .aa-rank-pin .aa-rank-num {
          transform: rotate(45deg);
          color: #0b1220;
          font-weight: 800;
          font-size: 13px;
          font-family: var(--font-geist-sans), -apple-system, sans-serif;
          line-height: 1;
        }
        @keyframes aa-rank-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,211,238,0.55), 0 6px 20px rgba(0,0,0,.55); }
          70%  { box-shadow: 0 0 0 18px rgba(34,211,238,0), 0 6px 20px rgba(0,0,0,.55); }
          100% { box-shadow: 0 0 0 0 rgba(34,211,238,0), 0 6px 20px rgba(0,0,0,.55); }
        }
        .aa-popup .maplibregl-popup-tip { display: none; }
        .aa-popup .maplibregl-popup-content { padding: 0; background: transparent; box-shadow: none; }
      `}</style>
    </div>
  );
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
