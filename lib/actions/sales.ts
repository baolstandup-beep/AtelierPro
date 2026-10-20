"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { formToObject, optionalUuid, paymentMethod, positiveAmount, requiredText, uuid } from "@/lib/validation";

export async function cancelSale(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("sales.cancel");
    const parsed = z
      .object({ id: uuid("Vente"), reason: requiredText("Le motif d'annulation", 500), session_id: optionalUuid() })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_sale", {
      p_sale_id: parsed.data.id,
      p_reason: parsed.data.reason,
      p_cash_session_id: parsed.data.session_id ?? null,
    });
    if (error) return fromError(error);
    revalidatePath(`/ventes/${parsed.data.id}`);
    revalidatePath("/ventes");
    return { ok: true, message: "Vente annulée : stock réintégré et remboursements enregistrés." };
  } catch (e) {
    return fromError(e);
  }
}

const returnSchema = z.object({
  operationId: z.uuid(),
  saleId: z.uuid(),
  reason: z.string().trim().min(1, "Le motif du retour est obligatoire.").max(500),
  refundMethod: z.enum(["cash", "wave", "orange_money", "bank_transfer", "store_credit"]),
  sessionId: z.uuid().nullable().optional(),
  items: z
    .array(z.object({ saleItemId: z.uuid(), quantity: z.number().int().positive(), restock: z.boolean() }))
    .min(1, "Sélectionnez au moins un article à retourner."),
});

export async function processReturn(input: z.input<typeof returnSchema>): Promise<ActionResult<{ id: string; return_number: string; refund_amount: number }>> {
  try {
    await requireAction("returns.manage");
    const parsed = returnSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Retour invalide.");
    const d = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("process_return", {
      p_client_operation_id: d.operationId,
      p_sale_id: d.saleId,
      p_items: d.items.map((i) => ({ sale_item_id: i.saleItemId, quantity: i.quantity, restock: i.restock })),
      p_reason: d.reason,
      p_refund_method: d.refundMethod,
      p_cash_session_id: d.sessionId ?? null,
    });
    if (error) return fromError(error);
    revalidatePath(`/ventes/${d.saleId}`);
    const r = data as { id: string; return_number: string; refund_amount: number };
    return { ok: true, message: `Retour ${r.return_number} enregistré.`, data: r };
  } catch (e) {
    return fromError(e);
  }
}

export async function recordCreditPayment(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("sales.create");
    const parsed = z
      .object({
        operation_id: uuid(),
        customer_id: uuid("Client"),
        amount: positiveAmount(),
        method: paymentMethod.refine((m) => m !== "store_credit", "Moyen de paiement invalide."),
        session_id: optionalUuid(),
        reference: z.string().trim().max(80).optional(),
      })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    if (d.method === "cash" && !d.session_id) return fail("Un règlement en espèces nécessite une caisse ouverte.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_credit_payment", {
      p_client_operation_id: d.operation_id,
      p_customer_id: d.customer_id,
      p_amount: d.amount,
      p_method: d.method,
      p_cash_session_id: d.method === "cash" ? d.session_id : null,
      p_reference: d.reference || null,
    });
    if (error) return fromError(error);
    revalidatePath(`/clients/${d.customer_id}`);
    return { ok: true, message: "Règlement enregistré." };
  } catch (e) {
    return fromError(e);
  }
}
