/**
 * POST /api/subscription/renew
 * Initie un paiement de renouvellement pour un utilisateur connecté.
 * Renouvellement anticipé : conserve les jours restants.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { initRenewalPayment, initChariowRenewalPayment } from '@/lib/billing/payment-service';
import { isChariowEnabled, isValidEmail } from '@/lib/billing/chariow';
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
    const useChariow = isChariowEnabled();
    const { planId } = body as { planId: string };
    const provider = (useChariow ? 'CHARIOW' : body.provider) as SaaSProvider;
    const email = String(body.email || '').trim().toLowerCase();

    if (!planId || !['WAVE', 'ORANGE_MONEY', 'CHARIOW'].includes(provider)) {
      return NextResponse.json({ error: 'Paramètres invalides.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const atelierId = await getAtelierIdFromUserId(user.id);
    if (!atelierId) {
      return NextResponse.json({ error: 'Aucun atelier trouvé.', code: 'NO_ATELIER' }, { status: 404 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Résoudre le plan cible (accepte soit UUID, soit slug 'starter' / 'pro' / 'discovery')
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
    let planQuery = sb.from('plans').select('id, slug, name, price').eq('is_active', true);
    if (isUuid) {
      planQuery = planQuery.eq('id', planId);
    } else {
      planQuery = planQuery.eq('slug', planId.toLowerCase());
    }
    const { data: targetPlan, error: planErr } = await planQuery.maybeSingle();

    if (planErr || !targetPlan) {
      return NextResponse.json({ error: 'Plan introuvable.', code: 'PLAN_NOT_FOUND' }, { status: 404 });
    }

    // Récupérer ou initialiser l'abonnement existant de cet atelier
    let { data: sub } = await sb
      .from('subscriptions')
      .select('id, status, plan_id')
      .eq('atelier_id', atelierId)
      .maybeSingle();

    if (!sub) {
      const { data: newSub, error: subCreateErr } = await sb
        .from('subscriptions')
        .insert({
          atelier_id: atelierId,
          plan_id: targetPlan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: targetPlan.slug === 'discovery' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id, status, plan_id')
        .single();

      if (subCreateErr || !newSub) {
        return NextResponse.json({ error: 'Impossible d\'initialiser l\'abonnement atelier.', code: 'SUB_INIT_ERROR' }, { status: 500 });
      }
      sub = newSub;
    }

    // CAS SPÉCIAL : Passage à la formule Découverte (0 FCFA)
    if (targetPlan.slug === 'discovery' || Number(targetPlan.price) === 0) {
      await sb
        .from('subscriptions')
        .update({
          plan_id: targetPlan.id,
          status: 'active',
          current_period_end: null,
          grace_period_end: null,
          suspended_at: null,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);

      return NextResponse.json({
        success: true,
        plan: 'discovery',
        message: 'Votre atelier est désormais sur la formule Découverte gratuite.',
        redirect: '/dashboard',
      });
    }

    // PLANS PAYANTS (Starter, Pro) : initier transaction Wave ou Orange Money
    let result;
    if (provider === 'CHARIOW') {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'Une adresse e-mail valide est requise pour le paiement.', code: 'VALIDATION_ERROR' }, { status: 400 });
      }
      const { data: prof } = await sb.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
      const fwd = request.headers.get('x-forwarded-for');
      result = await initChariowRenewalPayment(atelierId, sub.id, targetPlan.id, {
        email,
        firstName: String(prof?.full_name || '').trim().split(/\s+/)[0] || 'Client',
        lastName: String(prof?.full_name || '').trim().split(/\s+/).slice(1).join(' ') || 'AtelierPro',
        phone: prof?.phone || String(body.phone || ''),
        ip: fwd ? fwd.split(',')[0].trim() : undefined,
      });
    } else {
      result = await initRenewalPayment(atelierId, sub.id, targetPlan.id, provider);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'initiation du paiement.', code: 'PAYMENT_INIT_ERROR' },
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
