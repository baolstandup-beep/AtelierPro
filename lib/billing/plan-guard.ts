/**
 * lib/billing/plan-guard.ts
 * Source unique de vérité pour les plans SaaS, quotas et autorisations d'AtelierPro.
 * Côté serveur : utilisé pour valider les quotas et autorisations avant toute action.
 * Côté client : utilisé pour afficher les limites UI et états visuels.
 */

import { Plan } from '@/lib/types';

export type PlanSlug = 'discovery' | 'starter' | 'pro';

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  price: number; // En FCFA
  currency: string;
  interval: 'free' | 'month';
  maxClients: number | null; // null = illimité
  features: string[];
  permissions: {
    unlimitedClients: boolean;
    kanban: boolean;
    payments: boolean;
    invoicesPdf: boolean;
    whatsapp: boolean;
    advancedReports: boolean;
    excelExport: boolean;
    teamManagement: boolean;
    modelCatalogue: boolean;
    prioritySupport: boolean;
  };
}

export const CANONICAL_PLANS: Record<PlanSlug, PlanDefinition> = {
  discovery: {
    slug: 'discovery',
    name: 'Découverte',
    price: 0,
    currency: 'XOF',
    interval: 'free',
    maxClients: 5,
    features: [
      'Jusqu’à 5 clients enregistrés',
      'Carnet de mesures de base',
      'Gestion basique des commandes',
      'Suivi de production basique',
      'Dashboard essentiel',
    ],
    permissions: {
      unlimitedClients: false,
      kanban: false,
      payments: false,
      invoicesPdf: false,
      whatsapp: false,
      advancedReports: false,
      excelExport: false,
      teamManagement: false,
      modelCatalogue: false,
      prioritySupport: false,
    },
  },
  starter: {
    slug: 'starter',
    name: 'Starter',
    price: 5000,
    currency: 'XOF',
    interval: 'month',
    maxClients: null,
    features: [
      'Clients illimités',
      'Mesures illimitées',
      'Commandes illimitées',
      'Tableau Kanban de production',
      'Paiements Wave & Orange Money',
      'Factures et reçus PDF',
      'Rappels et reçus WhatsApp',
      'Dashboard complet',
    ],
    permissions: {
      unlimitedClients: true,
      kanban: true,
      payments: true,
      invoicesPdf: true,
      whatsapp: true,
      advancedReports: false,
      excelExport: false,
      teamManagement: false,
      modelCatalogue: false,
      prioritySupport: false,
    },
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    price: 15000,
    currency: 'XOF',
    interval: 'month',
    maxClients: null,
    features: [
      'Tout le plan Starter',
      'Rapports financiers avancés',
      'Export Excel comptable',
      'Gestion d’équipe et tailleurs',
      'Catalogue de modèles',
      'Statistiques avancées',
      'Support prioritaire',
    ],
    permissions: {
      unlimitedClients: true,
      kanban: true,
      payments: true,
      invoicesPdf: true,
      whatsapp: true,
      advancedReports: true,
      excelExport: true,
      teamManagement: true,
      modelCatalogue: true,
      prioritySupport: true,
    },
  },
};

/**
 * Récupère la définition d'un plan par son slug (avec fallback sur 'discovery')
 */
export function getPlanDefinition(slug?: string | null): PlanDefinition {
  if (!slug) return CANONICAL_PLANS.discovery;
  const cleanSlug = slug.toLowerCase().trim() as PlanSlug;
  return CANONICAL_PLANS[cleanSlug] || CANONICAL_PLANS.discovery;
}

/**
 * Convertit les plans canoniques au format interface `Plan` attendu par les composants
 */
export function getCanonicalPlansList(): Plan[] {
  return [
    {
      id: 'plan-discovery',
      slug: 'discovery',
      name: CANONICAL_PLANS.discovery.name,
      description: 'Pour découvrir AtelierPro et démarrer la gestion de votre atelier sans frais.',
      price: 0,
      currency: 'XOF',
      duration_days: 36500,
      billing_interval: 'month', // affichage mensuel standard
      features: CANONICAL_PLANS.discovery.features,
      is_active: true,
      sort_order: 1,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'plan-starter',
      slug: 'starter',
      name: CANONICAL_PLANS.starter.name,
      description: 'Idéal pour structurer et développer un atelier actif.',
      price: 5000,
      currency: 'XOF',
      duration_days: 30,
      billing_interval: 'month',
      features: CANONICAL_PLANS.starter.features,
      is_active: true,
      sort_order: 2,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'plan-pro',
      slug: 'pro',
      name: CANONICAL_PLANS.pro.name,
      description: 'Pour les ateliers et maisons de couture en pleine expansion.',
      price: 15000,
      currency: 'XOF',
      duration_days: 30,
      billing_interval: 'month',
      features: CANONICAL_PLANS.pro.features,
      is_active: true,
      sort_order: 3,
      created_at: '',
      updated_at: '',
    },
  ];
}

/**
 * Vérifie si un plan dispose d'une fonctionnalité donnée
 */
export function hasPlanFeature(
  slug: string | null | undefined,
  feature: keyof PlanDefinition['permissions']
): boolean {
  const plan = getPlanDefinition(slug);
  return plan.permissions[feature] ?? false;
}

/**
 * Erreur métier standardisée
 */
export const FREE_PLAN_CLIENT_LIMIT_REACHED = 'FREE_PLAN_CLIENT_LIMIT_REACHED';
export const FREE_PLAN_CLIENT_LIMIT_MESSAGE =
  'Vous avez atteint la limite de 5 clients du plan Découverte. Passez à Starter ou Pro pour continuer.';
