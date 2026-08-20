import { parseSegments } from "@/lib/fiber";
import type { Tables } from "@/integrations/supabase/types";

export type DevizItem = Tables<"deviz_items">;
export type DevizLine = Tables<"deviz_lines">;

export type JobBundle = {
  installation: Tables<"installations">;
  routes: Tables<"fiber_routes">[];
  closures: Tables<"splice_closures">[];
  splices: Tables<"splices">[];
  speedTests: Tables<"speed_tests">[];
};

/** Total length per installation method across all cable routes, in meters. */
export function metersByMethod(routes: Tables<"fiber_routes">[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const route of routes) {
    const segments = parseSegments(route.segments);
    if (segments.length) {
      for (const s of segments) {
        totals[s.method] = (totals[s.method] ?? 0) + (Number(s.length_m) || 0);
      }
    } else if (route.length_m) {
      const key = route.installation_method?.trim() || "aerian";
      totals[key] = (totals[key] ?? 0) + Number(route.length_m);
    }
  }
  return totals;
}

export function totalRouteMeters(routes: Tables<"fiber_routes">[]): number {
  return routes.reduce((sum, r) => {
    const segs = parseSegments(r.segments);
    const fromSegs = segs.reduce((s, x) => s + (Number(x.length_m) || 0), 0);
    return sum + (fromSegs || Number(r.length_m) || 0);
  }, 0);
}

const km = (m: number) => Math.round((m / 1000) * 1000) / 1000;

/**
 * Suggested quantities keyed by `${category}#${item_no}` from the catalog.
 * Everything here is a starting point — the technician can edit each line.
 */
export function suggestQuantities(job: JobBundle): Record<string, number> {
  const { installation: i, routes, closures, splices } = job;
  const meters = metersByMethod(routes);
  const out: Record<string, number> = {};
  const set = (key: string, qty: number) => {
    if (qty > 0) out[key] = Math.round(qty * 1000) / 1000;
  };

  // Cable installation, per method
  set("manopera#11", km(meters["aerian"] ?? 0));
  set("manopera#10", km(meters["fatada"] ?? 0));
  set("manopera#22", km((meters["canalizatie"] ?? 0) + (meters["canalizatie_client"] ?? 0)));
  set("manopera#18", km(meters["subteran"] ?? 0));
  set("manopera#15", km(meters["pat_cablu"] ?? 0));
  set("manopera#16", meters["interior_tub"] ?? 0);

  // Splicing & measurements
  set("manopera#7", splices.length);
  set("manopera#9", splices.length);
  set("manopera#8", closures.length);
  set("manopera#30", closures.length);

  // Client equipment
  if (i.cpe_model) {
    set("manopera#111", 1);
    set("manopera#139", 1);
  }
  if (i.media_converter_installed) set("manopera#121", 1);
  if (i.terminal_box_installed) set("manopera#123", 1);

  // Site / POP
  if (i.odf_name) set("manopera#122", 1);
  if (i.odf_port) set("manopera#130", 1);
  if (i.switch_port) set("manopera#131", 1);

  // Admin
  if (i.work_order) set("manopera#138", 1);
  set("manopera#120", 1);
  set("manopera#147", 1);

  // Materials
  if (closures.length) set("materiale#6", closures.length);

  return out;
}

export function itemKey(item: Pick<DevizItem, "category" | "item_no">) {
  return `${item.category}#${item.item_no}`;
}

export function money(n: number) {
  return Math.round(n * 100) / 100;
}