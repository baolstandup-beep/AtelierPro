/**
 * AtelierPro — Service de paiement d'abonnement via Bictorys.
 * Côté serveur uniquement. Le montant provient toujours de la base de données.
 */

import { createClient } from '@supabase/supabase-js';
import type { Plan, SaaSProvider } from '@/lib/types';
import { createBictorysCharge } from '@/lib/billing/bictorys';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[Payment] Supabase service_role non configuré.');
  return createClient(url, key, { auth: { persistSession: false } });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface PaymentInitResult {
  success: boolean;
  checkout_url?: string;
  payment_reference?: string;
  provider_session_id?: string;
  qr_code?: string;
  provider_message?: string;
  error?: string;
}

export async function getPlanFromDB(planId: string): Promise<Plan | null> {
  const sb = getAdminClient();
  const { data, error } = await sb.from('plans').select('*')
    .eq('id', planId).eq('is_active', true).maybeSingle();
  if (error || !data) return null;
  return data as Plan;
}

async function initSignupPayment(
  provider: SaaSProvider,
  pendingSignupId: string,
  planId: string,
  customerPhone: string
): Promise<PaymentInitResult> {
  const plan = await getPlanFromDB(planId);
  if (!plan) return { success: false, error: 'Plan invalide ou inactif.' };

  const prefix = provider === 'WAVE' ? 'WAVE' : 'OM';
  const reference = `${prefix}-SIGNUP-${pendingSignupId}-${Date.now()}`;
  const successUrl = `${APP_URL}/signup/complete?ref=${encodeURIComponent(reference)}&status=success`;
  const errorUrl = `${APP_URL}/signup/complete?ref=${encodeURIComponent(reference)}&status=error`;

  let charge;
  try {
    charge = await createBictorysCharge({
      provider,
      amount: Number(plan.price),
      reference,
      successUrl,
      errorUrl,
      customer: { phone: customerPhone, country: 'SN' },
    });
  } catch (error) {
    console.error('[BICTORYS_SIGNUP_ERROR]', error);
    return { success: false, error: error instanceof Error ? error.message : 'Impossible de contacter Bictorys.' };
  }

  const sb = getAdminClient();
  const { error: insertErr } = await sb.from('subscription_payments').insert({
    pending_signup_id: pendingSignupId,
    plan_id: planId,
    provider,
    provider_transaction_id: charge.transactionId,
    provider_reference: reference,
    amount: plan.price,
    currency: 'XOF',
    status: 'pending',
  });
  if (insertErr) {
    console.error('[PAYMENT_INSERT_ERROR]', insertErr);
    return { success: false, error: 'Erreur lors de l’enregistrement du paiement.' };
  }

  await sb.from('pending_signups').update({
    payment_reference: reference,
    status: 'payment_processing',
  }).eq('id', pendingSignupId);

  return {
    success: true,
    checkout_url: charge.checkoutUrl,
    payment_reference: reference,
    provider_session_id: charge.transactionId,
    qr_code: charge.qrCode,
    provider_message: charge.message,
  };
}

export function initWavePaymentForSignup(pendingSignupId: string, planId: string, customerPhone: string) {
  return initSignupPayment('WAVE', pendingSignupId, planId, customerPhone);
}

export function initOrangeMoneyPaymentForSignup(pendingSignupId: string, planId: string, customerPhone: string) {
  return initSignupPayment('ORANGE_MONEY', pendingSignupId, planId, customerPhone);
}

export async function initRenewalPayment(
  atelierId: string,
  subscriptionId: string,
  planId: string,
  provider: SaaSProvider
): Promise<PaymentInitResult> {
  const plan = await getPlanFromDB(planId);
  if (!plan) return { success: false, error: 'Plan invalide ou inactif.' };

  const prefix = provider === 'WAVE' ? 'WAVE' : 'OM';
  const reference = `${prefix}-RENEW-${atelierId}-${Date.now()}`;
  const sb = getAdminClient();
  const { data: paymentRow, error: insertErr } = await sb.from('subscription_payments').insert({
    atelier_id: atelierId,
    subscription_id: subscriptionId,
    plan_id: planId,
    provider,
    provider_reference: reference,
    amount: plan.price,
    currency: 'XOF',
    status: 'pending',
  }).select('id').single();
  if (insertErr || !paymentRow) {
    return { success: false, error: 'Erreur lors de la création du paiement.' };
  }

  if (!process.env.BICTORYS_API_KEY && (process.env.NODE_ENV !== 'production' || process.env.SIMULATE_PAYMENTS === 'true')) {
    return {
      success: true,
      checkout_url: `${APP_URL}/abonnement?payment=success&ref=${encodeURIComponent(reference)}&simulated=true`,
      payment_reference: reference,
      provider_session_id: `SIM-${prefix}-${Date.now()}`,
    };
  }

  try {
    const charge = await createBictorysCharge({
      provider,
      amount: Number(plan.price),
      reference,
      successUrl: `${APP_URL}/abonnement?payment=success&ref=${encodeURIComponent(reference)}`,
      errorUrl: `${APP_URL}/abonnement?payment=error&ref=${encodeURIComponent(reference)}`,
      customer: { country: 'SN' },
    });

    await sb.from('subscription_payments').update({
      provider_transaction_id: charge.transactionId,
      status: 'processing',
    }).eq('id', paymentRow.id);

    return {
      success: true,
      checkout_url: charge.checkoutUrl,
      payment_reference: reference,
      provider_session_id: charge.transactionId,
      qr_code: charge.qrCode,
      provider_message: charge.message,
    };
  } catch (error) {
    await sb.from('subscription_payments').update({ status: 'failed' }).eq('id', paymentRow.id);
    console.error('[BICTORYS_RENEWAL_ERROR]', error);
    return { success: false, error: error instanceof Error ? error.message : 'Impossible de contacter Bictorys.' };
  }
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
  } catch (err: unknown) {
    console.error('[CONFIRM_PAYMENT_FATAL]', err);
    return { success: false, error: err instanceof Error ? err.message : 'internal_error' };
  }
}
