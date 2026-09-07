import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { z } from 'zod';

// ─── Strict Server-Side Validation Schemas ───
const SubscriptionCheckoutSchema = z.object({
  type: z.literal('subscription'),
  planId: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  workshopId: z.string().min(1, 'workshopId est requis').max(100),
  customerEmail: z.string().email('Email invalide').optional().or(z.literal('')),
});

const OrderPaymentCheckoutSchema = z.object({
  type: z.literal('order_payment'),
  orderId: z.string().min(1, 'orderId est requis').max(100),
  workshopId: z.string().min(1, 'workshopId est requis').max(100),
  customerEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  amount: z.number().positive('Le montant doit être strictement supérieur à 0').max(50000000, 'Montant trop élevé'),
  orderNumber: z.string().max(50).optional(),
});

const CheckoutPayloadSchema = z.discriminatedUnion('type', [
  SubscriptionCheckoutSchema,
  OrderPaymentCheckoutSchema,
]);

export async function POST(req: NextRequest) {
  try {
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
    }

    // Server-side validation
    const validationResult = CheckoutPayloadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation échouée côté serveur',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const payload = validationResult.data;
    const stripe = getStripeServer();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ─── Case 1: Subscription Checkout (Abonnement SaaS) ───
    if (payload.type === 'subscription') {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payload.planId);
      if (!plan || plan.id === 'FREE') {
        return NextResponse.json({ error: 'Plan invalide ou gratuit' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: payload.customerEmail || undefined,
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
          workshopId: payload.workshopId,
          planId: plan.id,
          type: 'subscription',
        },
        success_url: `${appUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/settings/billing?canceled=true`,
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    // ─── Case 2: Customer Order Payment (Règlement commande client) ───
    if (payload.type === 'order_payment') {
      // 1000 FCFA ~= 1.52 EUR (taux fixe XOF -> EUR)
      const amountEur = Math.max(1, Math.round((payload.amount / 655.957) * 100)); // Cents EUR

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: payload.customerEmail || undefined,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Paiement Commande ${payload.orderNumber || payload.orderId}`,
                description: `Acompte / Règlement de commande pour l'atelier`,
              },
              unit_amount: amountEur,
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: payload.orderId,
          workshopId: payload.workshopId,
          amountXOF: String(payload.amount),
          type: 'order_payment',
        },
        success_url: `${appUrl}/orders/${payload.orderId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/orders/${payload.orderId}?payment_canceled=true`,
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    return NextResponse.json({ error: 'Type de paiement non supporté' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    console.error('[Stripe Checkout Error]', message);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement sécurisée' },
      { status: 500 }
    );
  }
}
