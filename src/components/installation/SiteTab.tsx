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
      toast.success("Detalii site salvate");
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
      <SectionCard title="Client și comandă de lucru">
        <div className="space-y-3">
          <Field label="Client">
            <Input {...bind("client_name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Persoană de contact">
              <Input {...bind("contact_person")} />
            </Field>
            <Field label="Telefon">
              <Input type="tel" {...bind("contact_phone")} />
            </Field>
          </div>
          <Field label="Adresă">
            <Input {...bind("address")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Comandă de lucru">
              <Input {...bind("work_order")} />
            </Field>
            <Field label="Pachet servicii">
              <Input {...bind("service_package")} placeholder="1 Gbps simetric" />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="POP / terminare în site" description="Unde ajunge fibra la noi în site">
        <div className="space-y-3">
          <Field label="Denumire site / POP">
            <Input {...bind("site_name")} placeholder="POP Nord" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Denumire ODF">
              <Input {...bind("odf_name")} placeholder="ODF-02" />
            </Field>
            <Field label="Port ODF">
              <Input {...bind("odf_port")} placeholder="1/14" />
            </Field>
          </div>
          <Field label="Tip patch cord">
            <Input {...bind("patch_cord_type")} placeholder="LC/UPC - SC/APC 3 m" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Denumire switch">
              <Input {...bind("switch_name")} placeholder="SW-AGG-01" />
            </Field>
            <Field label="Port switch">
              <Input {...bind("switch_port")} placeholder="Gi1/0/22" />
            </Field>
          </div>
        </div>
      </SectionCard>

      <Button size="lg" className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        Salvează detaliile site-ului
      </Button>
    </div>
  );
}
