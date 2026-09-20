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
    if (!waveApiKey) {
      if (process.env.NODE_ENV !== 'production' || process.env.SIMULATE_PAYMENTS === 'true') {
        console.info(`[PAYMENT_SIMULATION] Wave dev mode for ref: ${reference}`);
        return {
          success: true,
          checkout_url: `${APP_URL}/abonnement?payment=success&ref=${reference}&simulated=true`,
          payment_reference: reference,
          provider_session_id: `SIM-WAVE-${Date.now()}`,
        };
      }
      return { success: false, error: 'Wave non configuré.' };
    }

    const successUrl = `${APP_URL}/abonnement?payment=success&ref=${reference}`;
    const errorUrl = `${APP_URL}/abonnement?payment=error&ref=${reference}`;

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
        return { success: false, error: 'Erreur Wave lors de l\'initialisation.' };
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

  // Appel Orange Money
  if (provider === 'ORANGE_MONEY') {
    const clientId = process.env.ORANGE_CLIENT_ID;
    const clientSecret = process.env.ORANGE_CLIENT_SECRET;
    const merchantKey = process.env.ORANGE_MERCHANT_KEY;

    if (!clientId || !clientSecret || !merchantKey) {
      if (process.env.NODE_ENV !== 'production' || process.env.SIMULATE_PAYMENTS === 'true') {
        console.info(`[PAYMENT_SIMULATION] OM dev mode for ref: ${reference}`);
        return {
          success: true,
          checkout_url: `${APP_URL}/abonnement?payment=success&ref=${reference}&simulated=true`,
          payment_reference: reference,
          provider_session_id: `SIM-OM-${Date.now()}`,
        };
      }
      return { success: false, error: 'Orange Money non configuré.' };
    }

    const returnUrl = `${APP_URL}/abonnement?payment=success&ref=${reference}`;
    const notifUrl = `${APP_URL}/api/webhooks/orange-money`;

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
        return { success: false, error: 'Erreur authentification Orange Money.' };
      }
      const tokenData = await tokenResp.json();
      accessToken = tokenData.access_token;
    } catch {
      return { success: false, error: 'Impossible de contacter Orange Money.' };
    }

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
            reference: `AtelierPro — Formule ${plan.name}`,
          }),
        }
      );

      if (!omResp.ok) {
        return { success: false, error: 'Erreur lors de la création du paiement Orange Money.' };
      }

      const paymentData = await omResp.json();
      const paymentUrl = paymentData.payment_url as string;
      const payToken = paymentData.pay_token as string;

      await sb
        .from('subscription_payments')
        .update({ provider_transaction_id: payToken })
        .eq('id', paymentRow.id);

      return {
        success: true,
        checkout_url: paymentUrl,
        payment_reference: reference,
        provider_session_id: payToken,
      };
    } catch {
      return { success: false, error: 'Impossible de contacter Orange Money.' };
    }
  }

  return { success: false, error: 'Fournisseur de paiement non supporté.' };
}

