import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StartInventoryForm } from "./start-form";

export const metadata: Metadata = { title: "Inventaires" };

export default async function InventoriesPage() {
  await requirePage("stock.manage");
  const supabase = await createClient();
  const [{ data }, { data: categories }] = await Promise.all([
    supabase.from("inventories").select("id, name, status, started_at, validated_at, categories(name), profiles:started_by(full_name)").order("started_at", { ascending: false }),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  const rows = (data ?? []) as unknown as { id: string; name: string; status: string; started_at: string; validated_at: string | null; categories: { name: string } | null; profiles: { full_name: string } | null }[];
  return (
    <>
      <PageHeader title="Inventaires physiques" back={{ href: "/stock", label: "Stock" }} description="Le stock théorique est figé au démarrage ; à la validation, seul l'écart compté est appliqué, sans effacer l'historique." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel>
          {rows.length === 0 ? <EmptyState title="Aucun inventaire" /> : (
            <Table>
              <thead><tr><Th>Inventaire</Th><Th>Périmètre</Th><Th>État</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td><Link href={`/stock/inventaires/${r.id}`} className="font-medium hover:underline">{r.name}</Link><span className="block text-xs text-muted">{formatDateTime(r.started_at)} · {r.profiles?.full_name}</span></Td>
                    <Td className="text-muted">{r.categories?.name ?? "Tout le catalogue"}</Td>
                    <Td><Badge tone={r.status === "validated" ? "success" : r.status === "cancelled" ? "neutral" : "warning"}>{r.status === "validated" ? "Validé" : r.status === "cancelled" ? "Abandonné" : "En cours"}</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel className="h-fit">
          <PanelHeader title="Démarrer un inventaire" />
          <StartInventoryForm categories={categories ?? []} />
        </Panel>
      </div>
    </>
  );
}
