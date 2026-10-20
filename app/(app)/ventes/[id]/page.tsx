import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Undo2 } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getMyOpenSession, getSale } from "@/lib/data/sale";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { cancelSale } from "@/lib/actions/sales";

export const metadata: Metadata = { title: "Détail de la vente" };

export default async function SalePage({ params }: PageProps<"/ventes/[id]">) {
  const user = await requirePage("sales.create", "sales.view_all", "returns.manage", "customers.view");
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();
  const session = await getMyOpenSession(user.id);
  const remaining = sale.items.reduce((s, i) => s + i.quantity - i.returned_qty, 0);
  const canReturn = sale.status === "completed" && remaining > 0 && can(user.permissions, "returns.manage");
  const canCancel = sale.status === "completed" && sale.returns.length === 0 && can(user.permissions, "sales.cancel");
  const showCost = can(user.permissions, "reports.view");
  const hasCash = sale.payments.some((p) => p.method === "cash");

  return (
    <>
      <PageHeader
        title={`Vente ${sale.sale_number}`}
        back={{ href: "/ventes", label: "Ventes" }}
        description={`${formatDateTime(sale.created_at)} · ${sale.cashier?.full_name ?? ""}`}
        actions={
          <>
            <a href={`/tickets/${sale.id}`} target="_blank" rel="noopener" className={buttonClass("secondary")}>
              <Printer aria-hidden /> Ticket
            </a>
            {canReturn ? (
              <LinkButton href={`/ventes/${sale.id}/retour`} variant="secondary">
                <Undo2 aria-hidden /> Retour / remboursement
              </LinkButton>
            ) : null}
            {canCancel ? (
              <ConfirmAction
                action={cancelSale}
                hidden={{ id: sale.id, session_id: session?.id ?? "" }}
                trigger="Annuler la vente"
                title={`Annuler la vente ${sale.sale_number} ?`}
                description={
                  hasCash && !session
                    ? "Attention : cette vente comporte un paiement en espèces et aucune caisse n'est ouverte. Ouvrez une caisse pour rembourser les espèces."
                    : "Le stock sera réintégré et chaque paiement reçu sera enregistré comme remboursé (espèces sorties de la caisse ouverte). Opération journalisée et irréversible."
                }
                reason={{ label: "Motif de l'annulation", required: true }}
                confirmLabel="Annuler la vente"
              />
            ) : null}
          </>
        }
      />

      {sale.status === "cancelled" ? (
        <div role="status" className="mb-6 rounded-[var(--radius-panel)] border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger">
          Vente annulée le {formatDateTime(sale.cancelled_at)} par {sale.canceller?.full_name ?? "—"} — motif : {sale.cancel_reason}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title="Articles" />
            <Table>
              <thead>
                <tr>
                  <Th>Article</Th>
                  <Th align="right">Qté</Th>
                  <Th align="right">Prix unitaire</Th>
                  <Th align="right">Remise</Th>
                  <Th align="right">Montant</Th>
                  {showCost ? <Th align="right">Marge</Th> : null}
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <span className="font-medium">{i.product_name}</span>
                      <span className="block text-xs text-muted">{i.variant_label}{i.barcode ? ` · ${i.barcode}` : ""}</span>
                      {i.returned_qty > 0 ? <Badge className="mt-1">{i.returned_qty} retourné(s)</Badge> : null}
                    </Td>
                    <Td align="right">{i.quantity}</Td>
                    <Td align="right"><Money value={i.unit_price} /></Td>
                    <Td align="right">{i.discount_amount ? <Money value={-i.discount_amount} /> : "—"}</Td>
                    <Td align="right" className="font-medium"><Money value={i.line_total} /></Td>
                    {showCost ? <Td align="right" className="text-muted"><Money value={i.line_total - i.unit_cost * i.quantity} /></Td> : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          {sale.returns.length ? (
            <Panel>
              <PanelHeader title="Retours" />
              <Table>
                <thead>
                  <tr>
                    <Th>Retour</Th>
                    <Th>Motif</Th>
                    <Th align="right">Valeur</Th>
                    <Th align="right">Remboursé</Th>
                  </tr>
                </thead>
                <tbody>
                  {sale.returns.map((r) => (
                    <Tr key={r.id}>
                      <Td>
                        <a href={`/tickets/retour/${r.id}`} target="_blank" rel="noopener" className="font-medium tabular hover:underline">{r.return_number}</a>
                        <span className="block text-xs text-muted">{formatDateTime(r.created_at)}</span>
                      </Td>
                      <Td className="text-muted">{r.reason}</Td>
                      <Td align="right"><Money value={r.total_value} /></Td>
                      <Td align="right">
                        <Money value={r.refund_amount} />
                        {r.refund_method ? <span className="block text-xs text-muted">{PAYMENT_LABELS[r.refund_method]}</span> : null}
                        {r.balance_reduction ? <span className="block text-xs text-muted">dont crédit annulé : <Money value={r.balance_reduction} /></span> : null}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader title="Montants" />
            <dl className="grid grid-cols-2 gap-y-2 p-5 text-sm">
              <dt className="text-muted">Sous-total</dt><dd className="text-right"><Money value={sale.subtotal} /></dd>
              {sale.discount_amount ? (<><dt className="text-muted">Remise</dt><dd className="text-right"><Money value={-sale.discount_amount} /></dd></>) : null}
              <dt className="font-medium">Total dû</dt><dd className="text-right font-semibold"><Money value={sale.total} /></dd>
              <dt className="text-muted">Reçu</dt><dd className="text-right"><Money value={sale.amount_paid} /></dd>
              {sale.change_given ? (<><dt className="text-muted">Monnaie rendue</dt><dd className="text-right"><Money value={sale.change_given} /></dd></>) : null}
              {sale.balance_due ? (<><dt className="font-medium text-warning">Reste à payer</dt><dd className="text-right font-semibold text-warning"><Money value={sale.balance_due} /></dd></>) : null}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Paiements" />
            <ul className="divide-y divide-sand text-sm">
              {sale.payments.length === 0 ? <li className="px-5 py-3 text-muted">Aucun paiement reçu.</li> : null}
              {sale.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 px-5 py-2.5">
                  <span>
                    {PAYMENT_LABELS[p.method]}
                    <span className="block text-xs text-muted">
                      {p.kind === "credit_settlement" ? "Règlement de créance · " : ""}{formatDateTime(p.created_at)}{p.reference ? ` · ${p.reference}` : ""}
                    </span>
                  </span>
                  <Money value={p.amount} />
                </li>
              ))}
              {sale.refunds.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 px-5 py-2.5 text-danger">
                  <span>
                    Remboursement {PAYMENT_LABELS[r.method]}
                    <span className="block text-xs">{r.kind === "cancellation" ? "Annulation" : "Retour"} · {formatDateTime(r.created_at)}</span>
                  </span>
                  <Money value={-r.amount} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Client" />
            <div className="p-5 text-sm">
              {sale.customer ? (
                <Link href={`/clients/${sale.customer.id}`} className="font-medium hover:underline">
                  {[sale.customer.first_name, sale.customer.last_name].filter(Boolean).join(" ")}
                  <span className="block text-xs font-normal text-muted">{sale.customer.phone}</span>
                </Link>
              ) : (
                <span className="text-muted">Client de passage</span>
              )}
              {sale.note ? <p className="mt-3 text-muted">Note : {sale.note}</p> : null}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
