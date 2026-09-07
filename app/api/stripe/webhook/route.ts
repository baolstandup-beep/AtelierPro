import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import Stripe from 'stripe';

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
