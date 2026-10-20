import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/** Client Supabase lié à la session de l'utilisateur : la RLS s'applique. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = publicEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : le proxy rafraîchit la session.
        }
      },
    },
  });
}
