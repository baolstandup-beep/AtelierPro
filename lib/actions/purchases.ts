"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { formToObject, requiredText, uuid } from "@/lib/validation";

const purchaseSchema = z.object({
  supplierId: z.uuid({ error: "Choisissez un fournisseur." }),
  supplierReference: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z
    .array(z.object({ variantId: z.uuid(), quantity: z.number().int().positive("Quantité invalide."), unitCost: z.number().int().min(0, "Coût invalide.") }))
    .min(1, "Ajoutez au moins un article."),
});

export async function createPurchase(input: z.input<typeof purchaseSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("purchases.manage");
    const parsed = purchaseSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Commande invalide.");
    const d = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_purchase", {
      p_supplier_id: d.supplierId,
      p_items: d.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity, unit_cost: i.unitCost })),
      p_supplier_reference: d.supplierReference || null,
      p_notes: d.notes || null,
      p_order_date: d.orderDate || null,
    });
    if (error) return fromError(error);
    revalidatePath("/achats");
    const r = data as { id: string; purchase_number: string };
    return { ok: true, message: `Commande ${r.purchase_number} créée.`, data: { id: r.id } };
  } catch (e) {
    return fromError(e);
  }
}

/** Réception : formulaire avec un champ « qty:<purchase_item_id> » et « cost:<id> » par ligne. */
export async function receivePurchase(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("purchases.manage");
    const purchaseId = uuid().parse(formData.get("purchase_id"));
    const operationId = uuid().parse(formData.get("operation_id"));
    const items: { purchase_item_id: string; quantity: number; unit_cost?: number }[] = [];
    for (const [key, raw] of formData.entries()) {
      if (!key.startsWith("qty:")) continue;
      const id = key.slice(4);
      const qty = Number(String(raw).trim() || "0");
      if (!Number.isInteger(qty) || qty < 0) return fail("Quantité reçue invalide.");
      if (qty === 0) continue;
      const costRaw = String(formData.get(`cost:${id}`) ?? "").replace(/\s/g, "");
      const cost = costRaw === "" ? undefined : Number(costRaw);
      if (cost !== undefined && (!Number.isInteger(cost) || cost < 0)) return fail("Coût unitaire invalide.");
      items.push({ purchase_item_id: id, quantity: qty, unit_cost: cost });
    }
    if (!items.length) return fail("Indiquez au moins une quantité reçue.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("receive_purchase", {
      p_client_operation_id: operationId,
      p_purchase_id: purchaseId,
      p_items: items,
      p_update_costs: formData.get("update_costs") === "on",
      p_notes: String(formData.get("notes") ?? "") || null,
    });
    if (error) return fromError(error);
    revalidatePath(`/achats/${purchaseId}`);
    revalidatePath("/achats");
    return { ok: true, message: "Réception enregistrée : stock mis à jour." };
  } catch (e) {
    return fromError(e);
  }
}

export async function cancelPurchase(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("purchases.manage");
    const parsed = z.object({ id: uuid(), reason: requiredText("Le motif", 500) }).safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_purchase", { p_purchase_id: parsed.data.id, p_reason: parsed.data.reason });
    if (error) return fromError(error);
    revalidatePath(`/achats/${parsed.data.id}`);
    return { ok: true, message: "Commande annulée." };
  } catch (e) {
    return fromError(e);
  }
}

export async function searchVariantsForPurchase(query: string) {
  await requireAction("purchases.manage");
  const q = String(query ?? "").trim().replace(/[,()%]/g, " ").slice(0, 60);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_variant_stock")
    .select("variant_id, product_name, variant_label, barcode, purchase_price, stock_qty")
    .or(`product_name.ilike.%${q}%,variant_label.ilike.%${q}%,barcode.eq.${q},reference.ilike.%${q}%`)
    .eq("product_status", "active")
    .limit(15);
  return (data ?? []) as { variant_id: string; product_name: string; variant_label: string; barcode: string | null; purchase_price: number; stock_qty: number }[];
}
