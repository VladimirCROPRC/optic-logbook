import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crosshair, MapPin, Plus, Ruler, Trash2, Undo2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapCanvas, type MapBounds, type MapMarker } from "@/components/map/MapCanvas";
import {
  SEGMENT_METHODS,
  isLatLngArray,
  parseSegments,
  pathLength,
  type LatLng,
  type RouteSegment,
} from "@/lib/fiber";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, SectionCard } from "./Field";
import type { FiberRoute, Installation, SpliceClosure } from "./types";

const DEFAULT_CENTER: LatLng = { lat: 44.4268, lng: 26.1025 };

type PickMode = "path" | "client" | "end";

const PICK_LABEL: Record<PickMode, string> = {
  path: "Punct traseu",
  client: "Locație client",
  end: "Manșon / capăt cablu",
};

export function RouteTab({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const installationId = installation.id;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [mode, setMode] = useState<PickMode>("path");
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const { data: routes } = useQuery({
    queryKey: ["fiber_routes", installationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiber_routes")
        .select("*")
        .eq("installation_id", installationId)
        .order("created_at");
      if (error) throw error;
      return data as FiberRoute[];
    },
  });

  const { data: closures } = useQuery({
    queryKey: ["splice_closures", installationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("splice_closures")
        .select("*")
        .eq("installation_id", installationId)
        .order("created_at");
      if (error) throw error;
      return data as SpliceClosure[];
    },
  });

  const active = routes?.find((r) => r.id === activeId) ?? null;

  const bboxKey = bounds
    ? [
        bounds.north.toFixed(2),
        bounds.south.toFixed(2),
        bounds.east.toFixed(2),
        bounds.west.toFixed(2),
      ].join(",")
    : null;
  const bboxSmall =
    bounds != null &&
    bounds.north - bounds.south < 0.6 &&
    Math.abs(bounds.east - bounds.west) < 0.6;

  const { data: optixSites } = useQuery({
    queryKey: ["optix_sites", bboxKey],
    enabled: Boolean(bounds) && bboxSmall,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const b = bounds!;
      const { data, error } = await supabase
        .from("optix_sites")
        .select("id, name, latitude, longitude, description")
        .gte("latitude", b.south)
        .lte("latitude", b.north)
        .gte("longitude", Math.min(b.west, b.east))
        .lte("longitude", Math.max(b.west, b.east))
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!activeId && routes?.length) setActiveId(routes[0]!.id);
  }, [routes, activeId]);

  useEffect(() => {
    if (active) setDraft(isLatLngArray(active.path) ? active.path : []);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const center = useMemo<LatLng>(() => {
    if (draft.length) return draft[0]!;
    if (installation.latitude != null && installation.longitude != null)
      return { lat: installation.latitude, lng: installation.longitude };
    return DEFAULT_CENTER;
  }, [installation.latitude, installation.longitude, draft.length ? draft[0] : null]); // eslint-disable-line react-hooks/exhaustive-deps

  const markers: MapMarker[] = [
    ...(optixSites ?? []).map((s) => ({
      id: `optix-${s.id}`,
      kind: "optix" as const,
      label: `${s.name}${s.description ? ` — ${s.description}` : ""}`,
      position: { lat: s.latitude, lng: s.longitude },
    })),
    ...(installation.latitude != null && installation.longitude != null
      ? [
          {
            id: "site",
            kind: "site" as const,
            label: installation.client_name,
            position: { lat: installation.latitude, lng: installation.longitude },
          },
        ]
      : []),
    ...(active?.from_latitude != null && active.from_longitude != null
      ? [
          {
            id: "route-from",
            kind: "client" as const,
            label: `${active.label} — locație client`,
            position: { lat: active.from_latitude, lng: active.from_longitude },
          },
        ]
      : []),
    ...(active?.to_latitude != null && active.to_longitude != null
      ? [
          {
            id: "route-to",
            kind: "end" as const,
            label: `${active.label} — manșon / capăt cablu`,
            position: { lat: active.to_latitude, lng: active.to_longitude },
          },
        ]
      : []),
    ...(closures ?? [])
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        kind: "closure" as const,
        label: c.name,
        position: { lat: c.latitude!, lng: c.longitude! },
      })),
  ];

  const createRoute = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("fiber_routes")
        .insert({
          installation_id: installationId,
          label: newLabel || `Cablu ${(routes?.length ?? 0) + 1}`,
          path: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as FiberRoute;
    },
    onSuccess: (r) => {
      setNewLabel("");
      setActiveId(r.id);
      setDraft([]);
      qc.invalidateQueries({ queryKey: ["fiber_routes", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveRoute = useMutation({
    mutationFn: async (patch: Partial<FiberRoute>) => {
      if (!active) return;
      const { error } = await supabase
        .from("fiber_routes")
        .update({ ...patch, path: draft, length_m: pathLength(draft) })
        .eq("id", active.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Traseu salvat");
      qc.invalidateQueries({ queryKey: ["fiber_routes", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setEndpoint = useMutation({
    mutationFn: async ({ which, p }: { which: "client" | "end"; p: LatLng }) => {
      if (!active) throw new Error("Selectează întâi un cablu");
      const patch =
        which === "client"
          ? { from_latitude: p.lat, from_longitude: p.lng }
          : { to_latitude: p.lat, to_longitude: p.lng };
      const { error } = await supabase.from("fiber_routes").update(patch).eq("id", active.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(
        v.which === "client" ? "Locația clientului salvată" : "Locația manșonului salvată",
      );
      qc.invalidateQueries({ queryKey: ["fiber_routes", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fiber_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveId(null);
      setDraft([]);
      qc.invalidateQueries({ queryKey: ["fiber_routes", installationId] });
    },
  });

  const setSiteLocation = useMutation({
    mutationFn: async (p: LatLng) => {
      const { error } = await supabase
        .from("installations")
        .update({ latitude: p.lat, longitude: p.lng })
        .eq("id", installationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locația sediului client actualizată");
      qc.invalidateQueries({ queryKey: ["installation", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("GPS indisponibil");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setSiteLocation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Nu am putut citi poziția GPS"),
      { enableHighAccuracy: true },
    );
  }

  function handleMapClick(p: LatLng) {
    if (mode === "path") {
      setDraft((d) => [...d, p]);
      return;
    }
    if (!active) {
      toast.error("Selectează întâi un cablu");
      return;
    }
    setEndpoint.mutate({ which: mode === "client" ? "client" : "end", p });
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Trasee de cablu"
        description="Alege un cablu, apoi atinge harta pentru a desena traseul"
        action={
          <Button size="sm" variant="secondary" onClick={useMyLocation}>
            <Crosshair className="size-4" /> GPS
          </Button>
        }
      >
        <div className="mb-3 flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Denumire cablu nou (ex. ODF → Manșon A)"
          />
          <Button onClick={() => createRoute.mutate()} disabled={createRoute.isPending}>
            <Plus className="size-4" />
          </Button>
        </div>

        {routes?.length ? (
          <div className="flex flex-wrap gap-2">
            {routes.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  r.id === activeId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Niciun cablu încă — adaugă unul mai sus.</p>
        )}
      </SectionCard>

      <div className="rounded-2xl bg-card p-3 shadow-card">
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(PICK_LABEL) as PickMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === m ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {PICK_LABEL[m]}
            </button>
          ))}
        </div>
        <MapCanvas
          center={center}
          path={draft}
          markers={markers}
          className="h-[55vh] w-full"
          onViewportChange={setBounds}
          onMapClick={handleMapClick}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Punctele mov sunt site-urile Optix din zona vizibilă pe hartă.
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Ruler className="size-4 text-primary" />
            {pathLength(draft)} m
            <span className="font-normal text-muted-foreground">
              · {draft.length} punct{draft.length === 1 ? "" : "e"}
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft((d) => d.slice(0, -1))}
              disabled={!draft.length}
            >
              <Undo2 className="size-4" /> Înapoi
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft([])}
              disabled={!draft.length}
            >
              Șterge tot
            </Button>
          </div>
        </div>
      </div>

      {active ? (
        <SectionCard
          title={active.label}
          description="Detalii cablu"
          action={
            <Button
              size="icon"
              variant="ghost"
              aria-label="Șterge cablul"
              onClick={() => deleteRoute.mutate(active.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          }
        >
          <EndpointRow
            route={active}
            onGps={(which) => {
              if (!navigator.geolocation) {
                toast.error("GPS indisponibil");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  setEndpoint.mutate({
                    which,
                    p: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                  }),
                () => toast.error("Nu am putut citi poziția GPS"),
                { enableHighAccuracy: true },
              );
            }}
          />
          <RouteDetails
            key={active.id}
            route={active}
            onSave={(patch) => saveRoute.mutate(patch)}
            saving={saveRoute.isPending}
          />
        </SectionCard>
      ) : (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <MapPin className="size-4" /> Selectează sau creează un cablu pentru a începe desenul.
        </p>
      )}
    </div>
  );
}

function coord(lat: number | null, lng: number | null) {
  return lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "nesetată";
}

function EndpointRow({
  route,
  onGps,
}: {
  route: FiberRoute;
  onGps: (which: "client" | "end") => void;
}) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      {(
        [
          ["client", "Locație client", route.from_latitude, route.from_longitude],
          ["end", "Manșon / capăt cablu", route.to_latitude, route.to_longitude],
        ] as const
      ).map(([which, label, lat, lng]) => (
        <div key={which} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{coord(lat, lng)}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onGps(which)}>
            <Crosshair className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function RouteDetails({
  route,
  onSave,
  saving,
}: {
  route: FiberRoute;
  onSave: (patch: Partial<FiberRoute>) => void;
  saving: boolean;
}) {
  const [label, setLabel] = useState(route.label);
  const [cableType, setCableType] = useState(route.cable_type ?? "");
  const [fiberCount, setFiberCount] = useState(route.fiber_count?.toString() ?? "");
  const [method, setMethod] = useState(route.installation_method ?? "");
  const [notes, setNotes] = useState(route.notes ?? "");
  const [fromPoint, setFromPoint] = useState(route.from_point ?? "");
  const [toPoint, setToPoint] = useState(route.to_point ?? "");
  const [segments, setSegments] = useState<RouteSegment[]>(parseSegments(route.segments));

  const segmentTotal = segments.reduce((s, x) => s + (Number(x.length_m) || 0), 0);

  return (
    <div className="space-y-3">
      <Field label="Denumire">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="De la" hint="Cod manșon / ODF">
          <Input
            value={fromPoint}
            onChange={(e) => setFromPoint(e.target.value)}
            placeholder="JU29738"
          />
        </Field>
        <Field label="Până la">
          <Input
            value={toPoint}
            onChange={(e) => setToPoint(e.target.value)}
            placeholder="locatia clientului"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tip cablu">
          <Input
            value={cableType}
            onChange={(e) => setCableType(e.target.value)}
            placeholder="ADSS / drop / armat"
          />
        </Field>
        <Field label="Nr. fibre">
          <Input
            type="number"
            inputMode="numeric"
            value={fiberCount}
            onChange={(e) => setFiberCount(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Mod de instalare">
        <Input
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          placeholder="Aerian / canalizație / fațadă / subteran"
        />
      </Field>

      <Field
        label="Defalcare lungimi"
        hint={`Folosită în raport și în deviz · ${Math.round(segmentTotal)} m pe ${segments.length} tronson${segments.length === 1 ? "" : "e"}`}
      >
        <div className="space-y-2">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex gap-2">
              <Select
                value={String(seg.method)}
                onValueChange={(v) =>
                  setSegments((s) => s.map((x, i) => (i === idx ? { ...x, method: v } : x)))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Mod" />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                inputMode="numeric"
                className="w-24"
                value={seg.length_m || ""}
                onChange={(e) =>
                  setSegments((s) =>
                    s.map((x, i) => (i === idx ? { ...x, length_m: Number(e.target.value) || 0 } : x)),
                  )
                }
                placeholder="m"
                aria-label="Lungime tronson în metri"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Șterge tronsonul"
                onClick={() => setSegments((s) => s.filter((_, i) => i !== idx))}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() =>
              setSegments((s) => [...s, { method: SEGMENT_METHODS[0]!.value, length_m: 0 }])
            }
          >
            <Plus className="size-4" /> Adaugă tronson
          </Button>
        </div>
      </Field>

      <Field label="Observații">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button
        className="w-full"
        disabled={saving}
        onClick={() =>
          onSave({
            label,
            cable_type: cableType,
            fiber_count: fiberCount === "" ? null : Number(fiberCount),
            installation_method: method,
            notes,
            from_point: fromPoint,
            to_point: toPoint,
            segments: segments.filter((s) => s.length_m > 0),
          })
        }
      >
        Salvează cablul și traseul
      </Button>
    </div>
  );
}
