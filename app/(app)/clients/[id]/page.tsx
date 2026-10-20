import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMyOpenSession } from "@/lib/data/sale";
import { formatDate, formatDateTime, PAYMENT_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditPaymentForm, CustomerDialog } from "@/components/forms/entity-forms";

export const metadata: Metadata = { title: "Fiche client" };

export default async function CustomerPage({ params }: PageProps<"/clients/[id]">) {
  const user = await requirePage("customers.view");
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) notFound();
  const [{ data: sales }, { data: payments }, session] = await Promise.all([
    supabase.from("sales").select("id, sale_number, created_at, total, balance_due, status, refunds(amount)").eq("customer_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("payments").select("id, amount, method, kind, created_at, sale_id, sales(sale_number)").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    getMyOpenSession(user.id),
  ]);
  const list = (sales ?? []) as { id: string; sale_number: string; created_at: string; total: number; balance_due: number; status: string; refunds: { amount: number }[] }[];
  const completed = list.filter((s) => s.status === "completed");
  const totalPurchases = completed.reduce((s, x) => s + x.total, 0);
  const totalRefunded = completed.reduce((s, x) => s + x.refunds.reduce((a, r) => a + r.amount, 0), 0);
  const due = completed.reduce((s, x) => s + x.balance_due, 0);
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ");

  return (
    <>
      <PageHeader
        title={name}
        back={{ href: "/clients", label: "Clients" }}
        description={[customer.phone, customer.email, `Client depuis le ${formatDate(customer.created_at)}`].filter(Boolean).join(" · ")}
        actions={can(user.permissions, "customers.manage") ? <CustomerDialog customer={customer} /> : null}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total des achats" value={<Money value={totalPurchases} />} hint={`${completed.length} vente(s)`} />
        <Stat label="Remboursements" value={<Money value={totalRefunded} />} />
        <Stat label="Reste à payer" value={<Money value={due} />} tone={due > 0 ? "warning" : undefined} />
        <Stat label="Avoir disponible" value={<Money value={customer.store_credit} />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title="Historique des achats" />
            {list.length === 0 ? (
              <EmptyState title="Aucun achat" />
            ) : (
              <Table>
                <thead><tr><Th>Ticket</Th><Th align="right">Total</Th><Th align="right">Reste dû</Th><Th>État</Th></tr></thead>
                <tbody>
                  {list.map((s) => (
                    <Tr key={s.id}>
                      <Td><Link href={`/ventes/${s.id}`} className="font-medium tabular hover:underline">{s.sale_number}</Link><span className="block text-xs text-muted">{formatDateTime(s.created_at)}</span></Td>
                      <Td align="right"><Money value={s.total} /></Td>
                      <Td align="right">{s.balance_due ? <Money value={s.balance_due} className="text-warning" /> : "—"}</Td>
                      <Td>{s.status === "cancelled" ? <Badge tone="danger">Annulée</Badge> : s.refunds.length ? <Badge>Retour</Badge> : <Badge tone="success">Validée</Badge>}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Paiements reçus" />
            {(payments ?? []).length === 0 ? (
              <EmptyState title="Aucun paiement" />
            ) : (
              <Table>
                <thead><tr><Th>Date</Th><Th>Moyen</Th><Th>Vente</Th><Th align="right">Montant</Th></tr></thead>
                <tbody>
                  {(payments ?? []).map((p) => (
                    <Tr key={p.id}>
                      <Td className="text-muted">{formatDateTime(p.created_at)}</Td>
                      <Td>{PAYMENT_LABELS[p.method]}{p.kind === "credit_settlement" ? <Badge className="ml-2" tone="gold">Créance</Badge> : null}</Td>
                      <Td className="tabular">{(p.sales as unknown as { sale_number: string } | null)?.sale_number}</Td>
                      <Td align="right"><Money value={p.amount} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          {due > 0 && can(user.permissions, "sales.create") ? (
            <Panel>
              <PanelHeader title="Régler la créance" description="Le montant est imputé aux ventes les plus anciennes." />
              <CreditPaymentForm customerId={id} sessionId={session?.id ?? null} maxAmount={due} />
            </Panel>
          ) : null}
          {customer.notes ? (
            <Panel>
              <PanelHeader title="Notes" />
              <p className="p-5 text-sm whitespace-pre-line">{customer.notes}</p>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
