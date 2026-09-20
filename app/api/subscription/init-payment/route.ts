/**
 * POST /api/subscription/init-payment
 * Crée une pré-inscription et initialise le paiement Wave ou Orange Money.
 * Accessible sans authentification (l'utilisateur n'a pas encore de compte).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  initWavePaymentForSignup,
  initOrangeMoneyPaymentForSignup,
} from '@/lib/billing/payment-service';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, workshopName, planId, provider } = body;

    // ─── Validation des champs ───────────────────────────────────────────────
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'Prénom et nom obligatoires.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone || '').replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan requis.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!['WAVE', 'ORANGE_MONEY'].includes(provider)) {
      return NextResponse.json(
        { error: 'Fournisseur de paiement invalide.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const sb = getAdminClient();

    // ─── Vérifier si un compte existe déjà avec ce téléphone ───────────────
    const normalizedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+221${cleanPhone}`;
    const { data: existingProfile } = await sb
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        {
          error: 'Un compte existe déjà avec ce numéro de téléphone.',
          code: 'PHONE_ALREADY_EXISTS',
        },
        { status: 409 }
      );
    }

    // ─── Vérifier qu'un pending_signup 'paid' non complété n'existe pas déjà ─
    const { data: existingSignup } = await sb
      .from('pending_signups')
      .select('id, status')
      .eq('phone', normalizedPhone)
      .in('status', ['paid', 'payment_processing'])
      .maybeSingle();

    if (existingSignup?.status === 'paid') {
      return NextResponse.json(
        {
          error: 'Un paiement confirmé existe déjà pour ce numéro. Finalisez votre compte.',
          code: 'PAYMENT_ALREADY_CONFIRMED',
          pending_signup_id: existingSignup.id,
          redirect: `/signup/complete?pid=${existingSignup.id}`,
        },
        { status: 409 }
      );
    }

    // ─── Vérifier que le plan existe ────────────────────────────────────────
    let plan: any = null;
    const { data: dbPlan } = await sb
      .from('plans')
      .select('id, name, slug, price, is_active')
      .eq('id', planId)
      .maybeSingle();

    if (dbPlan) {
      plan = dbPlan;
    } else if (planId === 'plan-discovery' || planId === 'discovery') {
      plan = { id: 'plan-discovery', name: 'Découverte', slug: 'discovery', price: 0, is_active: true };
    } else if (planId === 'plan-starter' || planId === 'starter') {
      plan = { id: 'plan-starter', name: 'Starter', slug: 'starter', price: 5000, is_active: true };
    } else if (planId === 'plan-pro' || planId === 'pro') {
      plan = { id: 'plan-pro', name: 'Pro', slug: 'pro', price: 15000, is_active: true };
    }

    if (!plan || !plan.is_active) {
      return NextResponse.json(
        { error: 'Plan invalide ou inactif.', code: 'INVALID_PLAN' },
        { status: 404 }
      );
    }

    // ─── INTERDICTION STRICTE : Pas de paiement Wave/OM pour le plan Découverte ─
    if (Number(plan.price) === 0 || plan.slug === 'discovery' || plan.slug === 'decouverte') {
      console.warn('[PAYMENT_BLOCKED] Tentative d’initialisation de paiement pour le plan gratuit Découverte.');
      return NextResponse.json(
        {
          error: 'Le plan Découverte est 100% gratuit. Aucun paiement Wave ou Orange Money n\'est requis.',
          code: 'FREE_PLAN_NO_PAYMENT_REQUIRED',
        },
        { status: 400 }
      );
    }

    // ─── Créer la pré-inscription ────────────────────────────────────────────
    const { data: signup, error: signupErr } = await sb
      .from('pending_signups')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: normalizedPhone,
        workshop_name: (workshopName || `Atelier ${firstName.trim()}`).trim(),
        plan_id: planId,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (signupErr || !signup) {
      console.error('[SIGNUP_INSERT_ERROR]', signupErr);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la pré-inscription.', code: 'SIGNUP_ERROR' },
        { status: 500 }
      );
    }

    console.info(`[PAYMENT_INIT] Signup ${signup.id} créé pour ${normalizedPhone}`);

    // ─── Initier le paiement selon le fournisseur ───────────────────────────
    let result;
    if (provider === 'WAVE') {
      result = await initWavePaymentForSignup(signup.id, planId, normalizedPhone);
    } else {
      result = await initOrangeMoneyPaymentForSignup(signup.id, planId, normalizedPhone);
    }

    if (!result.success) {
      // Annuler la pré-inscription si le paiement échoue
      await sb
        .from('pending_signups')
        .update({ status: 'failed' })
        .eq('id', signup.id);

      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'initialisation du paiement.', code: 'PAYMENT_INIT_ERROR' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      checkout_url: result.checkout_url,
      payment_reference: result.payment_reference,
      pending_signup_id: signup.id,
    });
  } catch (err) {
    console.error('[INIT_PAYMENT_ERROR]', err);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
