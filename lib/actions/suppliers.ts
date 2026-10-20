"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { email, formToObject, optionalText, optionalUuid, paymentMethod, phone, positiveAmount, requiredText, uuid } from "@/lib/validation";

const supplierSchema = z.object({
  id: optionalUuid(),
  name: requiredText("Le nom", 120),
  contact_name: optionalText(120),
  phone,
  email,
  address: optionalText(300),
  notes: optionalText(1000),
});

export async function saveSupplier(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("suppliers.manage");
    const parsed = supplierSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const { id, ...f } = parsed.data;
    const row = {
      name: f.name,
      contact_name: f.contact_name ?? null,
      phone: f.phone ?? null,
      email: f.email ?? null,
      address: f.address ?? null,
      notes: f.notes ?? null,
      is_active: formData.get("is_active") ? formData.get("is_active") === "on" : true,
    };
    const supabase = await createClient();
    const { data, error } = id
      ? await supabase.from("suppliers").update(row).eq("id", id).select("id").single()
      : await supabase.from("suppliers").insert(row).select("id").single();
    if (error) return fromError(error);
    revalidatePath("/fournisseurs");
    return { ok: true, message: id ? "Fournisseur enregistré." : "Fournisseur créé.", data: { id: data.id } };
  } catch (e) {
    return fromError(e);
  }
}

export async function recordSupplierPayment(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("suppliers.manage");
    const parsed = z
      .object({
        operation_id: uuid(),
        supplier_id: uuid("Fournisseur"),
        purchase_id: optionalUuid(),
        amount: positiveAmount(),
        method: paymentMethod.refine((m) => m !== "store_credit", "Moyen de paiement invalide."),
        reference: optionalText(80),
        from_register: z.string().optional(),
        session_id: optionalUuid(),
        paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.").optional(),
      })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    const fromRegister = d.from_register === "on";
    if (fromRegister && (d.method !== "cash" || !d.session_id)) return fail("Seul un règlement en espèces peut être pris dans une caisse ouverte.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_supplier_payment", {
      p_client_operation_id: d.operation_id,
      p_supplier_id: d.supplier_id,
      p_amount: d.amount,
      p_method: d.method,
      p_purchase_id: d.purchase_id ?? null,
      p_reference: d.reference ?? null,
      p_cash_session_id: fromRegister ? d.session_id : null,
      p_paid_at: d.paid_at ?? null,
    });
    if (error) return fromError(error);
    revalidatePath(`/fournisseurs/${d.supplier_id}`);
    if (d.purchase_id) revalidatePath(`/achats/${d.purchase_id}`);
    return { ok: true, message: "Règlement fournisseur enregistré." };
  } catch (e) {
    return fromError(e);
  }
}
