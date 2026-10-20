import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission, type Role } from "@/lib/permissions";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string;
  role: Role;
  permissions: Set<string>;
}

/** Utilisateur courant (une seule requête par rendu). Permissions lues en base. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("full_name, role, is_active").eq("id", auth.user.id).maybeSingle(),
    supabase.rpc("my_permissions"),
  ]);
  if (!profile || !profile.is_active) return null;
  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as Role,
    permissions: new Set((perms as string[] | null) ?? []),
  };
});

/** Pour les pages : redirige si non connecté ou non autorisé. */
export async function requirePage(...anyOf: Permission[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (anyOf.length && !can(user.permissions, ...anyOf)) redirect("/acces-refuse");
  return user;
}

export class AuthorizationError extends Error {}

/** Pour les actions serveur : lève une erreur si non autorisé. */
export async function requireAction(...anyOf: Permission[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Votre session a expiré. Reconnectez-vous.");
  if (anyOf.length && !can(user.permissions, ...anyOf)) {
    throw new AuthorizationError("Vous n'avez pas les droits nécessaires pour cette opération.");
  }
  return user;
}
