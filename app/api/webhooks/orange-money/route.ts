/**
 * POST /api/webhooks/orange-money
 * Webhook Orange Money — Traitement idempotent.
 * Gère : inscription initiale + renouvellement.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Vérification signature Orange Money (HMAC-SHA256 si secret configuré)
function verifyOrangeMoneySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined
): boolean {
  if (!secret) {
    console.warn('[OM_WEBHOOK] ORANGE_WEBHOOK_SECRET non configuré — signature non vérifiée');
    return true;
  }
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
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
    const signatureHeader = request.headers.get('x-orange-signature');
    const webhookSecret = process.env.ORANGE_WEBHOOK_SECRET;

    if (!verifyOrangeMoneySignature(rawBody, signatureHeader, webhookSecret)) {
      console.error('[OM_SIGNATURE_INVALID]');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.info('[OM_WEBHOOK_RECEIVED] Signature valide');

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const status = (payload.status as string) || '';
    const orderId = (payload.order_id as string) || '';
    const amountReceived = Number(payload.amount || 0);
    const eventId = ((payload.pay_token || payload.txnid || orderId) as string);

    if (status !== 'SUCCESS' && status !== 'PAID') {
      console.info('[OM_WEBHOOK] Statut ignoré:', status);
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    const sb = getAdminClient();

    // Idempotence
    const { data: existing } = await sb
      .from('webhook_events')
      .select('id, processed')
      .eq('event_id', eventId)
      .eq('provider', 'ORANGE_MONEY')
      .maybeSingle();

    if (existing?.processed) {
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    if (!existing) {
      await sb.from('webhook_events').insert({
        provider: 'ORANGE_MONEY',
        event_id: eventId,
        event_type: 'payment.completed',
        payload,
        payment_reference: orderId,
        signature_valid: true,
        signature: true,
        processing_status: 'pending',
      });
    }

    // Confirmer via transaction résiliente
    const { confirmSubscriptionPaymentTransaction } = await import('@/lib/billing/payment-service');
    const result = await confirmSubscriptionPaymentTransaction(
      orderId,
      'ORANGE_MONEY',
      amountReceived,
      eventId
    );

    if (!result.success) {
      console.error('[OM_CONFIRM_ERROR]', result.error);
      await sb
        .from('webhook_events')
        .update({ processing_status: 'error', error_message: result.error || 'Failed' })
        .eq('event_id', eventId)
        .eq('provider', 'ORANGE_MONEY');
      return NextResponse.json({ error: result.error || 'Confirmation failed' }, { status: 500 });
    }

    await sb
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_status: 'processed',
      })
      .eq('event_id', eventId)
      .eq('provider', 'ORANGE_MONEY');

    console.info('[OM_PAYMENT_CONFIRMED] Reference:', orderId);
    return NextResponse.json({ received: true, status: 'processed' });
  } catch (err) {
    console.error('[OM_WEBHOOK_FATAL]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
