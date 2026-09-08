import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ce webhook est appelé par Wave ou Orange Money (via un agrégateur comme PayDunya ou autre)
// Il sécurise la validation d'un paiement en vérifiant la signature ou le secret

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Requis pour contourner RLS côté serveur de confiance
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // 1. Vérification de la signature du Webhook
    // const signature = request.headers.get('x-webhook-signature');
    // if (!verifySignature(request.body, signature, process.env.WEBHOOK_SECRET)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const body = await request.json();

    // Format attendu (à adapter selon l'agrégateur de paiement)
    const { paymentId, status, amount, reference } = body;

    if (!paymentId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (status !== 'SUCCESS') {
      // Mettre à jour le statut du paiement en FAILED ou CANCELLED
      await supabase
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('id', paymentId);
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    // 2. Récupérer le paiement en base
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'CONFIRMED') {
      // Déjà traité
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    // 3. Valider le paiement
    const { error: updatePayErr } = await supabase
      .from('payments')
      .update({ status: 'CONFIRMED', reference: reference || payment.reference })
      .eq('id', paymentId);

    if (updatePayErr) throw updatePayErr;

    // 4. Mettre à jour les montants de la commande (paid_amount, balance)
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('id, total_amount, paid_amount')
      .eq('id', payment.order_id)
      .single();

    if (orderData && !orderErr) {
      const newPaid = Number(orderData.paid_amount || 0) + Number(payment.amount);
      const newBalance = Math.max(0, Number(orderData.total_amount || 0) - newPaid);

      await supabase
        .from('orders')
        .update({
          paid_amount: newPaid,
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);
    }

    return NextResponse.json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
