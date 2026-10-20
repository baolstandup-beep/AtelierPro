import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMyOpenSession } from "@/lib/data/sale";
import { formatDate, formatDateTime, PAYMENT_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SupplierPaymentForm } from "@/components/forms/entity-forms";
import { ReceiveForm } from "./receive-form";
import { cancelPurchase } from "@/lib/actions/purchases";

export const metadata: Metadata = { title: "Commande fournisseur" };

export default async function PurchasePage({ params }: PageProps<"/achats/[id]">) {
  const user = await requirePage("purchases.manage");
  const { id } = await params;
  const supabase = await createClient();
  const { data: purchase } = await supabase
    .from("purchases")
    .select("*, suppliers(id, name), items:purchase_items(id, quantity_ordered, quantity_received, unit_cost, variant:product_variants(label, products(name))), receipts:purchase_receipts(id, received_at, total_cost, notes, profiles(full_name)), payments:supplier_payments(id, amount, method, paid_at, reference)")
    .eq("id", id)
    .maybeSingle();
  if (!purchase) notFound();
  const session = await getMyOpenSession(user.id);
  type Item = { id: string; quantity_ordered: number; quantity_received: number; unit_cost: number; variant: { label: string; products: { name: string } } };
  const items = purchase.items as Item[];
  const open = purchase.status === "ordered" || purchase.status === "partially_received";
  const remainingToPay = Math.max(purchase.ordered_total, purchase.received_total) - purchase.amount_paid;

  return (
    <>
      <PageHeader
        title={`Commande ${purchase.purchase_number}`}
        back={{ href: "/achats", label: "Achats" }}
        description={<><Link href={`/fournisseurs/${purchase.suppliers.id}`} className="underline-offset-4 hover:underline">{purchase.suppliers.name}</Link> · {formatDate(purchase.order_date)}{purchase.supplier_reference ? ` · Réf. ${purchase.supplier_reference}` : ""}</>}
        actions={
          purchase.status === "ordered" && purchase.received_total === 0 && purchase.amount_paid === 0 ? (
            <ConfirmAction action={cancelPurchase} hidden={{ id }} trigger="Annuler la commande" title="Annuler cette commande ?" reason={{ label: "Motif", required: true }} confirmLabel="Annuler la commande" />
          ) : null
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={purchase.status === "received" ? "success" : purchase.status === "cancelled" ? "danger" : "warning"}>{PURCHASE_STATUS_LABELS[purchase.status]}</Badge>
        <span>Commandé <Money value={purchase.ordered_total} /></span>
        <span>· Reçu <Money value={purchase.received_total} /></span>
        <span>· Réglé <Money value={purchase.amount_paid} /></span>
        {purchase.cancel_reason ? <span className="text-danger">· Annulée : {purchase.cancel_reason}</span> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title={open ? "Réception des marchandises" : "Articles"} description={open ? "Saisissez les quantités effectivement reçues. Une réception validée met à jour le stock une seule fois." : undefined} />
            {open ? (
              <ReceiveForm purchaseId={id} items={items.map((i) => ({ id: i.id, name: `${i.variant.products.name} — ${i.variant.label}`, ordered: i.quantity_ordered, received: i.quantity_received, unitCost: i.unit_cost }))} />
            ) : (
              <Table>
                <thead><tr><Th>Article</Th><Th align="right">Commandé</Th><Th align="right">Reçu</Th><Th align="right">Coût</Th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <Tr key={i.id}><Td>{i.variant.products.name} — {i.variant.label}</Td><Td align="right">{i.quantity_ordered}</Td><Td align="right">{i.quantity_received}</Td><Td align="right"><Money value={i.unit_cost} /></Td></Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
          {(purchase.receipts as unknown[]).length ? (
            <Panel>
              <PanelHeader title="Réceptions" />
              <ul className="divide-y divide-sand text-sm">
                {(purchase.receipts as { id: string; received_at: string; total_cost: number; notes: string | null; profiles: { full_name: string } | null }[]).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 px-5 py-3">
                    <span>{formatDateTime(r.received_at)} · {r.profiles?.full_name}{r.notes ? <span className="block text-xs text-muted">{r.notes}</span> : null}</span>
                    <Money value={r.total_cost} />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader title="Règlements" />
            <ul className="divide-y divide-sand text-sm">
              {(purchase.payments as { id: string; amount: number; method: string; paid_at: string; reference: string | null }[]).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 px-5 py-2.5">
                  <span>{PAYMENT_LABELS[p.method]}<span className="block text-xs text-muted">{formatDate(p.paid_at)}{p.reference ? ` · ${p.reference}` : ""}</span></span>
                  <Money value={p.amount} />
                </li>
              ))}
              {(purchase.payments as unknown[]).length === 0 ? <li className="px-5 py-3 text-muted">Aucun règlement.</li> : null}
            </ul>
          </Panel>
          {purchase.status !== "cancelled" && remainingToPay > 0 && can(user.permissions, "suppliers.manage") ? (
            <Panel>
              <PanelHeader title="Régler cette commande" description={`Reste : ${remainingToPay.toLocaleString("fr-FR")} FCFA`} />
              <SupplierPaymentForm supplierId={purchase.suppliers.id} purchaseId={id} sessionId={session?.id ?? null} suggested={Math.max(0, purchase.received_total - purchase.amount_paid)} />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
