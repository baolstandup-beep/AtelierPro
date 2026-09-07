import Stripe from 'stripe';
import { loadStripe, Stripe as StripeClient } from '@stripe/stripe-js';
import type { SubscriptionPlan } from './types';

// ─── 1. Server-side Stripe Instance ───────────────────────────
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia' as any,
      appInfo: {
        name: 'AtelierPro SaaS',
        version: '1.0.0',
      },
    })
  : null;

export function getStripeServer(): Stripe {
  if (!stripe) {
    throw new Error(
      'Stripe n\'est pas configuré. Veuillez définir STRIPE_SECRET_KEY dans vos variables d\'environnement (.env.local).'
    );
  }
  return stripe;
}

// ─── 2. Client-side Stripe Loader ─────────────────────────────
let stripePromise: Promise<StripeClient | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    if (publishableKey) {
      stripePromise = loadStripe(publishableKey);
    }
  }
  return stripePromise;
};

// ─── 3. Plans d'Abonnement SaaS AtelierPro ─────────────────────
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Découverte',
    description: 'Idéal pour tester l\'application et démarrer votre atelier.',
    priceXOF: 0,
    priceEUR: 0,
    interval: 'month',
    features: [
      'Jusqu\'à 15 clients enregistrés',
      'Prise de mesures Homme / Femme / Enfant',
      'Calcul des acomptes & restant dû',
      '1 utilisateur (Propriétaire)',
      'Sauvegarde locale & cloud',
    ],
    maxOrdersPerMonth: 15,
    maxMembers: 1,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Pour les couturiers et stylistes indépendants en pleine croissance.',
    priceXOF: 2900,
    priceEUR: 5,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    features: [
      'Jusqu\'à 80 clients actifs',
      'Photos des tissus & coupons (Caméra & Fichier)',
      'Reçus & rappels WhatsApp en 1 clic',
      'Suivi des commandes & dates de livraison',
      'Calcul d\'acompte Wave & Orange Money',
      '1 compte Maître Tailleur',
    ],
    maxOrdersPerMonth: 80,
    maxMembers: 1,
  },
  {
    id: 'PRO',
    name: 'Pro Atelier',
    description: 'Pour les ateliers actifs avec équipe, apprentis et couturiers.',
    priceXOF: 5900,
    priceEUR: 9,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    isPopular: true,
    features: [
      'Clients & Mesures 100% ILLIMITÉS',
      'Toutes les notifications WhatsApp automatiques',
      'Tableau Kanban de production complet',
      'Jusqu\'à 5 couturiers / employés',
      'Galerie de modèles (Homme, Femme, Enfant)',
      'Rapports financiers de caisse & bénéfices nets',
      'Support prioritaire WhatsApp 7j/7',
    ],
    maxMembers: 5,
  },
  {
    id: 'ENTERPRISE',
    name: 'Business Évolutif',
    description: 'Pour les grandes maisons de couture et ateliers multi-succursales.',
    priceXOF: 18900,
    priceEUR: 29,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    features: [
      'Tout ce qui est dans Pro Atelier',
      'Employés & Couturiers ILLIMITÉS',
      'Multi-ateliers & succursales',
      'Personnalisation de marque & Logo sur reçus',
      'Export comptable Excel / PDF',
      'Gestionnaire de compte dédié & Support VIP 7j/7',
    ],
  },
];
