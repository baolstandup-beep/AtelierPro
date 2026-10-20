import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serviceRoleKey } from "@/lib/env";

/**
 * Client service_role : contourne la RLS. À n'utiliser QUE côté serveur, après
 * avoir vérifié les droits de l'appelant (création de comptes, limitation des
 * connexions). Jamais importé par un composant client.
 */
export function createAdminClient() {
  return createClient(publicEnv().url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
