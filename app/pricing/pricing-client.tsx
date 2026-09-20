'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scissors, Check, Zap, Star, ArrowRight, Phone, ChevronRight
} from 'lucide-react';
import type { Plan } from '@/lib/types';

interface Props {
  plans: Plan[];
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter-fallback',
    name: 'Starter',
    slug: 'starter',
    description: 'Idéal pour démarrer votre atelier numérique.',
    price: 5000,
    currency: 'XOF',
    duration_days: 30,
    billing_interval: 'month',
    features: [
      'Carnet de mesures illimité',
      'Gestion des commandes',
      'Suivi Kanban de production',
      'Paiements Wave & Orange Money',
      'Factures PDF & WhatsApp',
      'Support email',
    ],
    is_active: true,
    sort_order: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'pro-fallback',
    name: 'Pro',
    slug: 'pro',
    description: 'Pour les ateliers en pleine croissance.',
    price: 15000,
    currency: 'XOF',
    duration_days: 365,
    billing_interval: 'year',
    features: [
      'Tout le plan Starter',
      'Rapports financiers avancés',
      'Export Excel comptable',
      'Gestion d\'équipe illimitée',
      'Catalogue de modèles',
      'Support prioritaire',
    ],
    is_active: true,
    sort_order: 2,
    created_at: '',
    updated_at: '',
  },
];

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR').format(price) + ' ' + (currency === 'XOF' ? 'FCFA' : currency);
}

function formatInterval(interval: string, days: number) {
  if (interval === 'month') return '/ mois';
  if (interval === 'year') return '/ an';
  if (days === 365) return '/ an';
  return `/ ${days} jours`;
}

export default function PricingClient({ plans }: Props) {
  const router = useRouter();
  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;

  function handleChoose(plan: Plan) {
    router.push(`/signup?plan=${plan.id}`);
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] font-sans antialiased">
      {/* ─── Header ─── */}
      <header className="border-b border-[#EBE7DF] bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#D97706]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
              Atelier<span className="text-[#D97706]">Pro</span>
            </span>
          </Link>
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-slate-600 hover:text-[#0F3B32] transition-colors"
          >
            Déjà client ? Se connecter →
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="pt-16 pb-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F3B32]/8 border border-[#0F3B32]/15 text-[#0F3B32] text-xs font-bold mb-6">
            <Zap className="w-3.5 h-3.5 text-[#D97706]" />
            Paiement Wave & Orange Money
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111827] font-serif-luxury mb-4 leading-tight">
            Choisissez votre formule
          </h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Activez votre atelier numérique en quelques minutes. Aucun engagement, paiement sécurisé.
          </p>
        </motion.div>
      </section>

      {/* ─── Plans ─── */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {displayPlans.map((plan, i) => {
            const isPopular = plan.slug === 'pro' || i === 1;
            let features: string[] = [];
            const rawFeatures: any = plan.features;
            if (Array.isArray(rawFeatures)) {
              features = rawFeatures;
            } else if (typeof rawFeatures === 'string') {
              try {
                features = JSON.parse(rawFeatures);
              } catch (e) {
                features = (rawFeatures as string).split(',').map(s => s.trim()).filter(Boolean);
              }
            }

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className={`relative rounded-3xl border flex flex-col overflow-hidden shadow-sm transition-all hover:shadow-lg ${
                  isPopular
                    ? 'border-[#0F3B32] bg-gradient-to-br from-[#0F3B32] via-[#165a4c] to-[#0A2A24] text-white'
                    : 'border-[#EBE7DF] bg-white text-[#111827]'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D97706] text-white text-[11px] font-bold">
                      <Star className="w-3 h-3" /> POPULAIRE
                    </span>
                  </div>
                )}

                <div className="p-7 sm:p-8 flex-1">
                  <div className="mb-5">
                    <h2 className={`text-xl font-extrabold font-serif-luxury mb-1 ${isPopular ? 'text-white' : 'text-[#0F3B32]'}`}>
                      {plan.name}
                    </h2>
                    {plan.description && (
                      <p className={`text-sm ${isPopular ? 'text-slate-200' : 'text-slate-500'}`}>
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="mb-7">
                    <div className={`text-4xl font-extrabold ${isPopular ? 'text-white' : 'text-[#0F3B32]'}`}>
                      {formatPrice(plan.price, plan.currency)}
                    </div>
                    <div className={`text-sm mt-0.5 ${isPopular ? 'text-slate-300' : 'text-slate-400'}`}>
                      {formatInterval(plan.billing_interval, plan.duration_days)}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isPopular ? 'bg-[#D97706]/30' : 'bg-[#0F3B32]/10'
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${isPopular ? 'text-[#FCD34D]' : 'text-[#0F3B32]'}`} />
                        </div>
                        <span className={`text-sm leading-tight ${isPopular ? 'text-slate-200' : 'text-slate-700'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-7 sm:px-8 pb-8">
                  <button
                    onClick={() => handleChoose(plan)}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-[#D97706] hover:bg-[#b45309] text-white shadow-lg shadow-amber-900/25'
                        : 'bg-[#0F3B32] hover:bg-[#185c4e] text-white shadow-lg shadow-emerald-900/20'
                    }`}
                  >
                    Choisir cette formule
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className={`text-center text-[11px] mt-2.5 ${isPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                    Paiement Wave ou Orange Money
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Badges de confiance */}
        <div className="max-w-3xl mx-auto mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Paiement 100% sécurisé
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Données privées & isolées
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#0284C7]" /> Support WhatsApp inclus
          </span>
        </div>
      </section>
    </div>
  );
}
