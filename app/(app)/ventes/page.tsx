import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/periods";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PeriodFilter } from "@/components/ui/filters";
import { Input } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Ventes" };
const PAGE_SIZE = 40;

export default async function SalesPage({ searchParams }: PageProps<"/ventes">) {
  const user = await requirePage("sales.create", "sales.view_all", "returns.manage");
  const sp = await searchParams;
  const period = resolvePeriod({ period: (sp.period as string) ?? "7d", from: sp.from as string, to: sp.to as string });
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("sales")
    .select("id, sale_number, created_at, total, amount_paid, balance_due, status, discount_amount, customers(first_name, last_name), profiles:cashier_id(full_name), returns(id)")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (q) query = query.ilike("sale_number", `%${q.replace(/[%,()]/g, "")}%`);
  else query = query.gte("created_at", period.from).lt("created_at", period.to);
  const { data } = await query;
  type Row = {
    id: string; sale_number: string; created_at: string; total: number; amount_paid: number; balance_due: number; status: string;
    customers: { first_name: string; last_name: string | null } | null; profiles: { full_name: string } | null; returns: { id: string }[];
  };
  let rows = (data ?? []) as unknown as Row[];
  const hasNext = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);
  const completed = rows.filter((r) => r.status === "completed");

  return (
    <>
      <PageHeader
        title="Ventes"
        description={can(user.permissions, "sales.view_all") ? "Historique de toutes les ventes." : "Historique de vos ventes."}
      />
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
          <PeriodFilter basePath="/ventes" period={period} />
          <form action="/ventes" className="flex gap-2" role="search">
            <label htmlFor="q" className="sr-only">Numéro de vente</label>
            <Input id="q" name="q" defaultValue={q} placeholder="N° de ticket (V…)" className="h-9 w-44" />
            <button className={buttonClass("secondary", "sm", "h-9")}>Retrouver</button>
          </form>
        </div>
        {!q ? (
          <p className="border-b border-sand px-4 py-2.5 text-sm text-muted">
            {period.label} : {completed.length} vente(s) affichée(s) · <Money value={completed.reduce((s, r) => s + r.total, 0)} />
          </p>
        ) : null}
        {rows.length === 0 ? (
          <EmptyState title="Aucune vente" description={q ? "Aucun ticket ne correspond à ce numéro." : "Aucune vente sur cette période."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ticket</Th>
                <Th className="hidden md:table-cell">Client</Th>
                <Th className="hidden lg:table-cell">Caissier</Th>
                <Th align="right">Total</Th>
                <Th>État</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link href={`/ventes/${s.id}`} className="font-medium tabular hover:underline">{s.sale_number}</Link>
                    <span className="block text-xs text-muted">{formatDateTime(s.created_at)}</span>
                  </Td>
                  <Td className="hidden md:table-cell">{s.customers ? [s.customers.first_name, s.customers.last_name].filter(Boolean).join(" ") : <span className="text-muted">Passage</span>}</Td>
                  <Td className="hidden text-muted lg:table-cell">{s.profiles?.full_name}</Td>
                  <Td align="right" className={s.status === "cancelled" ? "text-muted line-through" : undefined}><Money value={s.total} /></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {s.status === "cancelled" ? <Badge tone="danger">Annulée</Badge> : s.balance_due > 0 ? <Badge tone="warning">Crédit</Badge> : <Badge tone="success">Payée</Badge>}
                      {s.returns?.length ? <Badge>Retour</Badge> : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination basePath="/ventes" page={page} hasNext={hasNext} params={{ q, period: period.key, from: period.fromDate, to: period.toDate }} />
      </Panel>
    </>
  );
}
