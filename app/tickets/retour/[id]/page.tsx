import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getShopSettings } from "@/lib/data/sale";
import { formatDateTime, formatFCFA, PAYMENT_LABELS } from "@/lib/format";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { ReceiptPageStyle, RECEIPT_FORMATS, receiptWidth } from "@/components/print/receipt-styles";

export const metadata: Metadata = { title: "Justificatif de retour" };

export default async function ReturnReceiptPage({ params, searchParams }: PageProps<"/tickets/retour/[id]">) {
  await requirePage("returns.manage", "sales.view_all", "customers.view");
  const { id } = await params;
  const sp = await searchParams;
  const format = typeof sp.format === "string" && ["80", "58", "a4"].includes(sp.format) ? sp.format : "80";
  const supabase = await createClient();
  const [{ data }, shop] = await Promise.all([
    supabase
      .from("returns")
      .select("id, return_number, created_at, reason, total_value, balance_reduction, refund_amount, refund_method, sale:sales(id, sale_number, created_at, customer:customers(first_name, last_name)), author:profiles(full_name), items:return_items(id, quantity, refund_value, restock, sale_item:sale_items(product_name, variant_label))")
      .eq("id", id)
      .maybeSingle(),
    getShopSettings(),
  ]);
  if (!data) notFound();
  const r = data as unknown as {
    return_number: string; created_at: string; reason: string; total_value: number; balance_reduction: number; refund_amount: number; refund_method: string | null;
    sale: { id: string; sale_number: string; created_at: string; customer: { first_name: string; last_name: string | null } | null };
    author: { full_name: string } | null;
    items: { id: string; quantity: number; refund_value: number; restock: boolean; sale_item: { product_name: string; variant_label: string } }[];
  };
  return (
    <div className="min-h-dvh bg-paper">
      <ReceiptPageStyle format={format} />
      <Suspense>
        <PrintToolbar backHref={`/ventes/${r.sale.id}`} formats={RECEIPT_FORMATS} />
      </Suspense>
      <article className={`mx-auto px-3 py-6 text-black print:p-0 ${receiptWidth(format)}`}>
        <header className="text-center">
          <p className="font-display text-[1.6em]">{shop?.shop_name}</p>
          {shop?.phone ? <p>Tél. {shop.phone}</p> : null}
          <p className="mt-2 font-bold">JUSTIFICATIF DE RETOUR</p>
        </header>
        <div className="my-2 border-t border-dashed border-black" />
        <p className="flex justify-between"><span>Retour</span><span className="font-semibold">{r.return_number}</span></p>
        <p className="flex justify-between"><span>Date</span><span>{formatDateTime(r.created_at)}</span></p>
        <p className="flex justify-between"><span>Vente d&apos;origine</span><span>{r.sale.sale_number}</span></p>
        <p className="flex justify-between"><span>Traité par</span><span>{r.author?.full_name}</span></p>
        {r.sale.customer ? <p className="flex justify-between"><span>Client</span><span>{[r.sale.customer.first_name, r.sale.customer.last_name].filter(Boolean).join(" ")}</span></p> : null}
        <div className="my-2 border-t border-dashed border-black" />
        {r.items.map((i) => (
          <p key={i.id} className="flex justify-between gap-2">
            <span>{i.quantity} × {i.sale_item.product_name} ({i.sale_item.variant_label}){i.restock ? "" : " — défectueux"}</span>
            <span className="tabular whitespace-nowrap">{formatFCFA(i.refund_value)}</span>
          </p>
        ))}
        <div className="my-2 border-t border-dashed border-black" />
        <p>Motif : {r.reason}</p>
        <p className="mt-1 flex justify-between"><span>Valeur retournée</span><span className="tabular">{formatFCFA(r.total_value)}</span></p>
        {r.balance_reduction ? <p className="flex justify-between"><span>Crédit annulé</span><span className="tabular">{formatFCFA(r.balance_reduction)}</span></p> : null}
        <p className="flex justify-between text-[1.2em] font-bold">
          <span>{r.refund_method === "store_credit" ? "Avoir accordé" : `Remboursé${r.refund_method ? ` (${PAYMENT_LABELS[r.refund_method]})` : ""}`}</span>
          <span className="tabular">{formatFCFA(r.refund_amount)}</span>
        </p>
        <p className="mt-6">Signature client :</p>
        <div className="h-10" />
      </article>
    </div>
  );
}
