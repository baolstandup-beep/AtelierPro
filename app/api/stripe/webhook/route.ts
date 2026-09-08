import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('⛔ Rejet : STRIPE_WEBHOOK_SECRET non configuré sur le serveur.');
      return NextResponse.json(
        { error: 'Webhook non configuré sur le serveur' },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error('⛔ Rejet : En-tête stripe-signature manquant.');
      return NextResponse.json(
        { error: 'Signature de webhook manquante' },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de signature';
      console.error(`⚠️ Échec de vérification de la signature Stripe :`, message);
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }

    console.log(`[Stripe Webhook Event] Type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        if (metadata.type === 'subscription') {
          console.log(`✅ Abonnement activé : Atelier ${metadata.workshopId}, Plan ${metadata.planId}`);
        } else if (metadata.type === 'order_payment') {
          console.log(`✅ Commande payée via Stripe : Commande ${metadata.orderId}, Montant ${metadata.amountXOF} FCFA`);
          
          const supabase = getSupabaseClient();
          if (supabase && metadata.paymentId) {
            // Vérifier idempotence
            const { data: existing } = await supabase.from('payments').select('status').eq('id', metadata.paymentId).single();
            if (existing && existing.status !== 'CONFIRMED') {
              // Confirmer le paiement
              await supabase.from('payments').update({ status: 'CONFIRMED', reference: session.id }).eq('id', metadata.paymentId);
              
              // Mettre à jour la commande
              const { data: orderData } = await supabase.from('orders').select('total_amount, paid_amount').eq('id', metadata.orderId).single();
              if (orderData) {
                const newPaid = Number(orderData.paid_amount || 0) + Number(metadata.amountXOF || 0);
                const newBalance = Math.max(0, Number(orderData.total_amount || 0) - newPaid);
                await supabase.from('orders').update({ paid_amount: newPaid, balance: newBalance, updated_at: new Date().toISOString() }).eq('id', metadata.orderId);
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💰 Renouvellement de facture Stripe réussi : ${invoice.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`❌ Abonnement Stripe résilié : ${subscription.id}`);
        break;
      }

      default:
        console.log(`Événement Stripe non traité : ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne de traitement';
    console.error('[Stripe Webhook Handler Error]', message);
    return NextResponse.json(
      { error: 'Erreur interne lors du traitement du webhook' },
      { status: 500 }
    );
  }
}
