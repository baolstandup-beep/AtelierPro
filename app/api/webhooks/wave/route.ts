/**
 * POST /api/webhooks/wave
 * Webhook Wave Business — Traitement idempotent et sécurisé.
 * Gère :
 *  1. Les paiements de première inscription (pending_signup)
 *  2. Les renouvellements d'abonnement (subscription existante)
 *
 * SÉCURITÉ : Vérification signature HMAC-SHA256 + timestamp anti-replay.
 * IDEMPOTENCE : Unicité sur (provider, event_id) dans webhook_events.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── Vérification signature Wave ─────────────────────────────────────────────
function verifyWaveSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Anti-replay : tolérance 5 minutes
  const currentTs = Math.floor(Date.now() / 1000);
  const webhookTs = parseInt(timestamp, 10);
  if (isNaN(webhookTs) || Math.abs(currentTs - webhookTs) > 300) {
    console.error('[WAVE_SIGNATURE] Timestamp hors tolérance:', { currentTs, webhookTs });
    return false;
  }

  const payload = `${timestamp}${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signatures.includes(expectedSig);
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get('wave-signature') || request.headers.get('Wave-Signature');
    const webhookSecret = process.env.WAVE_WEBHOOK_SECRET;

    // ─── 1. Vérification de signature ─────────────────────────────────────
    if (!verifyWaveSignature(rawBody, signatureHeader, webhookSecret)) {
      console.error('[WAVE_SIGNATURE_INVALID] Signature invalide ou absente');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.info('[WAVE_WEBHOOK_RECEIVED] Signature valide');

    const payload = JSON.parse(rawBody);
    const eventId = payload.id as string;
    const eventType = payload.type as string;

    // ─── 2. Ignorer les événements non pertinents ──────────────────────────
    if (eventType !== 'checkout.session.completed') {
      return NextResponse.json({ received: true, status: 'ignored', event_type: eventType });
    }

    const sessionData = payload.data || {};
    const clientReference = sessionData.client_reference as string;
    const paymentStatus = sessionData.payment_status as string;
    const amountReceived = Number(sessionData.amount || 0);

    if (paymentStatus !== 'succeeded') {
      console.info('[WAVE_WEBHOOK] Paiement non succeeded:', paymentStatus);
      return NextResponse.json({ received: true, status: 'ignored', payment_status: paymentStatus });
    }

    const sb = getAdminClient();

    // ─── 3. Idempotence — vérifier si cet événement a déjà été traité ─────
    const { data: existingEvent } = await sb
      .from('webhook_events')
      .select('id, processed')
      .eq('event_id', eventId)
      .eq('provider', 'WAVE')
      .maybeSingle();

    if (existingEvent?.processed) {
      console.info('[WAVE_DUPLICATE_EVENT] Déjà traité:', eventId);
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    // ─── 4. Enregistrer l'événement IMMÉDIATEMENT (anti-doublon) ──────────
    if (!existingEvent) {
      await sb.from('webhook_events').insert({
        provider: 'WAVE',
        event_id: eventId,
        event_type: eventType,
        payload,
        payment_reference: clientReference,
        signature_valid: true,
        processing_status: 'pending',
        signature: true,
      });
    }

    // ─── 5. Confirmer le paiement via RPC ou transaction sécurisée ──────
    console.info('[WAVE_PAYMENT_CONFIRMING] Reference:', clientReference);

    const { confirmSubscriptionPaymentTransaction } = await import('@/lib/billing/payment-service');
    const result = await confirmSubscriptionPaymentTransaction(
      clientReference,
      'WAVE',
      amountReceived,
      eventId
    );

    if (!result.success) {
      console.error('[WAVE_CONFIRM_FAILED]', result.error);
      const isAmountMismatch = result.error === 'amount_mismatch';

      await sb
        .from('webhook_events')
        .update({
          processing_status: 'error',
          error_message: result.error || 'Confirmation échouée',
        })
        .eq('event_id', eventId)
        .eq('provider', 'WAVE');

      return NextResponse.json(
        { error: result.error || 'Confirmation échouée' },
        { status: isAmountMismatch ? 400 : 500 }
      );
    }

    // ─── 6. Marquer l'événement comme traité ──────────────────────────────
    await sb
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_status: 'processed',
      })
      .eq('event_id', eventId)
      .eq('provider', 'WAVE');

    const logMsg = result?.type === 'renewal'
      ? '[SUBSCRIPTION_RENEWED]'
      : '[SUBSCRIPTION_PAYMENT_CONFIRMED]';
    console.info(`${logMsg} Reference: ${clientReference}, Event: ${eventId}`);

    return NextResponse.json({ received: true, status: 'processed', type: result?.type });
  } catch (err) {
    console.error('[WAVE_WEBHOOK_FATAL]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
