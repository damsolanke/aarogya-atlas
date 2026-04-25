"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import L from "leaflet";

// Default Leaflet marker icons fail under bundlers; rebind.
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const HighlightIcon = L.divIcon({
  className: "aa-marker-highlight",
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;
    background:#22d3ee;border:3px solid #0e7490;
    box-shadow:0 0 16px rgba(34,211,238,0.9);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  highlight?: boolean;
  subtitle?: string;
};

function FlyTo({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 1.2 });
  }, [lat, lon, zoom, map]);
  return null;
}

export default function MapView({
  pins,
  center,
  zoom = 11,
}: {
  pins: MapPin[];
  center: [number, number];
  zoom?: number;
}) {
  const markers = useMemo(() => pins.slice(0, 400), [pins]);
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo lat={center[0]} lon={center[1]} zoom={zoom} />
      {markers.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lon]}
          icon={p.highlight ? HighlightIcon : DefaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{p.name}</div>
              {p.subtitle && (
                <div className="text-xs text-zinc-500 mt-1">{p.subtitle}</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
