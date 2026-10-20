import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, PURCHASE_STATUS_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/filters";

export const metadata: Metadata = { title: "Achats" };
const PAGE_SIZE = 40;

export default async function PurchasesPage({ searchParams }: PageProps<"/achats">) {
  await requirePage("purchases.manage");
  const sp = await searchParams;
  const status = typeof sp.statut === "string" ? sp.statut : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("purchases")
    .select("id, purchase_number, order_date, status, ordered_total, received_total, amount_paid, supplier_reference, suppliers(name)")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (status === "a-recevoir") query = query.in("status", ["ordered", "partially_received"]);
  else if (status) query = query.eq("status", status);
  const { data } = await query;
  let rows = (data ?? []) as unknown as { id: string; purchase_number: string; order_date: string; status: string; ordered_total: number; received_total: number; amount_paid: number; supplier_reference: string | null; suppliers: { name: string } }[];
  const hasNext = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);
  const tabs = [["", "Toutes"], ["a-recevoir", "À recevoir"], ["received", "Reçues"], ["cancelled", "Annulées"]];
  return (
    <>
      <PageHeader title="Achats" description="Commandes fournisseurs, réceptions de marchandises et règlements." actions={<LinkButton href="/achats/nouveau"><Plus aria-hidden /> Nouvelle commande</LinkButton>} />
      <Panel>
        <nav className="flex gap-1 border-b border-sand p-3" aria-label="Statut">
          {tabs.map(([key, label]) => (
            <Link key={key} href={key ? `/achats?statut=${key}` : "/achats"} aria-current={status === key ? "page" : undefined} className={`rounded px-3 py-1.5 text-sm ${status === key ? "bg-ink text-ivory" : "hover:bg-sand/60"}`}>
              {label}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? <EmptyState title="Aucune commande" description="Créez une commande fournisseur pour préparer une réception." /> : (
          <Table>
            <thead><tr><Th>Commande</Th><Th>Fournisseur</Th><Th>État</Th><Th align="right">Commandé</Th><Th align="right">Reçu</Th><Th align="right">Reste à régler</Th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <Tr key={p.id}>
                  <Td><Link href={`/achats/${p.id}`} className="font-medium tabular hover:underline">{p.purchase_number}</Link><span className="block text-xs text-muted">{formatDate(p.order_date)}</span></Td>
                  <Td>{p.suppliers?.name}{p.supplier_reference ? <span className="block text-xs text-muted">{p.supplier_reference}</span> : null}</Td>
                  <Td><Badge tone={p.status === "received" ? "success" : p.status === "cancelled" ? "danger" : "warning"}>{PURCHASE_STATUS_LABELS[p.status]}</Badge></Td>
                  <Td align="right"><Money value={p.ordered_total} /></Td>
                  <Td align="right"><Money value={p.received_total} /></Td>
                  <Td align="right">{p.status === "cancelled" ? "—" : <Money value={Math.max(0, p.received_total - p.amount_paid)} />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination basePath="/achats" page={page} hasNext={hasNext} params={{ statut: status }} />
      </Panel>
    </>
  );
}
