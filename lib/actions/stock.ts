"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fromError, fromZod } from "@/lib/action-result";
import { formToObject, integer, optionalUuid, requiredText, uuid } from "@/lib/validation";

export async function adjustStock(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("stock.adjust");
    const parsed = z
      .object({
        variant_id: uuid("Article"),
        type: z.enum(["entry", "exit", "adjustment"]),
        quantity: z.preprocess((v) => Number(String(v).replace("−", "-")), z.number().int("Quantité entière attendue.").refine((n) => n !== 0, "La quantité ne peut pas être nulle.")),
        reason: requiredText("Le motif", 300),
      })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const { type, reason, variant_id } = parsed.data;
    let qty = parsed.data.quantity;
    if (type === "entry") qty = Math.abs(qty);
    if (type === "exit") qty = -Math.abs(qty);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("adjust_stock", { p_variant_id: variant_id, p_quantity: qty, p_type: type, p_reason: reason });
    if (error) return fromError(error);
    revalidatePath("/produits", "layout");
    revalidatePath("/stock");
    return { ok: true, message: `Mouvement enregistré. Nouveau stock : ${data}.` };
  } catch (e) {
    return fromError(e);
  }
}

export async function startInventory(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("stock.manage");
    const parsed = z.object({ name: requiredText("Le nom", 120), category_id: optionalUuid() }).safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("start_inventory", { p_name: parsed.data.name, p_category_id: parsed.data.category_id ?? null });
    if (error) return fromError(error);
    revalidatePath("/stock/inventaires");
    return { ok: true, message: "Inventaire démarré.", data: { id: data as string } };
  } catch (e) {
    return fromError(e);
  }
}

/** Enregistre en une fois toutes les quantités comptées d'un formulaire d'inventaire. */
export async function saveInventoryCounts(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("stock.manage");
    const inventoryId = uuid().parse(formData.get("inventory_id"));
    const entries = [...formData.entries()].filter(([k]) => k.startsWith("count:"));
    const supabase = await createClient();
    let saved = 0;
    for (const [key, raw] of entries) {
      const value = String(raw).trim();
      const lineId = key.slice(6);
      const original = String(formData.get(`orig:${lineId}`) ?? "");
      if (value === original) continue;
      const counted = value === "" ? null : integer("La quantité").parse(value);
      const { error } = await supabase.rpc("record_inventory_count", { p_line_id: lineId, p_counted: counted });
      if (error) return fromError(error);
      saved++;
    }
    revalidatePath(`/stock/inventaires/${inventoryId}`);
    return { ok: true, message: saved ? `${saved} comptage(s) enregistré(s).` : "Aucune modification." };
  } catch (e) {
    return fromError(e);
  }
}

export async function validateInventory(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("stock.manage");
    const id = uuid().parse(formData.get("id"));
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("validate_inventory", { p_inventory_id: id });
    if (error) return fromError(error);
    revalidatePath(`/stock/inventaires/${id}`);
    revalidatePath("/stock/inventaires");
    const adjusted = (data as { adjusted_lines: number }).adjusted_lines;
    return { ok: true, message: `Inventaire validé : ${adjusted} article(s) corrigé(s).` };
  } catch (e) {
    return fromError(e);
  }
}

export async function cancelInventory(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("stock.manage");
    const id = uuid().parse(formData.get("id"));
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_inventory", { p_inventory_id: id });
    if (error) return fromError(error);
    revalidatePath(`/stock/inventaires/${id}`);
    return { ok: true, message: "Inventaire abandonné, aucun stock modifié." };
  } catch (e) {
    return fromError(e);
  }
}
