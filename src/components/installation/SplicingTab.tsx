import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Crosshair, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIBER_COLORS } from "@/lib/fiber";
import { Field, SectionCard } from "./Field";
import type { Splice, SpliceClosure } from "./types";

export function SplicingTab({ installationId }: { installationId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

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

  const addClosure = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("splice_closures").insert({
        installation_id: installationId,
        name: name || `Closure ${(closures?.length ?? 0) + 1}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["splice_closures", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Splice closures" description="Every closure on the route">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Closure name (e.g. CL-01 pole 14)"
          />
          <Button onClick={() => addClosure.mutate()} disabled={addClosure.isPending}>
            <Plus className="size-4" />
          </Button>
        </div>
      </SectionCard>

      {closures?.length ? (
        closures.map((c) => (
          <ClosureCard
            key={c.id}
            closure={c}
            installationId={installationId}
            open={openId === c.id}
            onToggle={() => setOpenId(openId === c.id ? null : c.id)}
          />
        ))
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No closures documented yet.
        </p>
      )}
    </div>
  );
}

function ClosureCard({
  closure,
  installationId,
  open,
  onToggle,
}: {
  closure: SpliceClosure;
  installationId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: closure.name,
    closure_type: closure.closure_type ?? "",
    location_note: closure.location_note ?? "",
    latitude: closure.latitude?.toString() ?? "",
    longitude: closure.longitude?.toString() ?? "",
  });

  const { data: splices } = useQuery({
    queryKey: ["splices", closure.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("splices")
        .select("*")
        .eq("closure_id", closure.id)
        .order("position_no", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Splice[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["splice_closures", installationId] });
    qc.invalidateQueries({ queryKey: ["splices", closure.id] });
  };

  const saveClosure = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("splice_closures")
        .update({
          name: form.name,
          closure_type: form.closure_type,
          location_note: form.location_note,
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
        })
        .eq("id", closure.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Closure saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClosure = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("splice_closures").delete().eq("id", closure.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addSplice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("splices").insert({
        closure_id: closure.id,
        position_no: (splices?.length ?? 0) + 1,
        in_tube_color: FIBER_COLORS[0]!,
        in_fiber_color: FIBER_COLORS[0]!,
        out_tube_color: FIBER_COLORS[0]!,
        out_fiber_color: FIBER_COLORS[0]!,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSplice = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Splice> }) => {
      const { error } = await supabase.from("splices").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["splices", closure.id] }),
  });

  const deleteSplice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("splices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["splices", closure.id] }),
  });

  function gps() {
    if (!navigator.geolocation) {
      toast.error("Geolocation unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        })),
      () => toast.error("Could not read GPS position"),
      { enableHighAccuracy: true },
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="font-semibold">{closure.name}</p>
          <p className="text-xs text-muted-foreground">
            {closure.closure_type || "No type set"}
            {closure.latitude != null ? " · located" : " · no GPS"}
          </p>
        </div>
        <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="space-y-4 border-t p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Type">
              <Input
                value={form.closure_type}
                onChange={(e) => setForm({ ...form, closure_type: e.target.value })}
                placeholder="Dome / inline 24F"
              />
            </Field>
          </div>
          <Field label="Location note">
            <Input
              value={form.location_note}
              onChange={(e) => setForm({ ...form, location_note: e.target.value })}
              placeholder="Pole 14, manhole MH-3, basement riser"
            />
          </Field>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <Field label="Latitude">
              <Input
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </Field>
            <Field label="Longitude">
              <Input
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </Field>
            <Button variant="secondary" onClick={gps} aria-label="Use GPS">
              <Crosshair className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => saveClosure.mutate()}
              disabled={saveClosure.isPending}
            >
              Save closure
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete closure"
              onClick={() => deleteClosure.mutate()}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold">Splices ({splices?.length ?? 0})</h3>
            <Button size="sm" variant="secondary" onClick={() => addSplice.mutate()}>
              <Plus className="size-4" /> Splice
            </Button>
          </div>

          <div className="space-y-3">
            {splices?.map((s) => (
              <div key={s.id} className="rounded-xl bg-muted/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">#{s.position_no ?? "-"}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete splice"
                    onClick={() => deleteSplice.mutate(s.id)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ColorSelect
                    label="In tube"
                    value={s.in_tube_color}
                    onChange={(v) => updateSplice.mutate({ id: s.id, patch: { in_tube_color: v } })}
                  />
                  <ColorSelect
                    label="In fiber"
                    value={s.in_fiber_color}
                    onChange={(v) => updateSplice.mutate({ id: s.id, patch: { in_fiber_color: v } })}
                  />
                  <ColorSelect
                    label="Out tube"
                    value={s.out_tube_color}
                    onChange={(v) => updateSplice.mutate({ id: s.id, patch: { out_tube_color: v } })}
                  />
                  <ColorSelect
                    label="Out fiber"
                    value={s.out_fiber_color}
                    onChange={(v) =>
                      updateSplice.mutate({ id: s.id, patch: { out_fiber_color: v } })
                    }
                  />
                  <Field label="Tray">
                    <Input
                      defaultValue={s.tray ?? ""}
                      onBlur={(e) =>
                        updateSplice.mutate({ id: s.id, patch: { tray: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Loss (dB)">
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      defaultValue={s.loss_db ?? ""}
                      onBlur={(e) =>
                        updateSplice.mutate({
                          id: s.id,
                          patch: { loss_db: e.target.value === "" ? null : Number(e.target.value) },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ColorSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Color" />
        </SelectTrigger>
        <SelectContent>
          {FIBER_COLORS.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}