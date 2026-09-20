/**
 * AtelierPro — Service de paiement d'abonnement
 * Côté serveur uniquement. Gère l'initiation des paiements Wave et Orange Money.
 * Le montant est TOUJOURS récupéré depuis la base de données (jamais du frontend).
 */

import { createClient } from '@supabase/supabase-js';
import type { Plan, SaaSProvider } from '@/lib/types';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[Payment] Supabase service_role non configuré.');
  return createClient(url, key, { auth: { persistSession: false } });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Types internes ──────────────────────────────────────────────────────────
export interface PaymentInitResult {
  success: boolean;
  checkout_url?: string;
  payment_reference?: string;
  provider_session_id?: string;
  error?: string;
}

// ─── Récupérer un plan validé depuis la DB (anti-fraude montant) ─────────────
export async function getPlanFromDB(planId: string): Promise<Plan | null> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from('plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as Plan;
}

// ─── Initier un paiement Wave (première inscription) ─────────────────────────
export async function initWavePaymentForSignup(
  pendingSignupId: string,
  planId: string,
  customerPhone: string
): Promise<PaymentInitResult> {
  const waveApiKey = process.env.WAVE_API_KEY;
  if (!waveApiKey) {
    return { success: false, error: 'Fournisseur Wave non configuré.' };
  }

  const plan = await getPlanFromDB(planId);
  if (!plan) {
    return { success: false, error: 'Plan invalide ou inactif.' };
  }

  const reference = `WAVE-SIGNUP-${pendingSignupId}-${Date.now()}`;
  const successUrl = `${APP_URL}/signup/complete?ref=${reference}&status=success`;
  const errorUrl = `${APP_URL}/signup/complete?ref=${reference}&status=error`;

  // Appel API Wave
  let waveData: Record<string, unknown>;
  try {
    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${waveApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(Math.round(plan.price)),
        currency: 'XOF',
        error_url: errorUrl,
        success_url: successUrl,
        client_reference: reference,
      }),
    });

    if (!waveResponse.ok) {
      const errText = await waveResponse.text();
      console.error('[WAVE_API_ERROR]', errText);
      return { success: false, error: 'Erreur lors de la connexion à Wave.' };
    }

    waveData = await waveResponse.json();
  } catch (err) {
    console.error('[WAVE_FETCH_ERROR]', err);
    return { success: false, error: 'Impossible de contacter Wave.' };
  }

  const checkoutUrl = waveData.wave_launch_url as string;
  const waveSessionId = waveData.id as string;

  // Enregistrer en base
  const sb = getAdminClient();
  const { error: insertErr } = await sb.from('subscription_payments').insert({
    pending_signup_id: pendingSignupId,
    plan_id: planId,
    provider: 'WAVE',
    provider_transaction_id: waveSessionId,
    provider_reference: reference,
    amount: plan.price,
    currency: 'XOF',
    status: 'pending',
  });

  if (insertErr) {
    console.error('[PAYMENT_INSERT_ERROR]', insertErr);
    return { success: false, error: 'Erreur lors de l\'enregistrement du paiement.' };
  }

  // Mettre à jour la référence dans pending_signups
  await sb
    .from('pending_signups')
    .update({
      payment_reference: reference,
      status: 'payment_processing',
    })
    .eq('id', pendingSignupId);

  console.info(`[PAYMENT_INIT] Wave signup payment: ref=${reference}, session=${waveSessionId}`);

  return {
    success: true,
    checkout_url: checkoutUrl,
    payment_reference: reference,
    provider_session_id: waveSessionId,
  };
}

