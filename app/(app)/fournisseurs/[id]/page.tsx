import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMyOpenSession } from "@/lib/data/sale";
import { formatDate, PAYMENT_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { SupplierDialog, SupplierPaymentForm } from "@/components/forms/entity-forms";

export const metadata: Metadata = { title: "Fiche fournisseur" };

export default async function SupplierPage({ params }: PageProps<"/fournisseurs/[id]">) {
  const user = await requirePage("suppliers.manage", "purchases.manage");
  const { id } = await params;
  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle();
  if (!supplier) notFound();
  const [{ data: purchases }, { data: payments }, session] = await Promise.all([
    supabase.from("purchases").select("id, purchase_number, order_date, status, ordered_total, received_total, amount_paid, supplier_reference").eq("supplier_id", id).order("created_at", { ascending: false }),
    supabase.from("supplier_payments").select("id, amount, method, reference, paid_at, purchases(purchase_number)").eq("supplier_id", id).order("paid_at", { ascending: false }),
    getMyOpenSession(user.id),
  ]);
  const active = (purchases ?? []).filter((p) => p.status !== "cancelled");
  const received = active.reduce((s, p) => s + p.received_total, 0);
  const paid = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const manage = can(user.permissions, "suppliers.manage");
  return (
    <>
      <PageHeader
        title={supplier.name}
        back={{ href: "/fournisseurs", label: "Fournisseurs" }}
        description={[supplier.contact_name, supplier.phone, supplier.email, supplier.address].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            {can(user.permissions, "purchases.manage") ? <LinkButton href={`/achats/nouveau?fournisseur=${id}`} variant="secondary">Nouvelle commande</LinkButton> : null}
            {manage ? <SupplierDialog supplier={supplier} /> : null}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Marchandises reçues" value={<Money value={received} />} />
        <Stat label="Réglé" value={<Money value={paid} />} />
        <Stat label="Solde dû" value={<Money value={received - paid} />} tone={received - paid > 0 ? "warning" : undefined} hint={received - paid < 0 ? "Avance versée au fournisseur" : undefined} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title="Commandes" />
            {(purchases ?? []).length === 0 ? <EmptyState title="Aucune commande" /> : (
              <Table>
                <thead><tr><Th>Commande</Th><Th>État</Th><Th align="right">Commandé</Th><Th align="right">Reçu</Th><Th align="right">Réglé</Th></tr></thead>
                <tbody>
                  {(purchases ?? []).map((p) => (
                    <Tr key={p.id}>
                      <Td><Link href={`/achats/${p.id}`} className="font-medium tabular hover:underline">{p.purchase_number}</Link><span className="block text-xs text-muted">{formatDate(p.order_date)}{p.supplier_reference ? ` · ${p.supplier_reference}` : ""}</span></Td>
                      <Td><Badge tone={p.status === "received" ? "success" : p.status === "cancelled" ? "danger" : "warning"}>{PURCHASE_STATUS_LABELS[p.status]}</Badge></Td>
                      <Td align="right"><Money value={p.ordered_total} /></Td>
                      <Td align="right"><Money value={p.received_total} /></Td>
                      <Td align="right"><Money value={p.amount_paid} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Règlements" />
            {(payments ?? []).length === 0 ? <EmptyState title="Aucun règlement" /> : (
              <Table>
                <thead><tr><Th>Date</Th><Th>Moyen</Th><Th>Commande</Th><Th align="right">Montant</Th></tr></thead>
                <tbody>
                  {(payments ?? []).map((p) => (
                    <Tr key={p.id}>
                      <Td className="text-muted">{formatDate(p.paid_at)}</Td>
                      <Td>{PAYMENT_LABELS[p.method]}{p.reference ? <span className="block text-xs text-muted">{p.reference}</span> : null}</Td>
                      <Td className="tabular">{(p.purchases as unknown as { purchase_number: string } | null)?.purchase_number ?? "Acompte général"}</Td>
                      <Td align="right"><Money value={p.amount} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>
        {manage ? (
          <Panel className="h-fit">
            <PanelHeader title="Enregistrer un règlement" description="Règlement général (non rattaché à une commande)." />
            <SupplierPaymentForm supplierId={id} sessionId={session?.id ?? null} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
