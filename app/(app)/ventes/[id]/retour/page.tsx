import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { getMyOpenSession, getSale } from "@/lib/data/sale";
import { PageHeader } from "@/components/ui/page-header";
import { ReturnForm } from "./return-form";

export const metadata: Metadata = { title: "Retour" };

export default async function ReturnPage({ params }: PageProps<"/ventes/[id]/retour">) {
  const user = await requirePage("returns.manage");
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();
  if (sale.status !== "completed") redirect(`/ventes/${id}`);
  const session = await getMyOpenSession(user.id);
  return (
    <>
      <PageHeader
        title={`Retour sur la vente ${sale.sale_number}`}
        back={{ href: `/ventes/${id}`, label: "Détail de la vente" }}
        description="La valeur retournée tient compte des remises. Elle réduit d'abord un éventuel reste à payer, le surplus est remboursé ou converti en avoir."
      />
      <ReturnForm
        sale={{ id: sale.id, balanceDue: sale.balance_due, hasCustomer: !!sale.customer }}
        items={sale.items.map((i) => ({
          id: i.id,
          name: i.product_name,
          label: i.variant_label,
          quantity: i.quantity,
          returnedQty: i.returned_qty,
          lineTotal: i.line_total,
          refundedAmount: i.refunded_amount,
        }))}
        sessionId={session?.id ?? null}
      />
    </>
  );
}
