import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyOpenSession } from "@/lib/data/sale";
import { resolvePeriod } from "@/lib/periods";
import { EXPENSE_LABELS, formatDate, PAYMENT_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFilter } from "@/components/ui/filters";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ExpenseForm } from "./expense-form";
import { voidExpense } from "@/lib/actions/cash";

export const metadata: Metadata = { title: "Dépenses" };

export default async function ExpensesPage({ searchParams }: PageProps<"/depenses">) {
  const user = await requirePage("expenses.manage");
  const sp = await searchParams;
  const period = resolvePeriod({ period: (sp.period as string) ?? "month", from: sp.from as string, to: sp.to as string });
  const category = typeof sp.categorie === "string" ? sp.categorie : "";
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("id, category, amount, expense_date, method, comment, cash_session_id, voided_at, void_reason, profiles:created_by(full_name)")
    .gte("expense_date", period.fromDate)
    .lte("expense_date", period.toDate)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (category) query = query.eq("category", category);
  const [{ data }, session] = await Promise.all([query, getMyOpenSession(user.id)]);
  const rows = (data ?? []) as unknown as { id: string; category: string; amount: number; expense_date: string; method: string; comment: string | null; cash_session_id: string | null; voided_at: string | null; void_reason: string | null; profiles: { full_name: string } | null }[];
  const active = rows.filter((r) => !r.voided_at);
  const byCategory = Object.entries(active.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + r.amount }), {})).sort((a, b) => b[1] - a[1]);
  const total = active.reduce((s, r) => s + r.amount, 0);
  return (
    <>
      <PageHeader title="Dépenses" description={<>{period.label} : <Money value={total} className="font-medium text-ink" /></>} />
      <div className="mb-4"><PeriodFilter basePath="/depenses" period={period} extra={category ? { categorie: category } : {}} /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {byCategory.length ? (
            <Panel>
              <PanelHeader title="Par catégorie" />
              <ul className="grid gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-2">
                {byCategory.map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3"><a href={`/depenses?period=${period.key}&from=${period.fromDate}&to=${period.toDate}&categorie=${k}`} className="hover:underline">{EXPENSE_LABELS[k]}</a><Money value={v} /></li>
                ))}
              </ul>
            </Panel>
          ) : null}
          <Panel>
            <PanelHeader title={category ? `Dépenses : ${EXPENSE_LABELS[category]}` : "Historique"} actions={category ? <a href="/depenses" className="text-sm text-muted hover:text-ink">Toutes catégories</a> : null} />
            {rows.length === 0 ? <EmptyState title="Aucune dépense" description="Aucune dépense sur cette période." /> : (
              <Table>
                <thead><tr><Th>Date</Th><Th>Catégorie</Th><Th>Moyen</Th><Th align="right">Montant</Th><Th className="w-0"><span className="sr-only">Actions</span></Th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.id} className={r.voided_at ? "opacity-60" : undefined}>
                      <Td className="whitespace-nowrap text-muted">{formatDate(r.expense_date)}</Td>
                      <Td>{EXPENSE_LABELS[r.category]}<span className="block text-xs text-muted">{[r.comment, r.profiles?.full_name].filter(Boolean).join(" — ")}</span>{r.voided_at ? <span className="block text-xs text-danger">Annulée : {r.void_reason}</span> : null}</Td>
                      <Td>{PAYMENT_LABELS[r.method]}{r.cash_session_id ? <Badge className="ml-2">Caisse</Badge> : null}</Td>
                      <Td align="right" className={r.voided_at ? "line-through" : undefined}><Money value={r.amount} /></Td>
                      <Td>{!r.voided_at ? <ConfirmAction action={voidExpense} hidden={{ id: r.id }} trigger="Annuler" triggerVariant="ghost" title="Annuler cette dépense ?" description={r.cash_session_id ? "Le montant sera remis dans la caisse (si elle est encore ouverte)." : undefined} reason={{ label: "Motif", required: true }} confirmLabel="Annuler la dépense" /> : null}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>
        <Panel className="h-fit">
          <PanelHeader title="Nouvelle dépense" />
          <ExpenseForm sessionId={session?.id ?? null} />
        </Panel>
      </div>
    </>
  );
}
