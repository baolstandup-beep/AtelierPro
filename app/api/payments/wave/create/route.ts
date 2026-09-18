import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { workshopId, planId } = body;

    if (!workshopId || !planId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Vérifier que l'utilisateur est bien le OWNER du workshop
    const { data: member, error: memberErr } = await supabase
      .from('workshop_members')
      .select('role')
      .eq('workshop_id', workshopId)
      .eq('user_id', userId)
      .single();

    if (memberErr || !member || member.role !== 'OWNER') {
      return NextResponse.json({ error: 'Permission denied: Must be OWNER' }, { status: 403 });
    }

    // 2. Récupérer le plan depuis la base de données (sécurisation du montant)
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('price, is_active')
      .eq('id', planId)
      .single();

    if (planErr || !plan || !plan.is_active) {
      return NextResponse.json({ error: 'Invalid or inactive plan' }, { status: 404 });
    }

    // Le prix en base de données fait foi
    const amountStr = String(plan.price);
    const reference = `WAVE-${workshopId}-${Date.now()}`;

    // 3. Appeler l'API Wave
    const waveApiKey = process.env.WAVE_API_KEY;
    if (!waveApiKey) {
      console.error('WAVE_API_KEY is not configured');
      return NextResponse.json({ error: 'Payment provider not configured' }, { status: 500 });
    }

    // URL de retour. On pointe vers une page /payment/status où on fera du polling
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/payment/status?ref=${reference}&status=success`;
    const errorUrl = `${appUrl}/payment/status?ref=${reference}&status=error`;

    const wavePayload = {
      amount: amountStr,
      currency: "XOF",
      error_url: errorUrl,
      success_url: successUrl,
      client_reference: reference
    };

    const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waveApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wavePayload)
    });

    if (!waveResponse.ok) {
      const errData = await waveResponse.text();
      console.error('Wave API Error:', errData);
      return NextResponse.json({ error: 'Failed to initialize payment with provider' }, { status: 502 });
    }

    const waveData = await waveResponse.json();
    const waveCheckoutUrl = waveData.wave_launch_url;
    const waveSessionId = waveData.id;

    // 4. Enregistrer le paiement en "pending" dans la base de données
    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);

    const { error: insertErr } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        workshop_id: workshopId,
        plan_id: planId,
        provider: 'WAVE',
        provider_transaction_id: waveSessionId,
        reference: reference,
        amount: plan.price,
        currency: 'XOF',
        status: 'pending',
        raw_metadata: waveData
      });

    if (insertErr) {
      console.error('Database insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    if (waveRes.ok && data.id) {
      console.info(`[WAVE_PAYMENT_CREATED] Payment created with ref: ${reference}, Wave Session ID: ${data.id}`);
      return NextResponse.json({
        checkout_url: data.wave_launch_url || data.checkout_url,
        session_id: data.id,
        reference: reference
      });
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
