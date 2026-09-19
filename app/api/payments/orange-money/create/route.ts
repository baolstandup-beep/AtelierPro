import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          } catch (error) {
            // Ignore
          }
        },
      },
    });
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

    // 1. Vérification des permissions
    const { data: member, error: memberErr } = await supabase
      .from('workshop_members')
      .select('role')
      .eq('workshop_id', workshopId)
      .eq('user_id', userId)
      .single();

    if (memberErr || !member || member.role !== 'OWNER') {
      return NextResponse.json({ error: 'Permission denied: Must be OWNER' }, { status: 403 });
    }

    // 2. Vérification du plan
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('price, is_active')
      .eq('id', planId)
      .single();

    if (planErr || !plan || !plan.is_active) {
      return NextResponse.json({ error: 'Invalid or inactive plan' }, { status: 404 });
    }

    const amount = plan.price;
    const reference = `OM-${workshopId}-${Date.now()}`;

    // 3. Appel API Orange Money
    const clientId = process.env.ORANGE_CLIENT_ID;
    const clientSecret = process.env.ORANGE_CLIENT_SECRET;
    const merchantKey = process.env.ORANGE_MERCHANT_KEY;

    if (!clientId || !clientSecret || !merchantKey) {
      console.error('Orange Money credentials missing');
      return NextResponse.json({ error: 'Payment provider not configured' }, { status: 500 });
    }

    // A. Récupération du token d'accès
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
      console.error('Orange Token Error:', await tokenResponse.text());
      return NextResponse.json({ error: 'OM Token fetch failed' }, { status: 502 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // B. Création du Web Payment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${appUrl}/payment/status?ref=${reference}`;
    const cancelUrl = `${appUrl}/payment/status?ref=${reference}&status=cancel`;
    const notifUrl = `${appUrl}/api/webhooks/orange-money`;

    const omPayload = {
      merchant_key: merchantKey,
      currency: "OUV", // OUV ou XOF selon l'API
      order_id: reference,
      amount: amount,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notif_url: notifUrl,
      lang: "fr",
      reference: "Abonnement AtelierPro"
    };

    const paymentResponse = await fetch('https://api.orange.com/orange-money-webpay/dev/v1/webpayment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(omPayload)
    });

    if (!paymentResponse.ok) {
      console.error('Orange WebPayment Error:', await paymentResponse.text());
      return NextResponse.json({ error: 'Failed to initialize Orange Money payment' }, { status: 502 });
    }

    const paymentData = await paymentResponse.json();
    const paymentUrl = paymentData.payment_url;
    const omPayToken = paymentData.pay_token;

    // 4. Sauvegarde dans notre BDD
    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);

    const { error: insertErr } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        workshop_id: workshopId,
        plan_id: planId,
        provider: 'ORANGE_MONEY',
        provider_transaction_id: omPayToken,
        reference: reference,
        amount: amount,
        currency: 'XOF',
        status: 'pending',
        raw_metadata: paymentData
      });

    if (insertErr) {
      console.error('DB Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to record OM payment' }, { status: 500 });
    }

    return NextResponse.json({ checkout_url: paymentUrl, reference: reference });

  } catch (error) {
    console.error('OM Payment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
