/**
 * AtelierPro — Service centralisé d'abonnement & quotas
 * Source unique de vérité pour l'état des abonnements, quotas et droits.
 * Utilisé UNIQUEMENT côté serveur (Server Components, API Routes, Server Actions).
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Subscription,
  SubscriptionAccess,
  Plan,
} from '@/lib/types';
import {
  CANONICAL_PLANS,
  PlanSlug,
  getPlanDefinition,
  hasPlanFeature,
  FREE_PLAN_CLIENT_LIMIT_REACHED,
  FREE_PLAN_CLIENT_LIMIT_MESSAGE,
} from './plan-guard';

// ─── Client Supabase Admin (service_role) ───────────────────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[Billing] Supabase service_role non configuré.');
  return createClient(url, key, { auth: { persistSession: false } });
}

const GRACE_PERIOD_DAYS = 3;

/**
 * Retourne l'état d'accès d'un atelier de manière centralisée.
 * En modèle Freemium : tout atelier sans abonnement payant bénéficie du plan DÉCOUVERTE actif.
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

    // 1. Récupérer l'abonnement en base
    const { data: sub, error } = await sb
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('atelier_id', atelierId)
      .in('status', ['active', 'grace_period', 'expired', 'pending', 'suspended'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Si aucun abonnement en base ou erreur de table, l'atelier est en DÉCOUVERTE (0 FCFA, gratuit)
    if (error || !sub) {
      const discoveryPlan: Plan = {
        id: 'plan-discovery',
        name: CANONICAL_PLANS.discovery.name,
        slug: 'discovery',
        description: 'Plan Découverte gratuit',
        price: 0,
        currency: 'XOF',
        duration_days: 36500,
        billing_interval: 'month',
        features: CANONICAL_PLANS.discovery.features,
        is_active: true,
        sort_order: 1,
        created_at: '',
        updated_at: '',
      };

      const virtualDiscoverySub: Subscription = {
        id: 'virtual-discovery-' + atelierId,
        atelier_id: atelierId,
        plan_id: discoveryPlan.id,
        status: 'active',
        started_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: undefined, // Sans expiration
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        plan: discoveryPlan,
      };

      return {
        level: 'ACTIVE',
        subscription: virtualDiscoverySub,
      };
    }

    const subscription = sub as Subscription;
    const planSlug = (subscription.plan?.slug || 'discovery').toLowerCase() as PlanSlug;

    // ─ Cas Découverte : actif en permanence sans date d'expiration ─
    if (planSlug === 'discovery' || !subscription.current_period_end) {
      return {
        level: 'ACTIVE',
        subscription,
      };
    }

    const periodEnd = new Date(subscription.current_period_end);
    const gracePeriodEnd = subscription.grace_period_end
      ? new Date(subscription.grace_period_end)
      : null;

    // ─ Cas 1 : Abonnement payant actif dans la période ─
    if (subscription.status === 'active' && periodEnd > now) {
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
      periodEnd <= now
    ) {
      const graceEnd =
        gracePeriodEnd ||
        new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      if (graceEnd > now) {
        const msGrace = graceEnd.getTime() - now.getTime();
        const graceDaysRemaining = Math.ceil(msGrace / (1000 * 60 * 60 * 24));

        return {
          level: 'GRACE',
          subscription,
          graceDaysRemaining,
          message: `Votre abonnement ${subscription.plan?.name || 'AtelierPro'} a expiré. Période de grâce : ${graceDaysRemaining}j restants.`,
        };
      }
    }

    // ─ Cas 3 : Expiré au-delà de la période de grâce ─
    // IMPORTANT : Les données sont TOUJOURS conservées intactes !
    // Mode READ_ONLY pour consulter l'historique et demander le renouvellement
    return {
      level: 'READ_ONLY',
      subscription,
      message: 'Votre abonnement AtelierPro a expiré. Vos données sont intactes. Renouvelez votre abonnement pour continuer.',
    };
  } catch (err: any) {
    console.error('[SubscriptionService Fatal]', err);
    return { level: 'ACTIVE' }; // Tolérant en cas de panne réseau
  }
}

/**
 * Récupère les métriques de quota client pour un atelier
 */
export async function getAtelierClientQuota(atelierId: string): Promise<{
  planSlug: PlanSlug;
  clientCount: number;
  clientLimit: number | null; // 5 pour discovery, null pour starter/pro
  canCreate: boolean;
  isNearLimit: boolean;
  isLimitReached: boolean;
}> {
  const access = await getSubscriptionAccess(atelierId);
  const planSlug = (access.subscription?.plan?.slug || 'discovery').toLowerCase() as PlanSlug;
  const planDef = getPlanDefinition(planSlug);

  const sb = getAdminClient();
  const { count } = await sb
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('atelier_id', atelierId);

  const clientCount = count ?? 0;
  const clientLimit = planDef.maxClients;

  if (clientLimit === null) {
    return {
      planSlug,
      clientCount,
      clientLimit: null,
      canCreate: true,
      isNearLimit: false,
      isLimitReached: false,
    };
  }

  const isLimitReached = clientCount >= clientLimit;
  const isNearLimit = clientCount === clientLimit - 1;

  return {
    planSlug,
    clientCount,
    clientLimit,
    canCreate: !isLimitReached,
    isNearLimit,
    isLimitReached,
  };
}

/**
 * Vérifie si un atelier a le droit de créer un nouveau client.
 * Lève ou retourne une erreur explicite FREE_PLAN_CLIENT_LIMIT_REACHED si la limite est atteinte.
 */
export async function canCreateClient(atelierId: string): Promise<{
  allowed: boolean;
  error?: string;
  currentCount: number;
  maxAllowed: number | null;
}> {
  const quota = await getAtelierClientQuota(atelierId);

  if (!quota.canCreate) {
    return {
      allowed: false,
      error: FREE_PLAN_CLIENT_LIMIT_REACHED,
      currentCount: quota.clientCount,
      maxAllowed: quota.clientLimit,
    };
  }

  return {
    allowed: true,
    currentCount: quota.clientCount,
    maxAllowed: quota.clientLimit,
  };
}

/**
 * Vérifie si un atelier dispose d'une fonctionnalité spécifique
 */
export async function hasFeature(
  atelierId: string,
  feature: keyof ReturnType<typeof getPlanDefinition>['permissions']
): Promise<boolean> {
  const access = await getSubscriptionAccess(atelierId);
  const planSlug = (access.subscription?.plan?.slug || 'discovery').toLowerCase() as PlanSlug;
  return hasPlanFeature(planSlug, feature);
}

/**
 * Récupère l'ID de l'atelier associé à un utilisateur
 */
export async function getAtelierIdFromUserId(userId: string): Promise<string | null> {
  const sb = getAdminClient();
  const { data: profile } = await sb
    .from('profiles')
    .select('atelier_id')
    .eq('id', userId)
    .maybeSingle();
  return profile?.atelier_id || null;
}

