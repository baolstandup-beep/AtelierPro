import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuration Supabase Service Role manquante.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Vérifie si un utilisateur est un administrateur global de la plateforme AtelierPro.
 * Les droits sont vérifiés EXCLUSIVEMENT côté serveur (aucun rôle frontend n'est accepté).
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const sb = getAdminClient();

    // 1. Vérification dans app_metadata (réservé service_role)
    const { data: userRes } = await sb.auth.admin.getUserById(userId);
    if (userRes.user?.app_metadata?.is_platform_admin === true) {
      return true;
    }

    // 2. Vérification dans la table de sécurité dédiée platform_admins
    const { data: adminRow } = await sb
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!adminRow;
  } catch (err) {
    console.error('[Admin Check Error]', err);
    return false;
  }
}
