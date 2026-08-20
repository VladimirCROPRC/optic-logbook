import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Gauge, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, SectionCard } from "./Field";
import type { SpeedTest } from "./types";

const empty = {
  service_name: "",
  download_mbps: "",
  upload_mbps: "",
  latency_ms: "",
  jitter_ms: "",
  packet_loss_pct: "",
  notes: "",
  passed: true,
};

export function SpeedTestTab({
  installationId,
  servicePackage,
}: {
  installationId: string;
  servicePackage: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty, service_name: servicePackage ?? "" });
  const [open, setOpen] = useState(false);

  const { data: tests } = useQuery({
    queryKey: ["speed_tests", installationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_tests")
        .select("*")
        .eq("installation_id", installationId)
        .order("tested_at", { ascending: false });
      if (error) throw error;
      return data as SpeedTest[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const num = (v: string) => (v === "" ? null : Number(v));
      const { error } = await supabase.from("speed_tests").insert({
        installation_id: installationId,
        service_name: form.service_name || "Service",
        download_mbps: num(form.download_mbps),
        upload_mbps: num(form.upload_mbps),
        latency_ms: num(form.latency_ms),
        jitter_ms: num(form.jitter_ms),
        packet_loss_pct: num(form.packet_loss_pct),
        passed: form.passed,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Speed test recorded");
      setForm({ ...empty, service_name: servicePackage ?? "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["speed_tests", installationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("speed_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["speed_tests", installationId] }),
  });

  return (
    <div className="space-y-4">
      <SectionCard
        title="Speed tests"
        description="One record per installed service"
        action={
          <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen(!open)}>
            <Plus className="size-4" /> Add
          </Button>
        }
      >
        {open ? (
          <div className="mb-4 space-y-3 rounded-xl border border-dashed p-3">
            <Field label="Service">
              <Input
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                placeholder="Internet 1 Gbps / VPN L2 / IPTV"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Download (Mbps)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.download_mbps}
                  onChange={(e) => setForm({ ...form, download_mbps: e.target.value })}
                />
              </Field>
              <Field label="Upload (Mbps)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.upload_mbps}
                  onChange={(e) => setForm({ ...form, upload_mbps: e.target.value })}
                />
              </Field>
              <Field label="Latency (ms)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.latency_ms}
                  onChange={(e) => setForm({ ...form, latency_ms: e.target.value })}
                />
              </Field>
              <Field label="Jitter (ms)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.jitter_ms}
                  onChange={(e) => setForm({ ...form, jitter_ms: e.target.value })}
                />
              </Field>
              <Field label="Packet loss (%)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.packet_loss_pct}
                  onChange={(e) => setForm({ ...form, packet_loss_pct: e.target.value })}
                />
              </Field>
              <Field label="Result">
                <label className="flex h-9 items-center justify-between gap-2 rounded-md bg-muted/60 px-3">
                  <span className="text-sm">{form.passed ? "Pass" : "Fail"}</span>
                  <Switch
                    checked={form.passed}
                    onCheckedChange={(v) => setForm({ ...form, passed: v })}
                  />
                </label>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Tested with iPerf3 to core, laptop on port 1"
              />
            </Field>
            <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
              Save test
            </Button>
          </div>
        ) : null}

        {!tests?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No speed tests recorded yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {tests.map((t) => (
              <li key={t.id} className="rounded-xl bg-muted/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.tested_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {t.passed ? "Pass" : "Fail"}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete test"
                      onClick={() => remove.mutate(t.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <Metric icon={<ArrowDown className="size-3.5" />} value={t.download_mbps} unit="Mbps" />
                  <Metric icon={<ArrowUp className="size-3.5" />} value={t.upload_mbps} unit="Mbps" />
                  <Metric icon={<Gauge className="size-3.5" />} value={t.latency_ms} unit="ms" />
                </div>
                {t.notes ? <p className="mt-2 text-xs text-muted-foreground">{t.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function Metric({
  icon,
  value,
  unit,
}: {
  icon: React.ReactNode;
  value: number | null;
  unit: string;
}) {
  if (value === null) return null;
  return (
    <span className="inline-flex items-center gap-1 font-medium text-primary">
      {icon}
      {value}
      <span className="text-xs text-muted-foreground">{unit}</span>
    </span>
  );
}