import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { status, notif_token, order_id, txnid } = payload;

    // Seul un SUCCESS déclenche l'activation
    if (status !== 'SUCCESS') {
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    console.info(`[ORANGE_CALLBACK_RECEIVED] Received callback for order ${order_id}`);

    if (!order_id || !notif_token) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Connexion Supabase Admin (Service Role)
    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);

    // 1. Idempotence : L'événement a-t-il déjà été traité ?
    const { data: existingEvent } = await supabaseAdmin
      .from('payment_webhook_events')
      .select('id')
      .eq('event_id', notif_token)
      .eq('provider', 'ORANGE_MONEY')
      .single();

    if (existingEvent) {
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    // 2. Vérification serveur auprès d'Orange Money (Anti-Fraude absolue)
    const clientId = process.env.ORANGE_CLIENT_ID;
    const clientSecret = process.env.ORANGE_CLIENT_SECRET;
    const merchantKey = process.env.ORANGE_MERCHANT_KEY;

    if (!clientId || !clientSecret || !merchantKey) {
      console.error('Orange Money credentials missing');
      return NextResponse.json({ error: 'Config error' }, { status: 500 });
    }

    // Obtenir le token pour vérifier le statut
    const tokenCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${tokenCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: 'OM verification failed' }, { status: 502 });
    }

    const { access_token } = await tokenResponse.json();

    // Vérifier le statut de la transaction (Transaction Status API)
    const verifyPayload = {
      order_id: order_id,
      amount: payload.amount,
      pay_token: notif_token // OM utilise pay_token
    };

    const verifyResponse = await fetch('https://api.orange.com/orange-money-webpay/dev/v1/transactionstatus', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verifyPayload)
    });

    const verifyData = await verifyResponse.json();
    
    // Si Orange Money nous dit que ce n'est pas payé
    if (verifyData.status !== 'SUCCESS') {
      console.error('[ORANGE_STATUS_VERIFIED] Orange transaction not genuinely successful', verifyData);
      return NextResponse.json({ error: 'Transaction verification failed' }, { status: 403 });
    }
    
    console.info(`[ORANGE_STATUS_VERIFIED] Transaction ${order_id} genuinely successful on OM servers`);

    // 3. Traiter le paiement interne
    // order_id correspond à l'UUID de notre paiement interne dans subscription_payments
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('subscription_payments')
      .select('*')
      .eq('id', order_id)
      .single();

    if (payErr || !payment) {
      console.error('Payment not found:', order_id);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ received: true, status: 'already_paid' });
    }

    // Le montant vérifié côté OM doit correspondre à la BDD
    if (Number(verifyData.amount) !== Number(payment.amount)) {
      console.error('Amount mismatch in OM verification');
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // 4. Mettre à jour (Transaction sécurisée via RPC atomique)
    const { error: rpcError } = await supabaseAdmin.rpc('confirm_subscription_payment', {
      p_payment_id: payment.id,
      p_event_id: notif_token
    });

    if (rpcError) {
      console.error('Erreur RPC OM lors de l\'activation atomique:', rpcError);
      
      // Enregistrer l'événement comme non processé
      await supabaseAdmin.from('payment_webhook_events').insert({
        provider: 'ORANGE_MONEY',
        event_id: notif_token,
        payment_reference: order_id,
        event_type: 'payment_success',
        signature_valid: true,
        processing_status: 'error',
        error_message: rpcError.message || 'Internal RPC Error OM',
        payload: payload
      });

      return NextResponse.json({ error: 'Internal Server Error (RPC)' }, { status: 500 });
    }

    console.info(`[ORANGE_PAYMENT_CONFIRMED] Payment ${payment.id} marked as paid`);
    console.info(`[SUBSCRIPTION_ACTIVATED] Subscription for payment ${payment.id} updated via OM`);

    // Insérer l'événement webhook de succès (l'idempotence a déjà filtré les doublons à l'étape 1)
    await supabaseAdmin
      .from('payment_webhook_events')
      .insert({
        provider: 'ORANGE_MONEY',
        event_id: notif_token,
        payment_reference: order_id,
        event_type: 'payment_success',
        signature_valid: true, // Vérification serveur réussie
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        payload: payload
      });

    return NextResponse.json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Webhook OM error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
