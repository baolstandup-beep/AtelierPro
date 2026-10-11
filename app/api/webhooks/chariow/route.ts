/**
 * POST /api/webhooks/chariow — Pulse Chariow (https://chariow.dev).
 * - Signature HMAC-SHA256 sur le corps BRUT (secret du Pulse, pas la clé API).
 * - Idempotence via webhook_events (event_id = x-pulse-delivery-id).
 * - Réponse 200 pour les erreurs permanentes (sinon Chariow réessaie puis désactive le Pulse
 *   après 5 échecs), 500 uniquement pour les erreurs transitoires.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPulseSignature } from '@/lib/billing/verify-pulse';
import { parsePulse } from '@/lib/billing/chariow';
import { confirmSubscriptionPaymentTransaction } from '@/lib/billing/payment-service';

const PROVIDER = 'CHARIOW';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service_role non configuré.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const secret = process.env.CHARIOW_PULSE_SECRET;
  if (!secret) {
    console.error('[CHARIOW_PULSE] CHARIOW_PULSE_SECRET manquant');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  // Corps brut : ne jamais re-sérialiser (Chariow échappe les « / »).
  const raw = Buffer.from(await request.arrayBuffer());
  if (!verifyPulseSignature(raw, request.headers.get('x-chariow-signature'), secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw.toString('utf8')); }
  catch { return NextResponse.json({ received: true, status: 'invalid_json' }); }

  const deliveryId = request.headers.get('x-pulse-delivery-id');
  if (!deliveryId) {
    // Événement de test envoyé depuis le tableau de bord : pas d'identifiant de livraison.
    return NextResponse.json({ received: true, status: 'test' });
  }

  const eventName = request.headers.get('x-pulse-event') || '';
  const pulse = parsePulse(eventName, payload);
  if (pulse.eventType === 'other') {
    return NextResponse.json({ received: true, status: 'ignored' });
  }

  try {
    const sb = getAdminClient();

    const { data: existing } = await sb.from('webhook_events').select('id, processed')
      .eq('provider', PROVIDER).eq('event_id', deliveryId).maybeSingle();
    if (existing?.processed) {
      return NextResponse.json({ received: true, status: 'already_processed' });
    }
    if (!existing) {
      await sb.from('webhook_events').insert({
        provider: PROVIDER, event_id: deliveryId, event_type: eventName, payload,
        payment_reference: pulse.reference, signature_valid: true, signature: 'verified',
        processing_status: 'pending',
      });
    }

    const mark = (processing_status: string, extra: Record<string, unknown> = {}) =>
      sb.from('webhook_events').update({
        processing_status,
        ...(processing_status === 'processed' ? { processed: true, processed_at: new Date().toISOString() } : {}),
        ...extra,
      }).eq('provider', PROVIDER).eq('event_id', deliveryId);

    if (!pulse.reference) {
      await mark('error', { error_message: 'missing_payment_reference' });
      return NextResponse.json({ received: true, status: 'rejected' });
    }

    if (pulse.eventType === 'failed' || pulse.eventType === 'abandoned') {
      await sb.from('subscription_payments')
        .update({ status: pulse.eventType === 'failed' ? 'failed' : 'cancelled' })
        .eq('provider', PROVIDER).eq('provider_reference', pulse.reference)
        .in('status', ['pending', 'processing']);
      await mark('processed');
      return NextResponse.json({ received: true, status: 'processed' });
    }

    // successful.sale : devise XOF et montant > 0 exigés (le RPC vérifie la correspondance à ±1).
    if (pulse.currency !== 'XOF' || !Number.isFinite(pulse.amount) || pulse.amount <= 0) {
      await mark('error', { error_message: 'invalid_amount_or_currency' });
      return NextResponse.json({ received: true, status: 'rejected' });
    }

    const result = await confirmSubscriptionPaymentTransaction(pulse.reference, PROVIDER, pulse.amount, deliveryId);
    if (!result.success) {
      const permanent = ['payment_not_found', 'amount_mismatch'].includes(result.error || '');
      await mark('error', { error_message: result.error || 'confirmation_failed' });
      // Permanent → 200 (inutile de réessayer). Transitoire → 500 pour que Chariow réessaie.
      return NextResponse.json({ received: true, status: 'error', error: result.error }, { status: permanent ? 200 : 500 });
    }
    await mark('processed');
    return NextResponse.json({ received: true, status: 'processed', type: result.type });
  } catch (err) {
    console.error('[CHARIOW_PULSE_ERROR]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
