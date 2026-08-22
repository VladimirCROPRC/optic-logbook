import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Loader2 } from "lucide-react";

import type { LatLng } from "@/lib/fiber";

export type MapMarker = {
  id: string;
  position: LatLng;
  label: string;
  kind: "site" | "closure" | "optix" | "client" | "end";
};

export type MapBounds = { north: number; south: number; east: number; west: number };

const PIN_COLORS: Record<MapMarker["kind"], string> = {
  site: "#2a6f8e",
  closure: "#d08b2b",
  optix: "#7c3aed",
  client: "#0f766e",
  end: "#b91c1c",
};

function pinIcon(kind: MapMarker["kind"]) {
  const color = PIN_COLORS[kind];
  const size = kind === "optix" ? 12 : 18;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
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

function ViewportWatcher({ onChange }: { onChange?: ((b: MapBounds) => void) | undefined }) {
  const map = useMapEvents({
    moveend() {
      emit();
    },
    zoomend() {
      emit();
    },
  });

  function emit() {
    if (!onChange) return;
    const b = map.getBounds();
    onChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }

  useEffect(() => {
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

function LocateButton({ onLocated }: { onLocated?: ((p: LatLng) => void) | undefined }) {
  const map = useMap();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!navigator.geolocation) return;
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setBusy(false);
            const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.setView([p.lat, p.lng], Math.max(map.getZoom(), 17));
            onLocated?.(p);
          },
          () => setBusy(false),
          { enableHighAccuracy: true },
        );
      }}
      className="absolute right-3 bottom-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-xs font-semibold shadow-card"
      aria-label="Locația curentă"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
      Locația curentă
    </button>
  );
}

export default function LeafletMap({
  center,
  zoom = 17,
  path = [],
  markers = [],
  onMapClick,
  onMarkerDrag,
  onViewportChange,
  onLocated,
  className = "h-[60vh] w-full",
}: {
  center: LatLng;
  zoom?: number;
  path?: LatLng[];
  markers?: MapMarker[];
  onMapClick?: ((p: LatLng) => void) | undefined;
  onMarkerDrag?: ((id: string, p: LatLng) => void) | undefined;
  onViewportChange?: ((b: MapBounds) => void) | undefined;
  onLocated?: ((p: LatLng) => void) | undefined;
  className?: string;
}) {
  const positions = useMemo(() => path.map((p) => [p.lat, p.lng] as [number, number]), [path]);

  return (
    <div className="relative">
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
        <ViewportWatcher onChange={onViewportChange} />
        <LocateButton onLocated={onLocated} />
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
            draggable={Boolean(onMarkerDrag) && m.kind !== "optix"}
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onMarkerDrag?.(m.id, { lat: ll.lat, lng: ll.lng });
              },
            }}
          >
            <Popup>{m.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