// ─── Traitement centralisé et résilient de confirmation de paiement ──────────
export async function confirmSubscriptionPaymentTransaction(
  paymentReference: string,
  provider: SaaSProvider,
  amountReceived: number,
  eventId?: string
): Promise<{ success: boolean; error?: string; type?: string }> {
  const sb = getAdminClient();

  // 1. Tenter la RPC PostgreSQL
  try {
    const { data: rpcResult, error: rpcErr } = await sb.rpc(
      'confirm_initial_subscription_payment',
      {
        p_payment_reference: paymentReference,
        p_provider: provider,
        p_event_id: eventId || null,
        p_amount_received: amountReceived,
      }
    );

    if (!rpcErr && rpcResult?.success) {
      return rpcResult as { success: boolean; error?: string; type?: string };
    }
  } catch (err) {
    console.warn('[CONFIRM_PAYMENT] RPC failed, falling back to service_role handler:', err);
  }

  // 2. Traitement direct et résilient via service_role
  try {
    const { data: payment, error: pErr } = await sb
      .from('subscription_payments')
      .select('*, plan:plans(*)')
      .eq('provider_reference', paymentReference)
      .eq('provider', provider)
      .maybeSingle();

    if (pErr || !payment) {
      return { success: false, error: 'payment_not_found' };
    }

    if (payment.status === 'paid') {
      return { success: true, type: 'already_processed' };
    }

    // Vérification du montant anti-fraude
    if (amountReceived > 0 && Math.abs(Number(payment.amount) - amountReceived) > 1) {
      return { success: false, error: 'amount_mismatch' };
    }

    const now = new Date();
    const durationDays = payment.plan?.duration_days || 30;
    const isYearly = payment.plan?.billing_interval === 'year';

    // A. Paiement pour un atelier existant
    if (payment.atelier_id) {
      const { data: existingSub } = await sb
        .from('subscriptions')
        .select('*')
        .eq('atelier_id', payment.atelier_id)
        .maybeSingle();

      let newPeriodStart = now;
      let newPeriodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const isSamePlan = existingSub?.plan_id === payment.plan_id;
      const isActive =
        existingSub?.status === 'active' &&
        existingSub?.current_period_end &&
        new Date(existingSub.current_period_end) > now;

      if (isSamePlan && isActive) {
        // Renouvellement anticipé : conserver la fin actuelle
        newPeriodStart = new Date(existingSub.current_period_start || now);
        const currentEnd = new Date(existingSub.current_period_end);
        newPeriodEnd = isYearly
          ? new Date(currentEnd.setFullYear(currentEnd.getFullYear() + 1))
          : new Date(currentEnd.setMonth(currentEnd.getMonth() + 1));
      } else {
        // Changement de plan (upgrade) ou réactivation après expiration
        newPeriodStart = now;
        newPeriodEnd = isYearly
          ? new Date(new Date().setFullYear(now.getFullYear() + 1))
          : new Date(new Date().setMonth(now.getMonth() + 1));
      }

      let subId = existingSub?.id;
      if (!subId) {
        const { data: newSub } = await sb
          .from('subscriptions')
          .insert({
            atelier_id: payment.atelier_id,
            plan_id: payment.plan_id,
            status: 'active',
            started_at: now.toISOString(),
            current_period_start: newPeriodStart.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
          })
          .select('id')
          .single();
        subId = newSub?.id;
      } else {
        await sb
          .from('subscriptions')
          .update({
            status: 'active',
            plan_id: payment.plan_id,
            current_period_start: newPeriodStart.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
            grace_period_end: null,
            suspended_at: null,
            cancelled_at: null,
            updated_at: now.toISOString(),
          })
          .eq('id', subId);
      }

      await sb
        .from('subscription_payments')
        .update({
          status: 'paid',
          subscription_id: subId,
          paid_at: now.toISOString(),
          period_start: newPeriodStart.toISOString(),
          period_end: newPeriodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', payment.id);

      if (eventId) {
        await sb
          .from('webhook_events')
          .update({
            processed: true,
            processed_at: now.toISOString(),
            processing_status: 'processed',
          })
          .eq('event_id', eventId);
      }

      return {
        success: true,
        type: isSamePlan ? 'renewal' : 'upgrade',
      };
    }

    // B. Paiement de pré-inscription (signup)
    await sb
      .from('subscription_payments')
      .update({
        status: 'paid',
        paid_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', payment.id);

    if (payment.pending_signup_id) {
      await sb
        .from('pending_signups')
        .update({
          status: 'paid',
          paid_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', payment.pending_signup_id);
    }

    return { success: true, type: 'initial_payment' };
  } catch (err: any) {
    console.error('[CONFIRM_PAYMENT_FATAL]', err);
    return { success: false, error: err?.message || 'internal_error' };
  }
}
