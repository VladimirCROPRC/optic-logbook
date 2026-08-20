export const INSTALL_STATUSES = ["draft", "in_progress", "completed", "blocked"] as const;
export type InstallStatus = (typeof INSTALL_STATUSES)[number];

export const STATUS_LABEL: Record<InstallStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

export const CPE_MODELS = [
  "Huawei EchoLife HG8245",
  "Huawei NE8000",
  "Cisco C1111-8P",
  "MikroTik CCR2004",
  "MikroTik hEX S",
  "Juniper ACX710",
  "Nokia 7210 SAS",
  "Zyxel VMG8825",
  "Other / custom",
];

export const FIBER_COLORS = [
  "Blue",
  "Orange",
  "Green",
  "Brown",
  "Slate",
  "White",
  "Red",
  "Black",
  "Yellow",
  "Violet",
  "Rose",
  "Aqua",
];

export type LatLng = { lat: number; lng: number };

export function isLatLngArray(value: unknown): value is LatLng[] {
  return (
    Array.isArray(value) &&
    value.every(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as LatLng).lat === "number" &&
        typeof (p as LatLng).lng === "number",
    )
  );
}

/** Haversine length of a polyline in meters. */
export function pathLength(points: LatLng[]): number {
  const R = 6371000;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(h));
  }
  return Math.round(total);
}