"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fromError, fromZod } from "@/lib/action-result";
import { email, formToObject, optionalText, optionalUuid, phone, requiredText } from "@/lib/validation";

const schema = z.object({
  id: optionalUuid(),
  first_name: requiredText("Le prénom", 80),
  last_name: optionalText(80),
  phone,
  email,
  notes: optionalText(1000),
});

export async function saveCustomer(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("customers.manage");
    const parsed = schema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const { id, ...fields } = parsed.data;
    const row = {
      first_name: fields.first_name,
      last_name: fields.last_name ?? null,
      phone: fields.phone ?? null,
      email: fields.email ?? null,
      notes: fields.notes ?? null,
    };
    const supabase = await createClient();
    const { data, error } = id
      ? await supabase.from("customers").update(row).eq("id", id).select("id").single()
      : await supabase.from("customers").insert(row).select("id").single();
    if (error) return fromError(error);
    revalidatePath("/clients");
    return { ok: true, message: id ? "Fiche client enregistrée." : "Client créé.", data: { id: data.id } };
  } catch (e) {
    return fromError(e);
  }
}
