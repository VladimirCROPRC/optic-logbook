export const INSTALL_STATUSES = ["draft", "in_progress", "completed", "blocked"] as const;
export type InstallStatus = (typeof INSTALL_STATUSES)[number];

export const STATUS_LABEL: Record<InstallStatus, string> = {
  draft: "Ciornă",
  in_progress: "În lucru",
  completed: "Finalizat",
  blocked: "Blocat",
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
  "Alt model / personalizat",
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

/** Romanian names for the standard fiber color code. */
export const FIBER_COLOR_RO: Record<string, string> = {
  Blue: "Albastru",
  Orange: "Portocaliu",
  Green: "Verde",
  Brown: "Maro",
  Slate: "Gri",
  White: "Alb",
  Red: "Rosu",
  Black: "Negru",
  Yellow: "Galben",
  Violet: "Violet",
  Rose: "Roz",
  Aqua: "Turcoaz",
};

export function colorRo(value: string | null | undefined): string {
  if (!value) return "";
  return FIBER_COLOR_RO[value] ?? value;
}

export type LatLng = { lat: number; lng: number };

/** Installation methods for a route segment, with the Romanian wording used in the report. */
export const SEGMENT_METHODS = [
  { value: "aerian", label: "Aerian (stâlpi)", ro: "aerian" },
  { value: "fatada", label: "Pe fațadă", ro: "pe fatada cladirii" },
  { value: "canalizatie", label: "Canalizație (operator)", ro: "in canalizatie" },
  { value: "canalizatie_client", label: "Canalizația clientului", ro: "in canalizatia clientului" },
  { value: "subteran", label: "Subteran / șanț", ro: "subteran" },
  { value: "pat_cablu", label: "Interior, pat de cablu", ro: "in interior in pat de cablu" },
  { value: "interior_tub", label: "Interior, tub de protecție", ro: "in interior in tub de protectie" },
] as const;

export type SegmentMethod = (typeof SEGMENT_METHODS)[number]["value"];

export type RouteSegment = { method: SegmentMethod | string; length_m: number };

export function segmentRo(method: string): string {
  return SEGMENT_METHODS.find((m) => m.value === method)?.ro ?? method;
}

export function isSegmentArray(value: unknown): value is RouteSegment[] {
  return (
    Array.isArray(value) &&
    value.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as RouteSegment).method === "string" &&
        typeof (s as RouteSegment).length_m === "number",
    )
  );
}

export function parseSegments(value: unknown): RouteSegment[] {
  return isSegmentArray(value) ? value : [];
}

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