"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fromError, fromZod } from "@/lib/action-result";
import { email, formToObject, integer, optionalText, requiredText } from "@/lib/validation";

export async function saveSettings(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    const me = await requireAction("settings.manage");
    const parsed = z
      .object({
        shop_name: requiredText("Le nom de la boutique", 120),
        address: optionalText(300),
        phone: optionalText(60),
        email,
        legal_info: optionalText(300),
        receipt_footer: requiredText("Le message du ticket", 300),
        max_discount_percent: integer("Le plafond de remise").refine((n) => n <= 100, "100 % maximum."),
        default_min_stock: integer("Le seuil par défaut"),
      })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase
      .from("shop_settings")
      .update({
        ...parsed.data,
        address: parsed.data.address ?? null,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        legal_info: parsed.data.legal_info ?? null,
        allow_negative_stock: formData.get("allow_negative_stock") === "on",
        updated_at: new Date().toISOString(),
        updated_by: me.id,
      })
      .eq("id", 1);
    if (error) return fromError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Réglages enregistrés." };
  } catch (e) {
    return fromError(e);
  }
}
