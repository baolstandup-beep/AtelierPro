'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scissors,
  Check,
  Zap,
  Star,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { Plan } from '@/lib/types';
import { CANONICAL_PLANS, getCanonicalPlansList } from '@/lib/billing/plan-guard';

interface Props {
  plans: Plan[];
}

export default function PricingClient({ plans }: Props) {
  const router = useRouter();
  const [activatingDiscovery, setActivatingDiscovery] = useState(false);

  // Utilise toujours les 3 plans canoniques avec les données de la base en priorité si présentes
  const canonicalList = getCanonicalPlansList();
  const displayPlans = canonicalList.map((cp) => {
    const dbPlan = plans.find((p) => p.slug === cp.slug);
    if (dbPlan) {
      return {
        ...cp,
        id: dbPlan.id,
        price: dbPlan.price,
        features: dbPlan.features,
      };
    }
    return cp;
  });

  async function handleSelectPlan(plan: Plan) {
    // Vérifier si l'utilisateur est déjà connecté
    try {
      const authCheck = await fetch('/api/subscription/renew');
      if (authCheck.ok) {
        // Utilisateur connecté : redirection directe vers l'espace abonnement interne
        if (plan.slug === 'discovery') {
          setActivatingDiscovery(true);
          const res = await fetch('/api/subscription/activate-discovery', { method: 'POST' });
          if (res.ok) {
            router.push('/dashboard');
            return;
          }
        }
        router.push(`/abonnement?plan=${plan.slug}`);
        return;
      }
    } catch {}

    // Utilisateur NON connecté : tunnel d'inscription standard
    if (plan.slug === 'discovery') {
      router.push(`/signup?plan=${plan.id || 'discovery'}`);
      return;
    }

    // Plans payants pour nouveaux utilisateurs
    router.push(`/signup?plan=${plan.id || plan.slug}`);
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#111827] font-sans antialiased selection:bg-[#0F3B32] selection:text-[#FBF9F5]">
      {/* ─── Top Navbar ─── */}
      <header className="border-b border-[#EBE7DF] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0F3B32] flex items-center justify-center shadow-sm">
              <Scissors className="w-4 h-4 text-[#D97706]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
              Atelier<span className="text-[#D97706]">Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-slate-600 hover:text-[#0F3B32] px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              Déjà inscrit ? Se connecter
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex text-xs font-bold uppercase tracking-wider text-white bg-[#0F3B32] px-4 py-2 rounded-full shadow-sm hover:bg-[#185c4e] transition-all"
            >
              Mon Atelier
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="pt-14 pb-10 px-4 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F3B32]/10 border border-[#0F3B32]/15 text-[#0F3B32] text-xs font-bold mb-5">
            <Zap className="w-3.5 h-3.5 text-[#D97706]" />
            Tarifs clairs en FCFA • Sans engagement • Paiement Wave &amp; Orange Money
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111827] font-serif-luxury mb-4 leading-tight">
            Choisissez la formule adaptée à votre atelier
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Commencez gratuitement avec la formule <strong>Découverte</strong> ou débloquez l&apos;illimité
            avec <strong>Starter</strong> et <strong>Pro</strong>.
          </p>
        </motion.div>
      </section>

      {/* ─── 3 Cartes de Tarifs Côte à Côte (Desktop) ─── */}
      <section className="pb-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* 1. CARTE DÉCOUVERTE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-6 sm:p-8 flex flex-col justify-between shadow-[0_4px_20px_rgba(15,59,50,0.03)] hover:shadow-lg transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FBF9F5] text-[#8A7A65] border border-[#EBE7DF]">
                  Gratuit à vie
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#0F3B32] font-serif-luxury">
                Découverte
              </h3>
              <p className="text-xs text-[#4B5563] mt-1.5 min-h-[34px]">
                Pour débuter la gestion de son atelier sans engagement financier.
              </p>

              <div className="mt-6 mb-6 pb-6 border-b border-[#EBE7DF]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-[#111827] font-serif-luxury">0</span>
                  <span className="text-base font-extrabold text-[#111827]">FCFA</span>
                  <span className="text-xs text-[#8A7A65] font-semibold">/ gratuit</span>
                </div>
                <p className="text-[11px] text-[#8A7A65] mt-1.5">Sans carte bancaire • Sans expiration</p>
              </div>

              <ul className="space-y-3.5 text-xs text-[#111827]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span><strong>Jusqu&apos;à 5 clients</strong> enregistrés</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Carnet de mesures complet</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Gestion basique des commandes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Suivi de production</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Tableau de bord essentiel</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <button
                onClick={() => handleSelectPlan({ id: 'plan-discovery', slug: 'discovery' } as Plan)}
                disabled={activatingDiscovery}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FBF9F5] hover:bg-[#EBE7DF] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#EBE7DF] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{activatingDiscovery ? 'Activation…' : 'COMMENCER GRATUITEMENT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* 2. CARTE STARTER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-3xl bg-white border border-[#0F3B32]/30 p-6 sm:p-8 flex flex-col justify-between shadow-[0_6px_25px_rgba(15,59,50,0.06)] hover:shadow-xl transition-all relative"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#EBF7F1] text-[#0F3B32] border border-[#0F3B32]/20">
                  Essentiel
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#0F3B32] font-serif-luxury">
                Starter
              </h3>
              <p className="text-xs text-[#4B5563] mt-1.5 min-h-[34px]">
                Pour les tailleurs actifs qui ont besoin de capacités illimitées.
              </p>

              <div className="mt-6 mb-6 pb-6 border-b border-[#EBE7DF]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-[#0F3B32] font-serif-luxury">5 000</span>
                  <span className="text-base font-extrabold text-[#0F3B32]">FCFA</span>
                  <span className="text-xs text-[#8A7A65] font-semibold">/ mois</span>
                </div>
                <p className="text-[11px] text-[#8A7A65] mt-1.5">Paiement mensuel • Sans engagement</p>
              </div>

              <ul className="space-y-3.5 text-xs text-[#111827]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span><strong>Clients illimités</strong> (sans restriction)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Mesures illimitées</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Commandes illimitées</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Tableau Kanban de production</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Paiements Wave &amp; Orange Money</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Factures &amp; reçus PDF</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Reçus &amp; rappels WhatsApp</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <button
                onClick={() => handleSelectPlan({ id: 'plan-starter', slug: 'starter' } as Plan)}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border-2 border-[#0F3B32] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <span>CHOISIR STARTER</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* 3. CARTE PRO (MISE EN AVANT - BADGE POPULAIRE) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-3xl bg-gradient-to-b from-white via-[#FAF7F0] to-white border-2 border-[#D97706] p-6 sm:p-8 flex flex-col justify-between shadow-[0_16px_45px_rgba(217,119,6,0.16)] relative lg:-translate-y-2 z-10"
          >
            {/* Badge Populaire */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D97706] to-amber-700 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-white" />
              <span>POPULAIRE</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30">
                  Performance &amp; Équipe
                </span>
              </div>
              <h3 className="text-2xl font-black text-stone-900 font-serif-luxury">
                Pro
              </h3>
              <p className="text-xs text-[#4B5563] mt-1.5 min-h-[34px]">
                Pour les maisons de couture et ateliers en pleine croissance.
              </p>

              <div className="mt-6 mb-6 pb-6 border-b border-[#EBE7DF]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-[#D97706] font-serif-luxury">15 000</span>
                  <span className="text-base font-extrabold text-[#D97706]">FCFA</span>
                  <span className="text-xs text-[#8A7A65] font-semibold">/ mois</span>
                </div>
                <p className="text-[11px] text-[#8A7A65] mt-1.5">Facturé mensuellement • Accès intégral</p>
              </div>

              <ul className="space-y-3.5 text-xs text-[#111827]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span><strong>Tout ce qui est inclus dans Starter</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span><strong>Rapports financiers avancés</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span><strong>Export Excel comptable</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span><strong>Gestion d&apos;équipe &amp; tailleurs</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>Catalogue de modèles</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>Statistiques avancées</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <span>Support prioritaire 7j/7</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <button
                onClick={() => handleSelectPlan({ id: 'plan-pro', slug: 'pro' } as Plan)}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#D97706] to-amber-700 hover:from-amber-700 hover:to-[#D97706] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <span>CHOISIR PRO</span>
                <ArrowRight className="w-4 h-4 text-amber-200" />
              </button>
            </div>
          </motion.div>

        </div>

        {/* Reassurance Banner */}
        <div className="mt-14 max-w-3xl mx-auto rounded-2xl bg-white border border-[#EBE7DF] p-6 text-center shadow-sm">
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Paiement 100% sécurisé (Wave, Orange Money)
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              Activation instantanée du compte
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0F3B32]" />
              Conservation garantie de vos données
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
