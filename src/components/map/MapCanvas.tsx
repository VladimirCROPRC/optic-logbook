import { Suspense, lazy, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { LatLng } from "@/lib/fiber";
import type { MapMarker } from "./LeafletMap";

const LeafletMap = lazy(() => import("./LeafletMap"));

export type { MapMarker };

export function MapCanvas(props: {
  center: LatLng;
  zoom?: number;
  path?: LatLng[];
  markers?: MapMarker[];
  onMapClick?: ((p: LatLng) => void) | undefined;
  onMarkerDrag?: ((id: string, p: LatLng) => void) | undefined;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fallback = (
    <div
      className={`${props.className ?? "h-[60vh] w-full"} flex items-center justify-center rounded-xl bg-muted`}
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <LeafletMap {...props} />
    </Suspense>
  );
}