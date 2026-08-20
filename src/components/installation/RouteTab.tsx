import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crosshair, MapPin, Plus, Ruler, Trash2, Undo2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapCanvas, type MapMarker } from "@/components/map/MapCanvas";
import { isLatLngArray, pathLength, type LatLng } from "@/lib/fiber";
import { Field, SectionCard } from "./Field";
import type { FiberRoute, Installation, SpliceClosure } from "./types";

const DEFAULT_CENTER: LatLng = { lat: 44.4268, lng: 26.1025 };

export function RouteTab({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const installationId = installation.id;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [newLabel, setNewLabel] = useState("");

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
          label: newLabel || `Cable ${(routes?.length ?? 0) + 1}`,
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
      toast.success("Cable route saved");
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
      toast.success("Client location updated");
      qc.invalidateQueries({ queryKey: ["installation", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setSiteLocation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Could not read GPS position"),
      { enableHighAccuracy: true },
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Cable routes"
        description="Pick a cable, then tap the map to draw its path"
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
            placeholder="New cable label (e.g. ODF → Closure A)"
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
          <p className="text-sm text-muted-foreground">No cables yet — add one above.</p>
        )}
      </SectionCard>

      <div className="rounded-2xl bg-card p-3 shadow-card">
        <MapCanvas
          center={center}
          path={draft}
          markers={markers}
          className="h-[55vh] w-full"
          onMapClick={
            active ? (p) => setDraft((d) => [...d, p]) : undefined
          }
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Ruler className="size-4 text-primary" />
            {pathLength(draft)} m
            <span className="font-normal text-muted-foreground">
              · {draft.length} point{draft.length === 1 ? "" : "s"}
            </span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft((d) => d.slice(0, -1))}
              disabled={!draft.length}
            >
              <Undo2 className="size-4" /> Undo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft([])}
              disabled={!draft.length}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {active ? (
        <SectionCard
          title={active.label}
          description="Cable details"
          action={
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete cable"
              onClick={() => deleteRoute.mutate(active.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          }
        >
          <RouteDetails
            key={active.id}
            route={active}
            onSave={(patch) => saveRoute.mutate(patch)}
            saving={saveRoute.isPending}
          />
        </SectionCard>
      ) : (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <MapPin className="size-4" /> Select or create a cable to start drawing.
        </p>
      )}
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

  return (
    <div className="space-y-3">
      <Field label="Label">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cable type">
          <Input
            value={cableType}
            onChange={(e) => setCableType(e.target.value)}
            placeholder="ADSS / drop / armored"
          />
        </Field>
        <Field label="Fibers">
          <Input
            type="number"
            inputMode="numeric"
            value={fiberCount}
            onChange={(e) => setFiberCount(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Installation method">
        <Input
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          placeholder="Aerial / duct / facade / trench"
        />
      </Field>
      <Field label="Notes">
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
          })
        }
      >
        Save cable & path
      </Button>
    </div>
  );
}