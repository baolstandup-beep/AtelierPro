import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Algorithme de vérification conforme à Wave
function verifyWaveSignature(rawBody: string, signatureHeader: string | null, secret: string | undefined): boolean {
  if (!signatureHeader || !secret) return false;

  // Le header ressemble à : v1,t=1614556800,v1=abcde12345...
  const parts = signatureHeader.split(',');
  let timestamp = '';
  let signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Prévention du Replay : tolérance de 5 minutes
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const webhookTimestamp = parseInt(timestamp, 10);
  // Tolérance interne de 300 secondes (5 minutes) pour prévenir le Replay (Standard de l'industrie, Wave compatible)
  if (isNaN(webhookTimestamp) || Math.abs(currentTimestamp - webhookTimestamp) > 300) {
    console.error('[WAVE_SIGNATURE_INVALID] Timestamp outside tolerance window');
    return false;
  }

  // Calculer la signature attendue: HMAC-SHA256(timestamp + rawBody)
  const payload = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Une des signatures s= doit correspondre
  return signatures.includes(expectedSignature);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text(); // RAW body pour la signature
    const signatureHeader = request.headers.get('wave-signature') || request.headers.get('Wave-Signature');
    const webhookSecret = process.env.WAVE_WEBHOOK_SECRET;

    if (!verifyWaveSignature(rawBody, signatureHeader, webhookSecret)) {
      console.error('[WAVE_SIGNATURE_INVALID] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.info('[WAVE_WEBHOOK_RECEIVED] Signature valid, processing event');

    const payload = JSON.parse(rawBody);
    const eventId = payload.id;
    const eventType = payload.type; // ex: checkout.session.completed

    // Ne traiter que le succès pour activer l'abonnement
    if (eventType !== 'checkout.session.completed') {
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    const sessionData = payload.data;
    const providerTransactionId = sessionData.id;
    const clientReference = sessionData.client_reference;
    const paymentStatus = sessionData.payment_status; // 'succeeded' ou autre
    const amount = sessionData.amount;

    if (paymentStatus !== 'succeeded') {
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    // Connexion Supabase avec droits Service Role
    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);

    // 1. Idempotence : Vérifier si l'événement a déjà été traité
    const { data: existingEvent, error: eventErr } = await supabaseAdmin
      .from('payment_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      console.info('[WAVE_DUPLICATE_EVENT] Event already processed:', eventId);
      // Déjà traité, on répond OK à Wave sans rien refaire
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    // 2. Récupérer le paiement dans notre base
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('subscription_payments')
      .select('*')
      .eq('reference', clientReference)
      .single();

    if (payErr || !payment) {
      console.error('Payment not found:', clientReference);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 3. Vérifications strictes (Anti-Fraude)
    if (payment.amount !== Number(amount)) {
      console.error(`[WAVE_AMOUNT_MISMATCH] Expected ${payment.amount}, got ${amount}`);
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ received: true, status: 'already_paid' });
    }

    // 4. Activer le paiement et l'abonnement de manière ATOMIQUE via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('confirm_subscription_payment', {
      p_payment_id: payment.id,
      p_event_id: eventId
    });

    if (rpcError) {
      console.error('Erreur RPC lors de l\'activation atomique:', rpcError);
      
      // Si la RPC a échoué (ex: deadlock), enregistrer quand même l'événement comme non processé
      // pour permettre un retry manuel ou via script
      await supabaseAdmin.from('payment_webhook_events').insert({
        provider: 'WAVE',
        event_id: eventId,
        payment_reference: clientReference,
        event_type: eventType,
        signature_valid: true,
        processed: false,
        payload: payload
      });

      return NextResponse.json({ error: 'Internal Server Error (RPC)' }, { status: 500 });
    }

    console.info(`[WAVE_PAYMENT_CONFIRMED] Payment ${payment.id} marked as paid`);
    console.info(`[SUBSCRIPTION_ACTIVATED] Subscription for payment ${payment.id} updated`);

    // Si succès, on insère l'événement webhook si la RPC ne l'a pas fait
    // La RPC gère l'update si l'événement existe déjà, mais pas l'insert si c'est nouveau.
    // L'idempotence a déjà été passée à l'étape 1, on l'insert.
    await supabaseAdmin
      .from('payment_webhook_events')
      .insert({
        provider: 'WAVE',
        event_id: eventId,
        payment_reference: clientReference,
        event_type: eventType,
        signature_valid: true,
        processed: true,
        processed_at: new Date().toISOString(),
        payload: payload
      });

    return NextResponse.json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Webhook Wave error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
