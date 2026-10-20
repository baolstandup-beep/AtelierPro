"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { formToObject, phone, requiredText, uuid } from "@/lib/validation";
import { PERMISSIONS } from "@/lib/permissions";

const roleEnum = z.enum(["admin", "cashier", "stock_manager", "employee"], { error: "Rôle invalide." });
const passwordSchema = z.string().min(10, "10 caractères minimum.").max(72);

function permissionsFrom(formData: FormData): string[] {
  const set = new Set(PERMISSIONS as readonly string[]);
  return formData.getAll("permissions").map(String).filter((p) => set.has(p));
}

async function audit(actorId: string, action: string, entityId: string, details: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({ actor_id: actorId, action, entity_type: "profile", entity_id: entityId, details });
}

export async function createUser(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireAction("users.manage");
    const parsed = z
      .object({ full_name: requiredText("Le nom", 120), email: z.email("Adresse e-mail invalide.").toLowerCase(), phone, role: roleEnum, password: passwordSchema })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return fail("Création impossible : SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur le serveur.");
    }
    const { data: created, error } = await admin.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { full_name: d.full_name },
    });
    if (error || !created.user) {
      return fail(/already|registered|exists/i.test(error?.message ?? "") ? "Un compte existe déjà avec cette adresse e-mail." : "Création du compte impossible.");
    }
    // Le déclencheur a créé un profil inactif ; on l'active avec le rôle choisi.
    const { error: pErr } = await admin
      .from("profiles")
      .update({ full_name: d.full_name, phone: d.phone ?? null, role: d.role, permissions: permissionsFrom(formData), is_active: true })
      .eq("id", created.user.id);
    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return fromError(pErr);
    }
    await audit(me.id, "user.create", created.user.id, { email: d.email, role: d.role });
    revalidatePath("/utilisateurs");
    return { ok: true, message: `Compte créé pour ${d.full_name}. Communiquez-lui son mot de passe provisoire de vive voix.`, data: { id: created.user.id } };
  } catch (e) {
    return fromError(e);
  }
}

export async function updateUser(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    const me = await requireAction("users.manage");
    const parsed = z.object({ id: uuid(), full_name: requiredText("Le nom", 120), phone, role: roleEnum }).safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    const isActive = formData.get("is_active") === "on";
    if (d.id === me.id) return fail("Vous ne pouvez pas modifier votre propre rôle ni votre statut. Demandez à un autre administrateur.");
    // Session de l'utilisateur : la RLS et le déclencheur profiles_guard s'appliquent.
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: d.full_name, phone: d.phone ?? null, role: d.role, permissions: permissionsFrom(formData), is_active: isActive })
      .eq("id", d.id);
    if (error) return fromError(error);
    // Un compte désactivé ne peut plus se connecter (bannissement côté Auth).
    try {
      await createAdminClient().auth.admin.updateUserById(d.id, { ban_duration: isActive ? "none" : "876000h" });
    } catch {
      /* sans clé service_role : le profil inactif suffit à bloquer l'accès aux données */
    }
    await audit(me.id, "user.update", d.id, { role: d.role, is_active: isActive, permissions: permissionsFrom(formData) }).catch(() => undefined);
    revalidatePath("/utilisateurs");
    return { ok: true, message: "Utilisateur mis à jour." };
  } catch (e) {
    return fromError(e);
  }
}

export async function resetUserPassword(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    const me = await requireAction("users.manage");
    const parsed = z.object({ id: uuid(), password: passwordSchema }).safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    if (parsed.data.id === me.id) return fail("Utilisez la page « Mon compte » pour votre propre mot de passe.");
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.password });
    if (error) return fail("Réinitialisation impossible.");
    await audit(me.id, "user.password_reset", parsed.data.id, {});
    return { ok: true, message: "Mot de passe provisoire défini." };
  } catch (e) {
    return fromError(e);
  }
}
