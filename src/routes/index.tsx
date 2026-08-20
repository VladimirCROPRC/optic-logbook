import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plus, Router as RouterIcon, Search } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABEL, type InstallStatus } from "@/lib/fiber";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Installations — FiberDoc" },
      {
        name: "description",
        content:
          "All your B2B fiber optic installation jobs: equipment, speed tests, cable routes and splice records in one field app.",
      },
      { property: "og:title", content: "Installations — FiberDoc" },
      {
        property: "og:description",
        content: "Your B2B fiber optic installation jobs, documented on site.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

const statusTone: Record<InstallStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/20 text-accent-foreground",
  completed: "bg-success/15 text-success",
  blocked: "bg-destructive/15 text-destructive",
};

function Dashboard() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["installations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installations")
        .select("id, client_name, site_name, address, status, service_package, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((i) =>
    `${i.client_name} ${i.site_name ?? ""} ${i.address ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Installations" subtitle="B2B fiber optic jobs">
      <div className="relative mb-4">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search client, site or address"
          className="bg-card pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
          <RouterIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No installations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first job to start documenting equipment, routes and splices.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inst) => (
            <li key={inst.id}>
              <Link
                to="/installations/$id"
                params={{ id: inst.id }}
                className="block rounded-xl bg-card p-4 shadow-card transition-transform active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{inst.client_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {inst.site_name || "Unnamed site"}
                    </p>
                  </div>
                  <Badge
                    className={`shrink-0 border-0 ${statusTone[(inst.status as InstallStatus) ?? "draft"]}`}
                  >
                    {STATUS_LABEL[(inst.status as InstallStatus) ?? "draft"]}
                  </Badge>
                </div>
                {inst.address ? (
                  <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" /> {inst.address}
                  </p>
                ) : null}
                {inst.service_package ? (
                  <p className="mt-1 text-xs font-medium text-primary">{inst.service_package}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button
        asChild
        size="lg"
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 rounded-full shadow-card"
      >
        <Link to="/installations/new">
          <Plus className="size-5" /> New job
        </Link>
      </Button>
    </AppShell>
  );
}
