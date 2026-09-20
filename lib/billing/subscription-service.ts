/**
 * AtelierPro — Service centralisé d'abonnement
 * Source de vérité unique pour l'état des abonnements.
 * Utilisé UNIQUEMENT côté serveur (Server Components, API Routes, Server Actions).
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Subscription,
  SubscriptionAccess,
  SubscriptionAccessLevel,
  SubscriptionStatus,
} from '@/lib/types';

// ─── Client Supabase Admin (service_role) ───────────────────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[Billing] Supabase service_role non configuré.');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const GRACE_PERIOD_DAYS = 3;

// ─── Calcul de l'accès abonnement ───────────────────────────────────────────
/**
 * Retourne l'état d'accès d'un atelier de manière centralisée.
 * Doit être appelé depuis des Server Components / API Routes uniquement.
 */
export async function getSubscriptionAccess(
  atelierId: string
): Promise<SubscriptionAccess> {
  if (!atelierId) {
    return { level: 'BLOCKED', message: 'Aucun atelier associé.' };
  }

  try {
    const sb = getAdminClient();
    const now = new Date();

    // Récupérer l'abonnement actif le plus récent
    const { data: sub, error } = await sb
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('atelier_id', atelierId)
      .in('status', ['active', 'grace_period', 'expired', 'pending', 'suspended'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getSubscriptionAccess] Erreur DB:', error.message);
      return { level: 'BLOCKED', message: 'Erreur de vérification de l\'abonnement.' };
    }

    // Aucun abonnement trouvé
    if (!sub) {
      return {
        level: 'BLOCKED',
        message: 'Aucun abonnement actif. Veuillez souscrire à un plan.',
      };
    }

    const subscription = sub as Subscription;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;
    const gracePeriodEnd = subscription.grace_period_end
      ? new Date(subscription.grace_period_end)
      : null;

    // ─ Cas 1 : Abonnement actif dans la période ─
    if (subscription.status === 'active' && periodEnd && periodEnd > now) {
      const msRemaining = periodEnd.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      return {
        level: 'ACTIVE',
        subscription,
        daysRemaining,
      };
    }

    // ─ Cas 2 : Période expirée mais grace_period encore valide ─
    if (
      (subscription.status === 'active' || subscription.status === 'grace_period') &&
      periodEnd &&
      periodEnd <= now
    ) {
      // Calculer ou utiliser la grace_period_end
      const graceEnd =
        gracePeriodEnd ||
        new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      if (graceEnd > now) {
        const msGrace = graceEnd.getTime() - now.getTime();
        const graceDaysRemaining = Math.ceil(msGrace / (1000 * 60 * 60 * 24));

        // Mettre à jour le statut en base si pas encore fait
        if (subscription.status !== 'grace_period') {
          await _applyGracePeriod(atelierId, subscription.id, graceEnd);
        }

        return {
          level: 'GRACE',
          subscription: { ...subscription, status: 'grace_period' },
          graceDaysRemaining,
          message: `Votre abonnement a expiré. Il vous reste ${graceDaysRemaining} jour(s) pour renouveler.`,
        };
      }
    }

    // ─ Cas 3 : Grace period explicite active ─
    if (subscription.status === 'grace_period' && gracePeriodEnd && gracePeriodEnd > now) {
      const msGrace = gracePeriodEnd.getTime() - now.getTime();
      const graceDaysRemaining = Math.ceil(msGrace / (1000 * 60 * 60 * 24));
      return {
        level: 'GRACE',
        subscription,
        graceDaysRemaining,
        message: `Votre abonnement a expiré. Il vous reste ${graceDaysRemaining} jour(s) pour renouveler.`,
      };
    }

    // ─ Cas 4 : Expiré définitivement (READ_ONLY) ─
    if (
      subscription.status === 'expired' ||
      subscription.status === 'suspended' ||
      subscription.status === 'cancelled' ||
      (periodEnd && periodEnd <= now && (!gracePeriodEnd || gracePeriodEnd <= now))
    ) {
      // Mettre à jour en 'expired' si pas encore fait
      if (subscription.status !== 'expired') {
        await _expireSubscription(subscription.id);
      }
      return {
        level: 'READ_ONLY',
        subscription: { ...subscription, status: 'expired' },
        daysRemaining: 0,
        message:
          'Votre abonnement a expiré. Vos données sont conservées. Renouvelez pour réactiver.',
      };
    }

    // ─ Cas 5 : Pending (en attente de paiement) ─
    return {
      level: 'BLOCKED',
      subscription,
      message: 'En attente de confirmation de paiement.',
    };
  } catch (err) {
    console.error('[getSubscriptionAccess] Exception:', err);
    return { level: 'BLOCKED', message: 'Erreur interne de vérification.' };
  }
}

// ─── Appliquer la période de grâce ──────────────────────────────────────────
async function _applyGracePeriod(
  atelierId: string,
  subscriptionId: string,
  graceEnd: Date
) {
  try {
    const sb = getAdminClient();
    await sb
      .from('subscriptions')
      .update({
        status: 'grace_period',
        grace_period_end: graceEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('atelier_id', atelierId);

    console.info(`[SUBSCRIPTION_GRACE_PERIOD] Atelier ${atelierId} en grâce jusqu'au ${graceEnd.toISOString()}`);
  } catch (err) {
    console.error('[_applyGracePeriod] Erreur:', err);
  }
}

// ─── Expirer un abonnement ───────────────────────────────────────────────────
async function _expireSubscription(subscriptionId: string) {
  try {
    const sb = getAdminClient();
    await sb
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .in('status', ['active', 'grace_period', 'pending']);

    console.info(`[SUBSCRIPTION_EXPIRED] Subscription ${subscriptionId} marqué expiré`);
  } catch (err) {
    console.error('[_expireSubscription] Erreur:', err);
  }
}

// ─── Vérifier si une action mutante est autorisée ───────────────────────────
/**
 * Retourne true si l'atelier peut effectuer des mutations (créer/modifier des données).
 * false = mode lecture seule.
 */
export async function canMutate(atelierId: string): Promise<boolean> {
  const access = await getSubscriptionAccess(atelierId);
  return access.level === 'ACTIVE' || access.level === 'GRACE';
}

// ─── Récupérer l'abonnement actif d'un atelier ──────────────────────────────
export async function getActiveSubscription(
  atelierId: string
): Promise<Subscription | null> {
  try {
    const sb = getAdminClient();
    const { data } = await sb
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('atelier_id', atelierId)
      .in('status', ['active', 'grace_period'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data as Subscription) || null;
  } catch {
    return null;
  }
}

// ─── Récupérer l'historique des paiements d'un atelier ──────────────────────
export async function getPaymentHistory(atelierId: string) {
  try {
    const sb = getAdminClient();
    const { data, error } = await sb
      .from('subscription_payments')
      .select('*, plan:plans(name, currency)')
      .eq('atelier_id', atelierId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// ─── Obtenir l'atelier_id depuis l'user_id ───────────────────────────────────
export async function getAtelierIdFromUserId(userId: string): Promise<string | null> {
  try {
    const sb = getAdminClient();
    const { data } = await sb
      .from('profiles')
      .select('atelier_id')
      .eq('id', userId)
      .maybeSingle();
    return data?.atelier_id || null;
  } catch {
    return null;
  }
}
