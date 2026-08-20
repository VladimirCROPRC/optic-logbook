import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { LatLng } from "@/lib/fiber";

export type MapMarker = {
  id: string;
  position: LatLng;
  label: string;
  kind: "site" | "closure";
};

function pinIcon(kind: MapMarker["kind"]) {
  const color = kind === "site" ? "#2a6f8e" : "#d08b2b";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff"></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

function ClickHandler({ onClick }: { onClick?: ((p: LatLng) => void) | undefined }) {
  useMapEvents({
    click(e) {
      onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);
  return null;
}

export default function LeafletMap({
  center,
  zoom = 17,
  path = [],
  markers = [],
  onMapClick,
  onMarkerDrag,
  className = "h-[60vh] w-full",
}: {
  center: LatLng;
  zoom?: number;
  path?: LatLng[];
  markers?: MapMarker[];
  onMapClick?: ((p: LatLng) => void) | undefined;
  onMarkerDrag?: ((id: string, p: LatLng) => void) | undefined;
  className?: string;
}) {
  const positions = useMemo(() => path.map((p) => [p.lat, p.lng] as [number, number]), [path]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      className={`${className} overflow-hidden rounded-xl`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Recenter center={center} zoom={zoom} />
      <ClickHandler onClick={onMapClick} />
      {positions.length > 1 ? (
        <Polyline positions={positions} pathOptions={{ color: "#2a6f8e", weight: 5 }} />
      ) : null}
      {positions.map((p, i) => (
        <Marker
          key={`v-${i}`}
          position={p}
          icon={L.divIcon({
            className: "",
            html: `<div style="width:11px;height:11px;border-radius:50%;background:#fff;border:3px solid #2a6f8e"></div>`,
            iconSize: [11, 11],
            iconAnchor: [5, 5],
          })}
        />
      ))}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.position.lat, m.position.lng]}
          icon={pinIcon(m.kind)}
          title={m.label}
          draggable={Boolean(onMarkerDrag)}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onMarkerDrag?.(m.id, { lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      ))}
    </MapContainer>
  );
}