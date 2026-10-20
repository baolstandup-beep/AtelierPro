"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { amount, formToObject, phone, requiredText, optionalText } from "@/lib/validation";
import { azertyToDigits, normalizeScan } from "@/lib/barcode";

export interface PosItem {
  variant_id: string;
  product_name: string;
  variant_label: string;
  barcode: string | null;
  sale_price: number;
  stock_qty: number;
  photo_path: string | null;
  exact: boolean;
}

/** Recherche caisse : code-barres exact d'abord (avec correction AZERTY), puis nom / référence. */
export async function searchProducts(query: string): Promise<ActionResult<PosItem[]>> {
  try {
    await requireAction("sales.create");
    const q = normalizeScan(String(query ?? "")).slice(0, 80);
    if (q.length < 1) return { ok: true, data: [] };
    const supabase = await createClient();
    const run = async (term: string) => {
      const { data, error } = await supabase.rpc("pos_search", { p_query: term, p_limit: 20 });
      if (error) throw error;
      return (data ?? []) as (Omit<PosItem, "exact"> & { sku: string | null; reference: string | null })[];
    };
    let rows = await run(q);
    let term = q;
    if (!rows.some((r) => r.barcode === q)) {
      const fixed = azertyToDigits(q);
      if (fixed) {
        const alt = await run(fixed);
        if (alt.length) {
          rows = alt;
          term = fixed;
        }
      }
    }
    return {
      ok: true,
      data: rows.map((r) => ({
        variant_id: r.variant_id,
        product_name: r.product_name,
        variant_label: r.variant_label,
        barcode: r.barcode,
        sale_price: Number(r.sale_price),
        stock_qty: Number(r.stock_qty),
        photo_path: r.photo_path,
        exact: r.barcode === term || r.sku?.toLowerCase() === term.toLowerCase(),
      })),
    };
  } catch (e) {
    return fromError(e);
  }
}

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
  store_credit: number;
  balance_due: number;
}

export async function searchCustomers(query: string): Promise<ActionResult<PosCustomer[]>> {
  try {
    await requireAction("customers.view");
    const q = String(query ?? "").trim().replace(/[,()%]/g, " ").slice(0, 60);
    if (q.length < 2) return { ok: true, data: [] };
    const supabase = await createClient();
    const digits = q.replace(/\D/g, "");
    const filter = digits.length >= 3 ? `phone.ilike.%${digits}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%` : `first_name.ilike.%${q}%,last_name.ilike.%${q}%`;
    const { data, error } = await supabase.from("customers").select("id, first_name, last_name, phone, store_credit").or(filter).limit(10);
    if (error) return fromError(error);
    const ids = (data ?? []).map((c) => c.id);
    const { data: dues } = ids.length
      ? await supabase.from("sales").select("customer_id, balance_due").in("customer_id", ids).eq("status", "completed").gt("balance_due", 0)
      : { data: [] };
    const due = new Map<string, number>();
    (dues ?? []).forEach((d) => due.set(d.customer_id, (due.get(d.customer_id) ?? 0) + Number(d.balance_due)));
    return {
      ok: true,
      data: (data ?? []).map((c) => ({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(" "),
        phone: c.phone,
        store_credit: Number(c.store_credit),
        balance_due: due.get(c.id) ?? 0,
      })),
    };
  } catch (e) {
    return fromError(e);
  }
}

export async function quickCreateCustomer(_prev: unknown, formData: FormData): Promise<ActionResult<PosCustomer>> {
  try {
    await requireAction("customers.manage");
    const parsed = z
      .object({ first_name: requiredText("Le prénom", 80), last_name: optionalText(80), phone })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({ first_name: parsed.data.first_name, last_name: parsed.data.last_name ?? null, phone: parsed.data.phone ?? null })
      .select("id, first_name, last_name, phone, store_credit")
      .single();
    if (error) return fromError(error);
    return {
      ok: true,
      message: "Client créé.",
      data: { id: data.id, name: [data.first_name, data.last_name].filter(Boolean).join(" "), phone: data.phone, store_credit: 0, balance_due: 0 },
    };
  } catch (e) {
    return fromError(e);
  }
}

const checkoutSchema = z.object({
  operationId: z.uuid(),
  sessionId: z.uuid({ error: "Aucune session de caisse ouverte." }),
  items: z
    .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1, "Quantité invalide.").max(10000) }))
    .min(1, "Le panier est vide.")
    .max(200, "Panier trop long (200 lignes maximum)."),
  payments: z
    .array(
      z.object({
        method: z.enum(["cash", "wave", "orange_money", "bank_transfer", "store_credit"]),
        amount: z.number().int().positive("Montant de paiement invalide."),
        reference: z.string().trim().max(80).optional(),
      }),
    )
    .max(6),
  discount: z.number().int().min(0).default(0),
  customerId: z.uuid().nullable().optional(),
  cashTendered: z.number().int().min(0).nullable().optional(),
  note: z.string().trim().max(300).optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export interface CheckoutResult {
  id: string;
  sale_number: string;
  duplicate: boolean;
  total: number;
  paid: number;
  balance_due: number;
  change: number;
}

/**
 * Validation de la vente. Le client n'envoie que les articles, quantités et
 * paiements : prix, remises réparties, totaux et stock sont calculés en base
 * dans une seule transaction (public.create_sale), idempotente grâce à
 * operationId (une requête rejouée renvoie la même vente).
 */
export async function checkout(input: CheckoutInput): Promise<ActionResult<CheckoutResult>> {
  try {
    await requireAction("sales.create");
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Vente invalide.");
    const d = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_sale", {
      p_client_operation_id: d.operationId,
      p_cash_session_id: d.sessionId,
      p_items: d.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      p_payments: d.payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference || null })),
      p_discount_amount: d.discount,
      p_customer_id: d.customerId ?? null,
      p_cash_tendered: d.cashTendered ?? null,
      p_note: d.note || null,
    });
    if (error) return fromError(error);
    revalidatePath("/ventes");
    revalidatePath("/tableau-de-bord");
    const result = data as CheckoutResult;
    return { ok: true, message: result.duplicate ? "Vente déjà enregistrée." : `Vente ${result.sale_number} enregistrée.`, data: result };
  } catch (e) {
    return fromError(e);
  }
}

// --- Sessions de caisse ------------------------------------------------------

export async function openCashSession(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("cash.operate");
    const parsed = z
      .object({ register_name: z.string().trim().max(60).optional(), opening_float: amount("Le fond de caisse") })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("open_cash_session", {
      p_register_name: parsed.data.register_name || "Caisse principale",
      p_opening_float: parsed.data.opening_float,
    });
    if (error) return fromError(error);
    revalidatePath("/caisse");
    revalidatePath("/sessions-caisse");
    return { ok: true, message: "Caisse ouverte.", data: { id: data as string } };
  } catch (e) {
    return fromError(e);
  }
}
