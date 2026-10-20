import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/periods";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/ui/filters";
import { BarList, DayColumns } from "@/components/ui/bar-list";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Tableau de bord" };

type Summary = {
  gross_sales: number; returns_value: number; net_sales: number; sales_count: number; average_basket: number; discounts: number;
  credit_granted: number; cogs: number; gross_margin: number; expenses: number; estimated_profit: number; cash_received: number;
  refunds_paid: number; net_collections: number; stock_value: number; low_stock_count: number; out_of_stock_count: number;
  receivables: number; payables: number;
};

export default async function DashboardPage({ searchParams }: PageProps<"/tableau-de-bord">) {
  const user = await requirePage("dashboard.view");
  const sp = await searchParams;
  const period = resolvePeriod({ period: (sp.period as string) ?? "today", from: sp.from as string, to: sp.to as string });
  const today = resolvePeriod({ period: "today" });
  const month = resolvePeriod({ period: "month" });
  const supabase = await createClient();
  const args = { p_from: period.from, p_to: period.to };
  const [s, d, m, top, methods, daily, recent] = await Promise.all([
    supabase.rpc("report_summary", args),
    supabase.rpc("report_summary", { p_from: today.from, p_to: today.to }),
    supabase.rpc("report_summary", { p_from: month.from, p_to: month.to }),
    supabase.rpc("report_top_products", { ...args, p_limit: 6 }),
    supabase.rpc("report_payments_by_method", args),
    supabase.rpc("report_sales_by_day", args),
    supabase.from("sales").select("id, sale_number, created_at, total, status, balance_due, customers(first_name)").order("created_at", { ascending: false }).limit(8),
  ]);
  if (s.error) {
    return <EmptyState title="Indicateurs indisponibles" description="Le chargement a échoué. Vérifiez la connexion puis rechargez la page." />;
  }
  const sum = s.data as Summary;
  const dayS = d.data as Summary;
  const monthS = m.data as Summary;
  const showReports = can(user.permissions, "reports.view");

  return (
    <>
      <PageHeader title="Tableau de bord" description={`Bonjour ${user.fullName.split(" ")[0]}. Chiffres calculés en direct depuis les ventes enregistrées.`} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires du jour" value={<Money value={dayS.net_sales} />} hint={`${dayS.sales_count} vente(s)`} href="/ventes?period=today" />
        <Stat label="Chiffre d'affaires du mois" value={<Money value={monthS.net_sales} />} hint={`${monthS.sales_count} vente(s)`} href="/ventes?period=month" />
        <Stat label="Stock faible" value={sum.low_stock_count} tone={sum.low_stock_count ? "warning" : undefined} href="/produits?filtre=faible" />
        <Stat label="Ruptures" value={sum.out_of_stock_count} tone={sum.out_of_stock_count ? "danger" : undefined} href="/produits?filtre=rupture" />
      </div>

      <div className="mb-4"><PeriodFilter basePath="/tableau-de-bord" period={period} /></div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Chiffre d'affaires net" value={<Money value={sum.net_sales} />} hint={sum.returns_value ? <>dont retours −<Money value={sum.returns_value} /></> : "Remises déduites"} />
        <Stat label="Ventes" value={sum.sales_count} hint={<>Panier moyen <Money value={sum.average_basket} /></>} />
        <Stat label="Encaissements nets" value={<Money value={sum.net_collections} />} hint={sum.credit_granted ? <>Crédit accordé <Money value={sum.credit_granted} /></> : "Paiements reçus − remboursés"} />
        <Stat label="Coût des marchandises" value={<Money value={sum.cogs} />} />
        <Stat label="Marge brute" value={<Money value={sum.gross_margin} />} hint={sum.net_sales > 0 ? `${Math.round((sum.gross_margin * 1000) / sum.net_sales) / 10} %` : undefined} />
        <Stat label="Dépenses" value={<Money value={sum.expenses} />} hint={<>Bénéfice estimé <Money value={sum.estimated_profit} /></>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Ventes par jour" description={period.label} />
          <DayColumns days={((daily.data ?? []) as { day: string; gross_sales: number }[]).map((x) => ({ day: x.day, value: Number(x.gross_sales) }))} />
        </Panel>
        <Panel>
          <PanelHeader title="Répartition des paiements" description="Montants nets reçus" />
          <BarList items={((methods.data ?? []) as { method: string; net: number }[]).map((x) => ({ label: PAYMENT_LABELS[x.method] ?? x.method, value: Number(x.net) }))} emptyLabel="Aucun paiement." />
        </Panel>
        <Panel>
          <PanelHeader title="Meilleures ventes" description="En quantité, retours déduits" />
          <BarList items={((top.data ?? []) as { product_name: string; variant_label: string; quantity: number; net_sales: number }[]).map((x) => ({ label: `${x.product_name} — ${x.variant_label}`, value: Number(x.net_sales), hint: `${x.quantity} vendu(s)` }))} emptyLabel="Aucune vente." />
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelHeader title="Dernières ventes" actions={<Link href="/ventes" className="text-sm text-muted hover:text-ink">Toutes les ventes</Link>} />
          <ul className="divide-y divide-sand text-sm">
            {((recent.data ?? []) as unknown as { id: string; sale_number: string; created_at: string; total: number; status: string; balance_due: number; customers: { first_name: string } | null }[]).map((r) => (
              <li key={r.id}>
                <Link href={`/ventes/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-ivory/60">
                  <span><span className="font-medium tabular">{r.sale_number}</span><span className="block text-xs text-muted">{formatDateTime(r.created_at)}{r.customers ? ` · ${r.customers.first_name}` : ""}</span></span>
                  <span className="flex items-center gap-2">
                    {r.status === "cancelled" ? <Badge tone="danger">Annulée</Badge> : r.balance_due > 0 ? <Badge tone="warning">Crédit</Badge> : null}
                    <Money value={r.total} className={r.status === "cancelled" ? "text-muted line-through" : "font-medium"} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Valeur du stock (coût d'achat)" value={<Money value={sum.stock_value} />} href={showReports ? "/rapports?onglet=stock" : undefined} />
        <Stat label="Créances clients" value={<Money value={sum.receivables} />} href="/clients?filtre=creances" />
        <Stat label="Dettes fournisseurs" value={<Money value={sum.payables} />} href={can(user.permissions, "suppliers.manage") ? "/fournisseurs" : undefined} />
      </div>
      <p className="mt-6 max-w-prose text-xs text-muted">
        Le bénéfice estimé (marge brute − dépenses saisies) n&apos;est pas un résultat comptable : il ignore notamment les amortissements, la variation de stock valorisée au coût réel, les taxes et les charges non saisies. Détails : docs/CALCULS.md.
      </p>
    </>
  );
}
