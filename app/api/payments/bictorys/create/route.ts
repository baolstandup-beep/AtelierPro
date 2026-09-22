import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createBictorysCharge } from '@/lib/billing/bictorys';
import type { SaaSProvider } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Supabase non configuré.' }, { status: 500 });
    }

    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => items.forEach(({ name, value, options }) => {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        }),
      },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const body = await request.json();
    const orderId = String(body.orderId || '');
    const amount = Number(body.amount || 0);
    const provider = body.provider as SaaSProvider;
    if (!orderId || !Number.isInteger(amount) || amount < 100 || !['WAVE', 'ORANGE_MONEY'].includes(provider)) {
      return NextResponse.json({ error: 'Paramètres de paiement invalides.' }, { status: 400 });
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await admin.from('profiles').select('atelier_id').eq('id', user.id).maybeSingle();
    if (!profile?.atelier_id) return NextResponse.json({ error: 'Atelier introuvable.' }, { status: 404 });

    const { data: order } = await admin.from('orders')
      .select('id, customer_id, order_number, total_amount')
      .eq('id', orderId).eq('atelier_id', profile.atelier_id).maybeSingle();
    if (!order) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });

    const { data: confirmedPayments } = await admin.from('payments')
      .select('amount').eq('order_id', orderId).eq('status', 'CONFIRMED');
    const paid = (confirmedPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const balance = Math.max(0, Number(order.total_amount || 0) - paid);
    if (amount > balance) {
      return NextResponse.json({ error: 'Le montant dépasse le solde de la commande.' }, { status: 400 });
    }

    const { data: customer } = order.customer_id
      ? await admin.from('customers').select('full_name, phone, email').eq('id', order.customer_id).maybeSingle()
      : { data: null };
    const reference = `ORDER-${provider === 'WAVE' ? 'WAVE' : 'OM'}-${orderId}-${Date.now()}`;

    const { data: pendingPayment, error: insertError } = await admin.from('payments').insert({
      workshop_id: profile.atelier_id,
      order_id: orderId,
      customer_id: order.customer_id,
      amount,
      method: provider,
      status: 'PENDING',
      reference,
      notes: `Paiement Bictorys pour ${order.order_number || orderId}`,
      payment_date: new Date().toISOString().slice(0, 10),
      created_by: user.id,
    }).select('id').single();
    if (insertError || !pendingPayment) {
      return NextResponse.json({ error: 'Impossible d’enregistrer le paiement.' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    try {
      const charge = await createBictorysCharge({
        provider,
        amount,
        reference,
        successUrl: `${appUrl}/orders/${orderId}?payment=success&ref=${encodeURIComponent(reference)}`,
        errorUrl: `${appUrl}/orders/${orderId}?payment=error&ref=${encodeURIComponent(reference)}`,
        customer: {
          name: customer?.full_name,
          phone: customer?.phone,
          email: customer?.email,
          country: 'SN',
        },
      });

      await admin.from('payments').update({
        notes: `Bictorys transaction ${charge.transactionId}`,
      }).eq('id', pendingPayment.id);

      return NextResponse.json({
        success: true,
        checkout_url: charge.checkoutUrl,
        transaction_id: charge.transactionId,
        reference,
        qr_code: charge.qrCode,
        message: charge.message,
      });
    } catch (error) {
      await admin.from('payments').update({ status: 'FAILED' }).eq('id', pendingPayment.id);
      throw error;
    }
  } catch (error) {
    console.error('[BICTORYS_ORDER_PAYMENT_ERROR]', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Impossible d’initialiser le paiement.',
    }, { status: 502 });
  }
}
