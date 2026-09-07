import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const stripe = getStripeServer();
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error(`⚠️ Erreur de signature du webhook Stripe :`, err.message);
        return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
      }
    } else {
      // Fallback in local development without webhook secret verification
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    console.log(`[Stripe Webhook Event] Type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        if (metadata.type === 'subscription') {
          console.log(`✅ Abonnement activé : Atelier ${metadata.workshopId}, Plan ${metadata.planId}`);
          // Ici : Mise à jour de l'atelier ou enregistrement de la souscription en base
        } else if (metadata.type === 'order_payment') {
          console.log(`✅ Commande payée via Stripe : Commande ${metadata.orderId}, Montant ${metadata.amountXOF} FCFA`);
          // Ici : Enregistrement automatique du paiement dans la table payments
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
  } catch (error: any) {
    console.error('[Stripe Webhook Handler Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne de traitement du webhook' },
      { status: 500 }
    );
  }
}
