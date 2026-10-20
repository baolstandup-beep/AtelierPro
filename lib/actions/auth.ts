"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromZod } from "@/lib/action-result";

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide.").trim().toLowerCase(),
  password: z.string().min(1, "Mot de passe obligatoire."),
  suite: z.string().optional(),
});

async function rateLimitKey(email: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  return `login:${email}:${ip}`;
}

function adminOrNull() {
  try {
    return createAdminClient();
  } catch {
    return null; // sans clé service_role : seules les limites de Supabase Auth s'appliquent
  }
}

export async function signIn(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { email, password, suite } = parsed.data;

  const admin = adminOrNull();
  const key = await rateLimitKey(email);
  if (admin) {
    const { data: allowed } = await admin.rpc("check_login_allowed", { p_key: key });
    if (allowed === false) return fail("Trop de tentatives. Réessayez dans 15 minutes.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (admin) await admin.rpc("register_login_attempt", { p_key: key, p_success: false });
    if (error?.status === 429) return fail("Trop de tentatives. Patientez quelques minutes.");
    return fail("E-mail ou mot de passe incorrect.");
  }
  if (admin) await admin.rpc("register_login_attempt", { p_key: key, p_success: true });

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return fail("Ce compte n'est pas activé. Contactez la gérante.");
  }
  const safeNext = suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/";
  redirect(safeNext);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

export async function requestPasswordReset(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const parsed = z.object({ email: z.email("Adresse e-mail invalide.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/callback?suite=/compte` });
  // Réponse identique que le compte existe ou non (pas d'énumération).
  return { ok: true, message: "Si ce compte existe, un e-mail de réinitialisation vient d'être envoyé." };
}

export async function updatePassword(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  const parsed = z
    .object({
      password: z.string().min(10, "10 caractères minimum."),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { message: "Les deux mots de passe diffèrent.", path: ["confirm"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message.includes("different") ? "Choisissez un mot de passe différent de l'actuel." : "Modification impossible.");
  return { ok: true, message: "Mot de passe modifié." };
}