// ─── Initier un paiement Orange Money (première inscription) ──────────────────
export async function initOrangeMoneyPaymentForSignup(
  pendingSignupId: string,
  planId: string,
  customerPhone: string
): Promise<PaymentInitResult> {
  const clientId = process.env.ORANGE_CLIENT_ID;
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  const merchantKey = process.env.ORANGE_MERCHANT_KEY;

  if (!clientId || !clientSecret || !merchantKey) {
    return { success: false, error: 'Fournisseur Orange Money non configuré.' };
  }

  const plan = await getPlanFromDB(planId);
  if (!plan) {
    return { success: false, error: 'Plan invalide ou inactif.' };
  }

  const reference = `OM-SIGNUP-${pendingSignupId}-${Date.now()}`;
  const returnUrl = `${APP_URL}/signup/complete?ref=${reference}`;
  const notifUrl = `${APP_URL}/api/webhooks/orange-money`;

  // Récupérer le token Orange Money
  let accessToken: string;
  try {
    const tokenCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResp = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${tokenCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResp.ok) {
      console.error('[OM_TOKEN_ERROR]', await tokenResp.text());
      return { success: false, error: 'Erreur authentification Orange Money.' };
    }
    const tokenData = await tokenResp.json();
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[OM_TOKEN_FETCH_ERROR]', err);
    return { success: false, error: 'Impossible de contacter Orange Money.' };
  }

  // Créer le paiement Orange Money
  let paymentData: Record<string, unknown>;
  try {
    const omResp = await fetch(
      'https://api.orange.com/orange-money-webpay/dev/v1/webpayment',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_key: merchantKey,
          currency: 'OUV',
          order_id: reference,
          amount: Math.round(plan.price),
          return_url: returnUrl,
          cancel_url: `${returnUrl}&status=cancel`,
          notif_url: notifUrl,
          lang: 'fr',
          reference: `Abonnement AtelierPro ${plan.name}`,
        }),
      }
    );

    if (!omResp.ok) {
      console.error('[OM_PAYMENT_ERROR]', await omResp.text());
      return { success: false, error: 'Erreur lors de la création du paiement Orange Money.' };
    }
    paymentData = await omResp.json();
  } catch (err) {
    console.error('[OM_PAYMENT_FETCH_ERROR]', err);
    return { success: false, error: 'Impossible de contacter Orange Money.' };
  }

  const paymentUrl = paymentData.payment_url as string;
  const payToken = paymentData.pay_token as string;

  // Enregistrer en base
  const sb = getAdminClient();
  const { error: insertErr } = await sb.from('subscription_payments').insert({
    pending_signup_id: pendingSignupId,
    plan_id: planId,
    provider: 'ORANGE_MONEY',
    provider_transaction_id: payToken,
    provider_reference: reference,
    amount: plan.price,
    currency: 'XOF',
    status: 'pending',
  });

  if (insertErr) {
    console.error('[OM_INSERT_ERROR]', insertErr);
    return { success: false, error: 'Erreur lors de l\'enregistrement du paiement.' };
  }

  await sb
    .from('pending_signups')
    .update({
      payment_reference: reference,
      status: 'payment_processing',
    })
    .eq('id', pendingSignupId);

  console.info(`[PAYMENT_INIT] OM signup payment: ref=${reference}`);

  return {
    success: true,
    checkout_url: paymentUrl,
    payment_reference: reference,
    provider_session_id: payToken,
  };
}

// ─── Initier un paiement de renouvellement (utilisateur connecté) ────────────
export async function initRenewalPayment(
  atelierId: string,
  subscriptionId: string,
  planId: string,
  provider: SaaSProvider
): Promise<PaymentInitResult> {
  const plan = await getPlanFromDB(planId);
  if (!plan) {
    return { success: false, error: 'Plan invalide ou inactif.' };
  }

  const sb = getAdminClient();
  const reference =
    provider === 'WAVE'
      ? `WAVE-RENEW-${atelierId}-${Date.now()}`
      : `OM-RENEW-${atelierId}-${Date.now()}`;

  // Créer l'entrée de paiement en 'pending'
  const { data: paymentRow, error: insertErr } = await sb
    .from('subscription_payments')
    .insert({
      atelier_id: atelierId,
      subscription_id: subscriptionId,
      plan_id: planId,
      provider,
      provider_reference: reference,
      amount: plan.price,
      currency: 'XOF',
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !paymentRow) {
    return { success: false, error: 'Erreur lors de la création du paiement.' };
  }

  // Appel Wave
  if (provider === 'WAVE') {
    const waveApiKey = process.env.WAVE_API_KEY;
    if (!waveApiKey) return { success: false, error: 'Wave non configuré.' };

    const successUrl = `${APP_URL}/settings/billing?renewal=success&ref=${reference}`;
    const errorUrl = `${APP_URL}/settings/billing?renewal=error&ref=${reference}`;

    try {
      const waveResp = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waveApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: String(Math.round(plan.price)),
          currency: 'XOF',
          error_url: errorUrl,
          success_url: successUrl,
          client_reference: reference,
        }),
      });

      if (!waveResp.ok) {
        return { success: false, error: 'Erreur Wave lors du renouvellement.' };
      }

      const waveData = await waveResp.json();
      await sb
        .from('subscription_payments')
        .update({ provider_transaction_id: waveData.id })
        .eq('id', paymentRow.id);

      return {
        success: true,
        checkout_url: waveData.wave_launch_url,
        payment_reference: reference,
        provider_session_id: waveData.id,
      };
    } catch {
      return { success: false, error: 'Impossible de contacter Wave.' };
    }
  }

  return { success: false, error: 'Fournisseur non supporté pour le renouvellement.' };
}
