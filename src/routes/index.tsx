import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Plus,
  Router as RouterIcon,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useState, useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABEL, type InstallStatus, INSTALL_STATUSES } from "@/lib/fiber";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instalări fibră optică — Proconect" },
      {
        name: "description",
        content:
          "Toate lucrările de instalare fibră optică B2B: echipamente, trasee de cablu și sudurile din manșoane, într-o singură aplicație de teren.",
      },
      { property: "og:title", content: "Instalări fibră optică — Proconect" },
      {
        property: "og:description",
        content: "Lucrările tale de instalare fibră optică B2B, documentate pe teren.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const statusIcon: Record<InstallStatus, React.ReactNode> = {
  draft: <FileText className="size-4" />,
  in_progress: <Clock className="size-4" />,
  completed: <CheckCircle2 className="size-4" />,
  blocked: <AlertCircle className="size-4" />,
};

interface Installation {
  id: string;
  client_name: string;
  site_name: string | null;
  address: string | null;
  status: string;
  service_package: string | null;
  updated_at: string;
}

function StatCard({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-4 text-left transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-lg"
          : "bg-card hover:bg-card/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium opacity-75`}>{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-lg bg-current/10 p-2.5 text-current">{icon}</div>
      </div>
    </button>
  );
}

function Dashboard() {
  const [q, setQ] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<InstallStatus | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "alphabetical">("recent");

  const { data, isLoading } = useQuery({
    queryKey: ["installations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installations")
        .select("id, client_name, site_name, address, status, service_package, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Installation[];
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      draft: all.filter((i) => i.status === "draft").length,
      in_progress: all.filter((i) => i.status === "in_progress").length,
      completed: all.filter((i) => i.status === "completed").length,
      blocked: all.filter((i) => i.status === "blocked").length,
    };
  }, [data]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = (data ?? []).filter((i) => {
      const matchesSearch = `${i.client_name} ${i.site_name ?? ""} ${i.address ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase());
      const matchesStatus = !selectedStatus || i.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });

    if (sortBy === "alphabetical") {
      result = result.sort((a, b) => a.client_name.localeCompare(b.client_name));
    }

    return result;
  }, [data, q, selectedStatus, sortBy]);

  return (
    <AppShell title="Instalări" subtitle="Lucrări fibră optică B2B">
      {/* Stats Grid */}
      {!isLoading && data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<FileText className="size-4" />}
            label="Total"
            value={stats.total}
            active={selectedStatus === null}
            onClick={() => {
              setSelectedStatus(null);
              setQ("");
            }}
          />
          <StatCard
            icon={statusIcon.draft}
            label="Ciornă"
            value={stats.draft}
            active={selectedStatus === "draft"}
            onClick={() => {
              setSelectedStatus("draft");
              setQ("");
            }}
          />
          <StatCard
            icon={statusIcon.in_progress}
            label="În lucru"
            value={stats.in_progress}
            active={selectedStatus === "in_progress"}
            onClick={() => {
              setSelectedStatus("in_progress");
              setQ("");
            }}
          />
          <StatCard
            icon={statusIcon.completed}
            label="Finalizat"
            value={stats.completed}
            active={selectedStatus === "completed"}
            onClick={() => {
              setSelectedStatus("completed");
              setQ("");
            }}
          />
        </div>
      )}

      {/* Search and Sort */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută client, site sau adresă"
            className="bg-card pl-9"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("recent")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              sortBy === "recent"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Recente
          </button>
          <button
            onClick={() => setSortBy("alphabetical")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              sortBy === "alphabetical"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Alfabetic
          </button>
        </div>
      </div>

      {/* Installations List */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
          <RouterIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">
            {data && data.length > 0 ? "Nicio instalare cu aceste criterii" : "Nicio instalare încă"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data && data.length > 0
              ? "Încearcă să schimbi filtrul sau căutarea."
              : "Creează prima lucrare ca să documentezi echipamentele, traseele și sudurile."}
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            {filtered.length} instalare{filtered.length !== 1 ? "i" : ""}
          </p>
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
                        {inst.site_name || "Site fără nume"}
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
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    Modificat {formatRelativeTime(inst.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        asChild
        size="lg"
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 rounded-full shadow-card"
      >
        <Link to="/installations/new">
          <Plus className="size-5" /> Lucrare nouă
        </Link>
      </Button>
    </AppShell>
  );
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "acum";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `acum ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `acum ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ieri";
  if (days < 7) return `acum ${days}z`;
  
  return date.toLocaleDateString("ro-RO", {
    month: "short",
    day: "numeric",
  });
}
