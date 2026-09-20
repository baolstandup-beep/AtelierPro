/**
 * POST /api/subscription/renew
 * Initie un paiement de renouvellement pour un utilisateur connecté.
 * Renouvellement anticipé : conserve les jours restants.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { initRenewalPayment } from '@/lib/billing/payment-service';
import { getAtelierIdFromUserId } from '@/lib/billing/subscription-service';
import type { SaaSProvider } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(list) {
            list.forEach(({ name, value, options }) => {
              try { cookieStore.set({ name, value, ...options }); } catch {}
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, provider } = body as { planId: string; provider: SaaSProvider };

    if (!planId || !['WAVE', 'ORANGE_MONEY'].includes(provider)) {
      return NextResponse.json({ error: 'Paramètres invalides.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const atelierId = await getAtelierIdFromUserId(user.id);
    if (!atelierId) {
      return NextResponse.json({ error: 'Aucun atelier trouvé.', code: 'NO_ATELIER' }, { status: 404 });
    }

    // Récupérer l'abonnement existant
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: sub } = await sb
      .from('subscriptions')
      .select('id, status, plan_id')
      .eq('atelier_id', atelierId)
      .in('status', ['active', 'grace_period', 'expired', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé.', code: 'NO_SUBSCRIPTION' }, { status: 404 });
    }

    const result = await initRenewalPayment(atelierId, sub.id, planId, provider);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'initiation du renouvellement.', code: 'RENEWAL_INIT_ERROR' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      checkout_url: result.checkout_url,
      payment_reference: result.payment_reference,
    });
  } catch (err) {
    console.error('[RENEW_ERROR]', err);
    return NextResponse.json({ error: 'Erreur interne.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

/**
 * GET /api/subscription/renew — Statut d'abonnement de l'utilisateur connecté
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(list) {
            list.forEach(({ name, value, options }) => {
              try { cookieStore.set({ name, value, ...options }); } catch {}
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { getSubscriptionAccess, getAtelierIdFromUserId } = await import('@/lib/billing/subscription-service');
    const atelierId = await getAtelierIdFromUserId(user.id);

    if (!atelierId) {
      return NextResponse.json({ level: 'BLOCKED', message: 'Aucun atelier.' });
    }

    const access = await getSubscriptionAccess(atelierId);
    return NextResponse.json(access);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
