import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CPE_MODELS, INSTALL_STATUSES, STATUS_LABEL } from "@/lib/fiber";
import { Field, SectionCard } from "./Field";
import type { Installation } from "./types";

export function ClientOpsTab({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(installation);

  function set<K extends keyof Installation>(key: K, value: Installation[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("installations")
        .update({
          status: form.status,
          cpe_model: form.cpe_model,
          cpe_serial: form.cpe_serial,
          cpe_mac: form.cpe_mac,
          sfp_installed: form.sfp_installed,
          sfp_model: form.sfp_model,
          sfp_serial: form.sfp_serial,
          sfp_wavelength: form.sfp_wavelength,
          media_converter_installed: form.media_converter_installed,
          media_converter_model: form.media_converter_model,
          media_converter_serial: form.media_converter_serial,
          terminal_box_installed: form.terminal_box_installed,
          terminal_box_type: form.terminal_box_type,
          terminal_box_ports: form.terminal_box_ports,
          rx_power_dbm: form.rx_power_dbm,
          tx_power_dbm: form.tx_power_dbm,
          notes: form.notes,
        })
        .eq("id", installation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client operations saved");
      qc.invalidateQueries({ queryKey: ["installation", installation.id] });
      qc.invalidateQueries({ queryKey: ["installations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const customCpe = Boolean(form.cpe_model) && !CPE_MODELS.includes(form.cpe_model ?? "");

  return (
    <div className="space-y-4">
      <SectionCard title="Job status">
        <Select value={form.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INSTALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      <SectionCard title="CPE" description="Customer premises equipment delivered on site">
        <div className="space-y-3">
          <Field label="Model">
            <Select
              value={customCpe ? "Other / custom" : (form.cpe_model ?? "")}
              onValueChange={(v) => set("cpe_model", v === "Other / custom" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select CPE" />
              </SelectTrigger>
              <SelectContent>
                {CPE_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {customCpe || form.cpe_model === "" ? (
            <Field label="Custom model">
              <Input
                value={form.cpe_model ?? ""}
                onChange={(e) => set("cpe_model", e.target.value)}
                placeholder="Type the exact model"
              />
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial number">
              <Input
                value={form.cpe_serial ?? ""}
                onChange={(e) => set("cpe_serial", e.target.value)}
              />
            </Field>
            <Field label="MAC address">
              <Input
                value={form.cpe_mac ?? ""}
                onChange={(e) => set("cpe_mac", e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="SFP module">
        <ToggleRow
          label="SFP installed"
          checked={form.sfp_installed}
          onChange={(v) => set("sfp_installed", v)}
        />
        {form.sfp_installed ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model">
                <Input
                  value={form.sfp_model ?? ""}
                  onChange={(e) => set("sfp_model", e.target.value)}
                  placeholder="SFP+ 10G LR"
                />
              </Field>
              <Field label="Serial">
                <Input
                  value={form.sfp_serial ?? ""}
                  onChange={(e) => set("sfp_serial", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Wavelength / type">
              <Input
                value={form.sfp_wavelength ?? ""}
                onChange={(e) => set("sfp_wavelength", e.target.value)}
                placeholder="1310 nm / BiDi 1490-1550"
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Media converter">
        <ToggleRow
          label="Media converter installed"
          checked={form.media_converter_installed}
          onChange={(v) => set("media_converter_installed", v)}
        />
        {form.media_converter_installed ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Model">
              <Input
                value={form.media_converter_model ?? ""}
                onChange={(e) => set("media_converter_model", e.target.value)}
              />
            </Field>
            <Field label="Serial">
              <Input
                value={form.media_converter_serial ?? ""}
                onChange={(e) => set("media_converter_serial", e.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Terminal box (ONT/ETB)">
        <ToggleRow
          label="Terminal box installed"
          checked={form.terminal_box_installed}
          onChange={(v) => set("terminal_box_installed", v)}
        />
        {form.terminal_box_installed ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Type">
              <Input
                value={form.terminal_box_type ?? ""}
                onChange={(e) => set("terminal_box_type", e.target.value)}
                placeholder="Wall box SC/APC"
              />
            </Field>
            <Field label="Ports">
              <Input
                type="number"
                inputMode="numeric"
                value={form.terminal_box_ports ?? ""}
                onChange={(e) =>
                  set("terminal_box_ports", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Optical power" description="Measured at the client termination">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rx power (dBm)">
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.rx_power_dbm ?? ""}
              onChange={(e) =>
                set("rx_power_dbm", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Tx power (dBm)">
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.tx_power_dbm ?? ""}
              onChange={(e) =>
                set("tx_power_dbm", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Site notes">
        <Textarea
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything the next technician should know"
        />
      </SectionCard>

      <Button
        size="lg"
        className="w-full"
        onClick={() => save.mutate()}
        disabled={save.isPending}
      >
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
        Save client operations
      </Button>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}