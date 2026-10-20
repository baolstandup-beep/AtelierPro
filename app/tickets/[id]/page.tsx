import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requirePage } from "@/lib/auth";
import { getSale, getShopSettings } from "@/lib/data/sale";
import { formatDateTime, formatFCFA, PAYMENT_LABELS } from "@/lib/format";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ReceiptPageStyle, RECEIPT_FORMATS, receiptWidth } from "@/components/print/receipt-styles";
import { Barcode } from "@/components/products/barcode";

export const metadata: Metadata = { title: "Ticket de caisse" };

export default async function TicketPage({ params, searchParams }: PageProps<"/tickets/[id]">) {
  await requirePage("sales.create", "sales.view_all", "returns.manage", "customers.view");
  const { id } = await params;
  const sp = await searchParams;
  const format = typeof sp.format === "string" && ["80", "58", "a4"].includes(sp.format) ? sp.format : "80";
  const [sale, shop] = await Promise.all([getSale(id), getShopSettings()]);
  if (!sale) notFound();
  const salePayments = sale.payments.filter((p) => p.kind === "sale");
  const settlements = sale.payments.filter((p) => p.kind === "credit_settlement");

  return (
    <div className="min-h-dvh bg-paper">
      <ReceiptPageStyle format={format} />
      <Suspense>
        <PrintToolbar backHref={`/ventes/${sale.id}`} formats={RECEIPT_FORMATS} />
      </Suspense>
      <article className={`mx-auto px-3 py-6 font-sans text-black print:p-0 ${receiptWidth(format)}`}>
        <header className="text-center">
          <p className="font-display text-[1.6em] leading-tight">{shop?.shop_name ?? "Élégance by Aicha"}</p>
          {shop?.address ? <p>{shop.address}</p> : null}
          {shop?.phone ? <p>Tél. {shop.phone}</p> : null}
          {shop?.email ? <p>{shop.email}</p> : null}
          {shop?.legal_info ? <p>{shop.legal_info}</p> : null}
        </header>
        <div className="my-2 border-t border-dashed border-black" />
        <p className="flex justify-between"><span>Ticket</span><span className="font-semibold">{sale.sale_number}</span></p>
        <p className="flex justify-between"><span>Date</span><span>{formatDateTime(sale.created_at)}</span></p>
        <p className="flex justify-between"><span>Caissier</span><span>{sale.cashier?.full_name}</span></p>
        {sale.customer ? <p className="flex justify-between"><span>Client</span><span>{[sale.customer.first_name, sale.customer.last_name].filter(Boolean).join(" ")}</span></p> : null}
        {sale.status === "cancelled" ? <p className="mt-2 border border-black py-1 text-center font-bold">VENTE ANNULÉE</p> : null}
        <div className="my-2 border-t border-dashed border-black" />
        <table className="w-full">
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="py-0.5 pr-2">
                  {i.product_name}
                  <span className="block opacity-80">{i.variant_label} — {i.quantity} × {formatFCFA(i.unit_price)}</span>
                </td>
                <td className="py-0.5 text-right whitespace-nowrap tabular">{formatFCFA(i.unit_price * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="my-2 border-t border-dashed border-black" />
        <p className="flex justify-between"><span>Sous-total</span><span className="tabular">{formatFCFA(sale.subtotal)}</span></p>
        {sale.discount_amount ? <p className="flex justify-between"><span>Remise</span><span className="tabular">−{formatFCFA(sale.discount_amount)}</span></p> : null}
        <p className="mt-1 flex justify-between text-[1.3em] font-bold"><span>TOTAL</span><span className="tabular">{formatFCFA(sale.total)}</span></p>
        <div className="my-2 border-t border-dashed border-black" />
        {salePayments.map((p) => (
          <p key={p.id} className="flex justify-between"><span>{PAYMENT_LABELS[p.method]}{p.reference ? ` (${p.reference})` : ""}</span><span className="tabular">{formatFCFA(p.amount)}</span></p>
        ))}
        {sale.cash_tendered != null && sale.change_given > 0 ? (
          <>
            <p className="flex justify-between"><span>Espèces remises</span><span className="tabular">{formatFCFA(sale.cash_tendered)}</span></p>
            <p className="flex justify-between"><span>Monnaie rendue</span><span className="tabular">{formatFCFA(sale.change_given)}</span></p>
          </>
        ) : null}
        {settlements.map((p) => (
          <p key={p.id} className="flex justify-between"><span>Règlement {formatDateTime(p.created_at).slice(0, 10)} ({PAYMENT_LABELS[p.method]})</span><span className="tabular">{formatFCFA(p.amount)}</span></p>
        ))}
        {sale.balance_due > 0 ? <p className="mt-1 flex justify-between font-bold"><span>Reste à payer</span><span className="tabular">{formatFCFA(sale.balance_due)}</span></p> : null}
        {sale.refunds.length ? (
          <>
            <div className="my-2 border-t border-dashed border-black" />
            {sale.refunds.map((r) => (
              <p key={r.id} className="flex justify-between"><span>Remboursé ({PAYMENT_LABELS[r.method]})</span><span className="tabular">−{formatFCFA(r.amount)}</span></p>
            ))}
          </>
        ) : null}
        <div className="my-3 flex justify-center [&_svg]:max-w-full">
          <Barcode value={sale.sale_number} height={32} width={1.2} fontSize={10} />
        </div>
        <p className="text-center">{shop?.receipt_footer}</p>
      </article>
    </div>
  );
}
