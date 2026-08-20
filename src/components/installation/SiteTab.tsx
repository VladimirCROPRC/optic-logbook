import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SectionCard } from "./Field";
import type { Installation } from "./types";

export function SiteTab({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_name: installation.client_name,
    contact_person: installation.contact_person ?? "",
    contact_phone: installation.contact_phone ?? "",
    address: installation.address ?? "",
    work_order: installation.work_order ?? "",
    service_package: installation.service_package ?? "",
    site_name: installation.site_name ?? "",
    odf_name: installation.odf_name ?? "",
    odf_port: installation.odf_port ?? "",
    patch_cord_type: installation.patch_cord_type ?? "",
    switch_name: installation.switch_name ?? "",
    switch_port: installation.switch_port ?? "",
    vlan: installation.vlan ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("installations")
        .update(form)
        .eq("id", installation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Site details saved");
      qc.invalidateQueries({ queryKey: ["installation", installation.id] });
      qc.invalidateQueries({ queryKey: ["installations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Client & work order">
        <div className="space-y-3">
          <Field label="Client">
            <Input {...bind("client_name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person">
              <Input {...bind("contact_person")} />
            </Field>
            <Field label="Phone">
              <Input type="tel" {...bind("contact_phone")} />
            </Field>
          </div>
          <Field label="Address">
            <Input {...bind("address")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Work order">
              <Input {...bind("work_order")} />
            </Field>
            <Field label="Service package">
              <Input {...bind("service_package")} placeholder="1 Gbps symmetric" />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="POP / site termination" description="Where the fiber lands on our side">
        <div className="space-y-3">
          <Field label="Site / POP name">
            <Input {...bind("site_name")} placeholder="POP Nord" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ODF name">
              <Input {...bind("odf_name")} placeholder="ODF-02" />
            </Field>
            <Field label="ODF port">
              <Input {...bind("odf_port")} placeholder="1/14" />
            </Field>
          </div>
          <Field label="Patch cord type">
            <Input {...bind("patch_cord_type")} placeholder="LC/UPC - SC/APC 3 m" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Switch name">
              <Input {...bind("switch_name")} placeholder="SW-AGG-01" />
            </Field>
            <Field label="Switch port">
              <Input {...bind("switch_port")} placeholder="Gi1/0/22" />
            </Field>
          </div>
          <Field label="VLAN">
            <Input {...bind("vlan")} placeholder="812" />
          </Field>
        </div>
      </SectionCard>

      <Button size="lg" className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        Save site details
      </Button>
    </div>
  );
}