import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Loader2, Search, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "./Field";
import type { Installation } from "./types";
import {
  itemKey,
  money,
  suggestQuantities,
  type DevizItem,
  type DevizLine,
  type JobBundle,
} from "@/lib/deviz";
import {
  buildAcceptanceDocx,
  buildDevizXlsx,
  buildReportSections,
  devizFileName,
  reportFileName,
} from "@/lib/docgen";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function DocumentsTab({ installation }: { installation: Installation }) {
  const qc = useQueryClient();
  const id = installation.id;
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<"docx" | "xlsx" | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-bundle", id],
    queryFn: async (): Promise<JobBundle> => {
      const [routes, closures, speedTests] = await Promise.all([
        supabase.from("fiber_routes").select("*").eq("installation_id", id).order("created_at"),
        supabase.from("splice_closures").select("*").eq("installation_id", id).order("created_at"),
        supabase.from("speed_tests").select("*").eq("installation_id", id).order("tested_at"),
      ]);
      if (routes.error) throw routes.error;
      if (closures.error) throw closures.error;
      if (speedTests.error) throw speedTests.error;
      const closureIds = (closures.data ?? []).map((c) => c.id);
      const splices = closureIds.length
        ? await supabase.from("splices").select("*").in("closure_id", closureIds)
        : { data: [], error: null };
      if (splices.error) throw splices.error;
      return {
        installation,
        routes: routes.data ?? [],
        closures: closures.data ?? [],
        splices: splices.data ?? [],
        speedTests: speedTests.data ?? [],
      };
    },
  });

  const { data: items } = useQuery({
    queryKey: ["deviz_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deviz_items")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as DevizItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: lines } = useQuery({
    queryKey: ["deviz_lines", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deviz_lines").select("*").eq("installation_id", id);
      if (error) throw error;
      return data as DevizLine[];
    },
  });

  const qtyByItem = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of lines ?? []) map[l.item_id] = Number(l.quantity);
    return map;
  }, [lines]);

  const upsert = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from("deviz_lines")
          .delete()
          .eq("installation_id", id)
          .eq("item_id", itemId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("deviz_lines")
        .upsert(
          { installation_id: id, item_id: itemId, quantity, auto_suggested: false },
          { onConflict: "installation_id,item_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deviz_lines", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const autofill = useMutation({
    mutationFn: async () => {
      if (!job || !items) return 0;
      const suggestions = suggestQuantities(job);
      const rows = items
        .filter((it) => suggestions[itemKey(it)] != null)
        .map((it) => ({
          installation_id: id,
          item_id: it.id,
          quantity: suggestions[itemKey(it)]!,
          auto_suggested: true,
        }));
      if (!rows.length) return 0;
      const { error } = await supabase
        .from("deviz_lines")
        .upsert(rows, { onConflict: "installation_id,item_id" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["deviz_lines", id] });
      toast.success(n ? `${n} lines pre-filled from job data` : "Nothing to suggest yet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportLines = useMemo(
    () =>
      (items ?? [])
        .filter((it) => (qtyByItem[it.id] ?? 0) > 0)
        .map((it) => ({ item: it, quantity: qtyByItem[it.id]! })),
    [items, qtyByItem],
  );

  const grandTotal = exportLines.reduce(
    (s, l) => s + money(Number(l.item.unit_price_eur) * l.quantity),
    0,
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((it) => {
      if (q) return it.name_ro.toLowerCase().includes(q);
      if (showAll) return true;
      return (qtyByItem[it.id] ?? 0) > 0;
    });
  }, [items, search, showAll, qtyByItem]);

  const preview = job ? buildReportSections(job) : null;

  async function exportDocx() {
    if (!job) return;
    setBusy("docx");
    try {
      download(await buildAcceptanceDocx(job), reportFileName(job));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function exportXlsx() {
    if (!job) return;
    if (!exportLines.length) {
      toast.error("Add at least one deviz line first");
      return;
    }
    setBusy("xlsx");
    try {
      download(await buildDevizXlsx(job, exportLines), devizFileName(job));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !items) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Generate documents" description="Built from everything captured on this job">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={exportDocx} disabled={busy !== null}>
            {busy === "docx" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Raport acceptanta (.docx)
          </Button>
          <Button variant="secondary" onClick={exportXlsx} disabled={busy !== null}>
            {busy === "xlsx" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Deviz final (.xlsx)
          </Button>
        </div>
      </SectionCard>

      {preview ? (
        <SectionCard title="Report preview" description="Auto-generated text, in Romanian">
          <div className="space-y-3 text-sm">
            {(
              [
                ["Site", preview.site],
                ["Traseu", preview.traseu],
                ["Client", preview.client],
                ["Teste de viteza", preview.teste],
              ] as const
            )
              .filter(([, rows]) => rows.length)
              .map(([title, rows]) => (
                <div key={title}>
                  <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {title}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {rows.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Deviz lines"
        description={`${exportLines.length} line${exportLines.length === 1 ? "" : "s"} · ${grandTotal.toFixed(2)} € without VAT`}
        action={
          <Button size="sm" variant="secondary" onClick={() => autofill.mutate()} disabled={autofill.isPending}>
            <Sparkles className="size-4" /> Auto-fill
          </Button>
        }
      >
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the price catalog…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Used only" : "Show all"}
          </Button>
        </div>

        {visibleItems.length ? (
          <ul className="divide-y divide-border">
            {visibleItems.map((it) => (
              <DevizRow
                key={it.id}
                item={it}
                quantity={qtyByItem[it.id] ?? 0}
                onCommit={(q) => upsert.mutate({ itemId: it.id, quantity: q })}
              />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No lines yet — tap Auto-fill or search the catalog.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

function DevizRow({
  item,
  quantity,
  onCommit,
}: {
  item: DevizItem;
  quantity: number;
  onCommit: (q: number) => void;
}) {
  const [value, setValue] = useState(quantity ? String(quantity) : "");
  const price = Number(item.unit_price_eur);
  const qty = Number(value) || 0;

  return (
    <li className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="text-muted-foreground">{item.item_no}.</span> {item.name_ro}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.um ?? "—"} · {price.toFixed(2)} €
          {qty > 0 ? ` · total ${money(price * qty).toFixed(2)} €` : ""}
        </p>
      </div>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = Number(value) || 0;
          if (next !== quantity) onCommit(next);
        }}
        className="w-20 shrink-0 text-right"
        aria-label={`Quantity for ${item.name_ro}`}
      />
    </li>
  );
}