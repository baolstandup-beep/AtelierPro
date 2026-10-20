"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { amount, formToObject, optionalText, optionalUuid, paymentMethod, positiveAmount, requiredText, uuid } from "@/lib/validation";

export async function addCashMovement(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("cash.operate");
    const parsed = z
      .object({ session_id: uuid(), type: z.enum(["cash_in", "cash_out"]), amount: positiveAmount(), reason: requiredText("Le motif", 300) })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("add_cash_movement", {
      p_session_id: parsed.data.session_id,
      p_type: parsed.data.type,
      p_amount: parsed.data.amount,
      p_reason: parsed.data.reason,
    });
    if (error) return fromError(error);
    revalidatePath(`/sessions-caisse/${parsed.data.session_id}`);
    return { ok: true, message: parsed.data.type === "cash_in" ? "Apport enregistré." : "Retrait enregistré." };
  } catch (e) {
    return fromError(e);
  }
}

export async function closeCashSession(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("cash.close");
    const parsed = z
      .object({ session_id: uuid(), counted_cash: amount("Le comptage"), difference_reason: optionalText(500), notes: optionalText(1000) })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("close_cash_session", {
      p_session_id: parsed.data.session_id,
      p_counted_cash: parsed.data.counted_cash,
      p_difference_reason: parsed.data.difference_reason ?? null,
      p_notes: parsed.data.notes ?? null,
    });
    if (error) {
      if (/motif est obligatoire/.test(error.message)) return fail(error.message, { difference_reason: "Motif obligatoire en cas d'écart." });
      return fromError(error);
    }
    revalidatePath(`/sessions-caisse/${parsed.data.session_id}`);
    revalidatePath("/sessions-caisse");
    revalidatePath("/caisse");
    const diff = (data as { difference: number }).difference;
    return { ok: true, message: diff === 0 ? "Caisse clôturée, sans écart." : `Caisse clôturée avec un écart de ${diff.toLocaleString("fr-FR")} FCFA.` };
  } catch (e) {
    return fromError(e);
  }
}

export async function correctCashSession(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("cash.correct");
    const parsed = z
      .object({
        session_id: uuid(),
        amount: z.preprocess((v) => Number(String(v).replace(/[\s ]/g, "").replace("−", "-")), z.number().int().refine((n) => n !== 0, "Montant non nul attendu.")),
        reason: requiredText("Le motif", 500),
      })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("correct_cash_session", { p_session_id: parsed.data.session_id, p_amount: parsed.data.amount, p_reason: parsed.data.reason });
    if (error) return fromError(error);
    revalidatePath(`/sessions-caisse/${parsed.data.session_id}`);
    return { ok: true, message: "Correction enregistrée et journalisée." };
  } catch (e) {
    return fromError(e);
  }
}

export async function recordExpense(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("expenses.manage");
    const parsed = z
      .object({
        category: z.enum(["rent", "electricity", "transport", "packaging", "communication", "maintenance", "salary", "other"], { error: "Catégorie invalide." }),
        amount: positiveAmount(),
        expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
        method: paymentMethod.refine((m) => m !== "store_credit", "Moyen de paiement invalide."),
        comment: optionalText(500),
        from_register: z.string().optional(),
        session_id: optionalUuid(),
      })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    const fromRegister = d.from_register === "on";
    if (fromRegister && d.method !== "cash") return fail("Seule une dépense en espèces peut être prise dans la caisse.");
    if (fromRegister && !d.session_id) return fail("Aucune caisse ouverte.");
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_expense", {
      p_category: d.category,
      p_amount: d.amount,
      p_expense_date: d.expense_date,
      p_method: d.method,
      p_comment: d.comment ?? null,
      p_cash_session_id: fromRegister ? d.session_id : null,
    });
    if (error) return fromError(error);
    revalidatePath("/depenses");
    return { ok: true, message: "Dépense enregistrée." };
  } catch (e) {
    return fromError(e);
  }
}

export async function voidExpense(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("expenses.manage");
    const parsed = z.object({ id: uuid(), reason: requiredText("Le motif", 500) }).safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("void_expense", { p_expense_id: parsed.data.id, p_reason: parsed.data.reason });
    if (error) return fromError(error);
    revalidatePath("/depenses");
    return { ok: true, message: "Dépense annulée." };
  } catch (e) {
    return fromError(e);
  }
}
