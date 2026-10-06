import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { z } from 'zod';
import { getAdminSupabase, getAuthenticatedUser, getUserAtelierId } from '@/lib/server-auth';

// ─── Strict Server-Side Validation Schemas ───
const SubscriptionCheckoutSchema = z.object({
  type: z.literal('subscription'),
  planId: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  workshopId: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'workshop-default')),
  customerEmail: z
    .string()
    .email('Email invalide')
    .optional()
    .or(z.literal(''))
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
});

const OrderPaymentCheckoutSchema = z.object({
  type: z.literal('order_payment'),
  orderId: z.string().min(1, 'orderId est requis').max(100),
  workshopId: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'workshop-default')),
  customerEmail: z
    .string()
    .email('Email invalide')
    .optional()
    .or(z.literal(''))
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  amount: z
    .coerce
    .number()
    .positive('Le montant doit être strictement supérieur à 0')
    .max(50000000, 'Montant trop élevé'),
  orderNumber: z.string().max(100).optional().nullish(),
});

const CheckoutPayloadSchema = z.discriminatedUnion('type', [
  SubscriptionCheckoutSchema,
  OrderPaymentCheckoutSchema,
]);

export async function POST(req: NextRequest) {
  try {
    // ─── Authentification : l'atelier est résolu depuis la session, jamais depuis le payload ───
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 });
    }
    const atelierId = await getUserAtelierId(user.id);
    if (!atelierId) {
      return NextResponse.json({ error: 'Aucun atelier associé à cet utilisateur.' }, { status: 404 });
    }

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

    const payload = { ...validationResult.data, workshopId: atelierId };

    if (payload.type === 'order_payment') {
      const admin = getAdminSupabase();
      const { data: order } = admin
        ? await admin
            .from('orders')
            .select('id, total_amount, paid_amount')
            .eq('id', payload.orderId)
            .eq('atelier_id', atelierId)
            .maybeSingle()
        : { data: null };
      if (!order) {
        return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
      }
      const balance = Math.max(0, Number(order.total_amount || 0) - Number(order.paid_amount || 0));
      if (payload.amount > balance) {
        return NextResponse.json({ error: 'Le montant dépasse le solde de la commande.' }, { status: 400 });
      }
    }

    let stripe;
    try {
      stripe = getStripeServer();
    } catch (err) {
      return NextResponse.json(
        {
          error:
            (err instanceof Error && err.message) ||
            'Stripe n\'est pas configuré. Veuillez définir STRIPE_SECRET_KEY dans vos variables d\'environnement (.env.local).',
          code: 'STRIPE_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

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
      { error: message || 'Erreur lors de la création de la session de paiement sécurisée' },
      { status: 500 }
    );
  }
}
