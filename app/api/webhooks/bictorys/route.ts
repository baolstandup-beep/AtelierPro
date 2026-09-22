import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyBictorysWebhook } from '@/lib/billing/bictorys';
import type { SaaSProvider } from '@/lib/types';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service_role non configuré.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function mapProvider(pspName: string): SaaSProvider | null {
  if (pspName === 'wave_money') return 'WAVE';
  if (pspName === 'orange_money') return 'ORANGE_MONEY';
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyBictorysWebhook(rawBody, request.headers)) {
    console.error('[BICTORYS_WEBHOOK] Signature invalide');
    return NextResponse.json({ received: true, status: 'ignored' });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); }
  catch {
    console.error('[BICTORYS_WEBHOOK] JSON invalide');
    return NextResponse.json({ received: true, status: 'ignored' });
  }

  const eventId = String(payload.id || '');
  const reference = String(payload.paymentReference || payload.merchantReference || '');
  const status = String(payload.status || '').toLowerCase();
  const provider = mapProvider(String(payload.pspName || ''));
  const amount = Number(payload.amount || 0);
  const currency = String(payload.currency || '');
  if (!eventId || !reference || !provider) {
    return NextResponse.json({ received: true, status: 'ignored' });
  }

  const sb = getAdminClient();
  const { data: existing } = await sb.from('webhook_events').select('id, processed')
    .eq('event_id', eventId).eq('provider', provider).maybeSingle();
  if (existing?.processed) {
    return NextResponse.json({ received: true, status: 'already_processed' });
  }
  if (!existing) {
    await sb.from('webhook_events').insert({
      provider, event_id: eventId, event_type: 'bictorys.payment', payload,
      payment_reference: reference, signature_valid: true, signature: 'verified',
      processing_status: 'pending',
    });
  }

  if (['failed', 'cancelled', 'reversed'].includes(status)) {
    await sb.from('payments')
      .update({ status: 'FAILED' })
      .eq('reference', reference).in('status', ['PENDING', 'PROCESSING']);
    await sb.from('subscription_payments')
      .update({ status: status === 'cancelled' ? 'cancelled' : 'failed' })
      .eq('provider_reference', reference).eq('provider', provider);
    await sb.from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString(), processing_status: 'processed' })
      .eq('event_id', eventId).eq('provider', provider);
    return NextResponse.json({ received: true, status: 'processed' });
  }
  if (!['succeeded', 'authorized'].includes(status)) {
    return NextResponse.json({ received: true, status: 'pending' });
  }
  if (currency !== 'XOF' || !Number.isFinite(amount) || amount <= 0) {
    await sb.from('webhook_events').update({ processing_status: 'error', error_message: 'invalid_amount_or_currency' })
      .eq('event_id', eventId).eq('provider', provider);
    return NextResponse.json({ received: true, status: 'rejected' });
  }

  const { data: orderPayment } = await sb.from('payments')
    .select('id, amount, status').eq('reference', reference).maybeSingle();

  let result: { success: boolean; error?: string; type?: string };
  if (orderPayment) {
    if (orderPayment.status === 'CONFIRMED') {
      result = { success: true, type: 'order_payment_already_processed' };
    } else if (Math.abs(Number(orderPayment.amount) - amount) > 1) {
      result = { success: false, error: 'amount_mismatch' };
    } else {
      const { error: paymentError } = await sb.from('payments')
        .update({ status: 'CONFIRMED' }).eq('id', orderPayment.id);
      result = paymentError
        ? { success: false, error: paymentError.message }
        : { success: true, type: 'order_payment' };
    }
  } else {
    const { confirmSubscriptionPaymentTransaction } = await import('@/lib/billing/payment-service');
    result = await confirmSubscriptionPaymentTransaction(reference, provider, amount, eventId);
  }
  if (!result.success) {
    await sb.from('webhook_events').update({ processing_status: 'error', error_message: result.error || 'confirmation_failed' })
      .eq('event_id', eventId).eq('provider', provider);
    return NextResponse.json({ received: true, status: 'error' });
  }
  await sb.from('webhook_events')
    .update({ processed: true, processed_at: new Date().toISOString(), processing_status: 'processed' })
    .eq('event_id', eventId).eq('provider', provider);
  return NextResponse.json({ received: true, status: 'processed', type: result.type });
}
