import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, SUBSCRIPTION_PLANS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, planId, orderId, workshopId, customerEmail, amount, orderNumber } = body;

    const stripe = getStripeServer();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ─── Case 1: Subscription Checkout (Abonnement SaaS) ───
    if (type === 'subscription') {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (!plan || plan.id === 'FREE') {
        return NextResponse.json({ error: 'Plan invalide ou gratuit' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `AtelierPro — Plan ${plan.name}`,
                description: plan.description,
              },
              unit_amount: plan.priceEUR * 100, // in cents
              recurring: {
                interval: plan.interval,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          workshopId: workshopId || '',
          planId: plan.id,
          type: 'subscription',
        },
        success_url: `${appUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/settings/billing?canceled=true`,
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    // ─── Case 2: Customer Order Payment (Règlement commande client) ───
    if (type === 'order_payment') {
      if (!amount || amount <= 0 || !orderId) {
        return NextResponse.json({ error: 'Montant ou commande invalide' }, { status: 400 });
      }

      // 1000 FCFA ~= 1.52 EUR
      const amountEur = Math.max(1, Math.round((amount / 655.957) * 100)); // Cents EUR

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Paiement Commande ${orderNumber || orderId}`,
                description: `Acompte / Règlement de commande pour l'atelier`,
              },
              unit_amount: amountEur,
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId,
          workshopId: workshopId || '',
          amountXOF: String(amount),
          type: 'order_payment',
        },
        success_url: `${appUrl}/orders/${orderId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/orders/${orderId}?payment_canceled=true`,
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    return NextResponse.json({ error: 'Type de paiement non supporté' }, { status: 400 });
  } catch (error: any) {
    console.error('[Stripe Checkout Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la création de la session Stripe' },
      { status: 500 }
    );
  }
}
