import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/installations/new")({
  head: () => ({
    meta: [
      { title: "New installation — FiberDoc" },
      {
        name: "description",
        content: "Open a new B2B fiber optic installation job record for a client site.",
      },
      { property: "og:title", content: "New installation — FiberDoc" },
      { property: "og:description", content: "Start documenting a new fiber installation." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <NewInstallation />
    </RequireAuth>
  ),
});

function NewInstallation() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    site_name: "",
    address: "",
    contact_person: "",
    contact_phone: "",
    service_package: "",
    work_order: "",
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      toast.error("Session expired, please sign in again.");
      return;
    }
    const { data, error } = await supabase
      .from("installations")
      .insert({ ...form, user_id: auth.user.id, status: "in_progress" })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create the job.");
      return;
    }
    toast.success("Installation created");
    navigate({ to: "/installations/$id", params: { id: data.id }, replace: true });
  }

  return (
    <AppShell title="New installation" subtitle="Client & site details" showBack>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
        <Field label="Client / company" required>
          <Input
            required
            value={form.client_name}
            onChange={(e) => set("client_name", e.target.value)}
            placeholder="Acme Logistics SRL"
          />
        </Field>
        <Field label="Site name">
          <Input
            value={form.site_name}
            onChange={(e) => set("site_name", e.target.value)}
            placeholder="HQ / Warehouse 2"
          />
        </Field>
        <Field label="Address">
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Str. Exemplu 12, Bucharest"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact person">
            <Input
              value={form.contact_person}
              onChange={(e) => set("contact_person", e.target.value)}
            />
          </Field>
          <Field label="Contact phone">
            <Input
              type="tel"
              inputMode="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Service package">
            <Input
              value={form.service_package}
              onChange={(e) => set("service_package", e.target.value)}
              placeholder="1 Gbps symmetric"
            />
          </Field>
          <Field label="Work order">
            <Input value={form.work_order} onChange={(e) => set("work_order", e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Access details, keys, contact windows…"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Create installation
        </Button>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}