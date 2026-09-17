import { createClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
  actorUserId?: string | null;
  atelierId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Enregistre un événement de sécurité dans le journal d'audit immuable.
 * RÈGLE ABSOLUE : Ne stocke jamais de PIN, mot de passe, token ou secret.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const sb = getAdminClient();
    if (!sb) return;

    // Assainissement des métadonnées pour exclure tout secret
    const safeMetadata = { ...(entry.metadata || {}) };
    delete safeMetadata.pin;
    delete safeMetadata.password;
    delete safeMetadata.access_token;
    delete safeMetadata.refresh_token;
    delete safeMetadata.token;
    delete safeMetadata.token_hash;
    delete safeMetadata.secret;

    await sb.from('audit_logs').insert({
      actor_user_id: entry.actorUserId || null,
      atelier_id: entry.atelierId || null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      metadata: safeMetadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Le logging d'audit ne doit pas bloquer la transaction principale mais consigner l'erreur
    console.error('[Audit Log Failure]', err);
  }
}
