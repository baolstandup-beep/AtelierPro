import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Utilisateur Supabase de la session courante (cookies), ou null.
 * À utiliser dans les route handlers : proxy.ts ne protège pas /api/*.
 */
export async function getAuthenticatedUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) =>
        items.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {}
        }),
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Atelier de l'utilisateur, résolu côté serveur (jamais depuis le payload). */
export async function getUserAtelierId(userId: string): Promise<string | null> {
  const admin = getAdminSupabase();
  if (!admin) return null;
  const { data } = await admin.from('profiles').select('atelier_id').eq('id', userId).maybeSingle();
  return data?.atelier_id ?? null;
}
