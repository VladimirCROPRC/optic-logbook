import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientOpsTab } from "@/components/installation/ClientOpsTab";
import { RouteTab } from "@/components/installation/RouteTab";
import { SplicingTab } from "@/components/installation/SplicingTab";
import { SiteTab } from "@/components/installation/SiteTab";
import { DocumentsTab } from "@/components/installation/DocumentsTab";
import type { Installation } from "@/components/installation/types";
import { STATUS_LABEL, type InstallStatus } from "@/lib/fiber";

export const Route = createFileRoute("/installations/$id")({
  head: () => ({
    meta: [
      { title: "Lucrare de instalare — Proconect" },
      {
        name: "description",
        content:
          "Documentează CPE, SFP, media convertor, cutie terminală, traseul de cablu și sudurile pentru o instalare de fibră optică B2B.",
      },
      { property: "og:title", content: "Lucrare de instalare — Proconect" },
      {
        property: "og:description",
        content: "Documentație de teren pentru o instalare de fibră optică B2B.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstallationDetailPage,
});

function InstallationDetailPage() {
  return (
    <RequireAuth>
      <InstallationDetail />
    </RequireAuth>
  );
}

function InstallationDetail() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["installation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Installation | null;
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Se încarcă…" showBack>
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Negăsit" showBack>
        <p className="py-16 text-center text-sm text-muted-foreground">
          Această instalare nu există sau nu ai acces la ea.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={data.client_name}
      subtitle={`${data.work_order ? `CL ${data.work_order} · ` : ""}${
        STATUS_LABEL[data.status as InstallStatus] ?? data.status
      }`}
      showBack
    >
      <Tabs defaultValue="client" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-5">
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="route">Traseu</TabsTrigger>
          <TabsTrigger value="splice">Suduri</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="client">
          <ClientOpsTab key={data.updated_at} installation={data} />
        </TabsContent>
        <TabsContent value="route">
          <RouteTab installation={data} />
        </TabsContent>
        <TabsContent value="splice">
          <SplicingTab installationId={data.id} />
        </TabsContent>
        <TabsContent value="site">
          <SiteTab key={data.updated_at} installation={data} />
        </TabsContent>
        <TabsContent value="docs">
          <DocumentsTab key={data.updated_at} installation={data} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
