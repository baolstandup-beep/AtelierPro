'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scissors,
  Check,
  Zap,
  Star,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  CreditCard,
  Phone,
  Radio,
} from 'lucide-react';
import type { Plan, SaaSProvider } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function AbonnementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#0C120F] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F3B32] dark:text-[#2E9D74]" />
        </div>
      }
    >
      <AbonnementContent />
    </Suspense>
  );
}

function AbonnementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string>('discovery');
  const [subscription, setSubscription] = useState<any>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [provider, setProvider] = useState<SaaSProvider>('WAVE');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Récupérer les plans depuis la base
        const plansRes = await fetch('/api/subscription/plans');
        if (plansRes.ok) {
          const pData = await plansRes.json();
          setPlans(pData.plans || []);
        }

        // 2. Récupérer le statut actuel de l'abonnement
        const subRes = await fetch('/api/subscription/renew');
        if (subRes.ok) {
          const sData = await subRes.json();
          if (sData.subscription) {
            setSubscription(sData.subscription);
            const slug = (sData.subscription.plan?.slug || 'discovery').toLowerCase();
            setCurrentPlanSlug(slug);

            const isExp =
              sData.level === 'READ_ONLY' ||
              sData.subscription.status === 'expired' ||
              (sData.subscription.current_period_end &&
                new Date(sData.subscription.current_period_end) < new Date());
            setIsExpired(Boolean(isExp));
          }
        }
      } catch (err) {
        console.error('[Abonnement load error]', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    if (paymentStatus === 'success') {
      setSuccessMsg('Félicitations ! Votre paiement a été reçu et votre abonnement est réactivé.');
    } else if (paymentStatus === 'error') {
      setErrorMsg('Le paiement a été interrompu ou n\'a pas pu être validé. Vous pouvez réessayer.');
    }
  }, [paymentStatus]);

  async function handlePlanAction(targetPlan: Plan) {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Si même plan et actif
    if (targetPlan.slug === currentPlanSlug && !isExpired) {
      return;
    }

    // Si plan Découverte (0 FCFA)
    if (targetPlan.slug === 'discovery' || Number(targetPlan.price) === 0) {
      if (!confirm('Voulez-vous passer à la formule Découverte ? Vos données existantes seront conservées, mais vous serez limité à 5 clients.')) {
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch('/api/subscription/renew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: targetPlan.id || 'discovery',
            provider: 'WAVE',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setCurrentPlanSlug('discovery');
          setIsExpired(false);
          setSuccessMsg('Votre atelier est maintenant sur la formule Découverte.');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          setErrorMsg(data.error || 'Erreur lors du changement de formule.');
        }
      } catch {
        setErrorMsg('Erreur réseau. Veuillez réessayer.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Pour les plans payants : ouvrir la modale de sélection de paiement
    setSelectedPlan(targetPlan);
  }

  async function handleConfirmPayment() {
    if (!selectedPlan) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/subscription/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Impossible d\'initialiser le paiement.');
        setSubmitting(false);
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setErrorMsg('Lien de paiement non reçu du fournisseur.');
        setSubmitting(false);
      }
    } catch {
      setErrorMsg('Erreur réseau lors de la communication avec le serveur de paiement.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#0C120F] text-[#111827] dark:text-[#EAE5D9] font-sans antialiased pb-20">
      {/* Header */}
      <header className="border-b border-[#EBE7DF] dark:border-white/10 bg-white/80 dark:bg-[#121A16]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-[#0F3B32] dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Tableau de bord</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0F3B32] flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-[#D97706]" />
            </div>
            <span className="text-base font-extrabold text-[#0F3B32] dark:text-white">
              Atelier<span className="text-[#D97706]">Pro</span>
            </span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        {/* Alerts & Messages */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Expiration Alert Banner */}
        {isExpired && (
          <div className="mb-8 p-5 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-900 dark:text-amber-300">
                  ABONNEMENT EXPIRÉ
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                  Votre compte et l'ensemble de vos données (clients, mesures, commandes) sont conservés intacts.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const p = plans.find((pl) => pl.slug === (currentPlanSlug === 'discovery' ? 'starter' : currentPlanSlug)) || plans[1];
                if (p) setSelectedPlan(p);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all shrink-0"
            >
              Réactiver mon abonnement
            </button>
          </div>
        )}

        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0F3B32] dark:text-white tracking-tight">
            Gérer mon Abonnement
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Changez de formule ou renouvelez votre abonnement en toute simplicité. Votre compte et votre atelier restent permanents.
          </p>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F3B32] dark:text-[#2E9D74]" />
            <p className="text-xs text-slate-500">Chargement des formules...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.slug === currentPlanSlug && !isExpired;
              const isRecommended = plan.slug === 'starter';
              const isPro = plan.slug === 'pro';

              return (
                <div
                  key={plan.id || plan.slug}
                  className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 relative ${
                    isCurrent
                      ? 'bg-white dark:bg-[#121A16] border-2 border-[#0F3B32] dark:border-[#2E9D74] shadow-xl'
                      : isRecommended
                      ? 'bg-white dark:bg-[#121A16] border-2 border-[#D97706]/60 shadow-lg hover:shadow-xl hover:-translate-y-1'
                      : 'bg-white/70 dark:bg-[#121A16]/70 border border-[#EBE7DF] dark:border-white/10 hover:shadow-md'
                  }`}
                >
                  {/* Badges */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-[#0F3B32] dark:bg-[#2E9D74] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Check className="w-3 h-3" />
                      <span>Formule actuelle</span>
                    </div>
                  )}

                  {!isCurrent && isRecommended && (
                    <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-[#D97706] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-white" />
                      <span>Recommandé</span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-black text-[#111827] dark:text-white">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {plan.description}
                        </p>
                      </div>
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                          isPro
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            : isRecommended
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-[#0F3B32] dark:text-[#2E9D74]'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isPro ? <Zap className="w-4 h-4" /> : isRecommended ? <Star className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="py-4 border-y border-slate-100 dark:border-white/5 my-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-[#111827] dark:text-white font-mono">
                          {formatCurrency(Number(plan.price))}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {plan.slug === 'discovery' ? 'Gratuit à vie' : '/ mois'}
                        </span>
                      </div>
                      {plan.slug === 'discovery' && (
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1">
                          Maximum 5 clients enregistrés
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2.5 my-6">
                      {(Array.isArray(plan.features) ? plan.features : []).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-[#2E9D74] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider cursor-not-allowed"
                      >
                        Formule actuelle
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlanAction(plan)}
                        disabled={submitting}
                        className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                          isRecommended
                            ? 'bg-gradient-to-r from-[#0F3B32] to-[#2E9D74] hover:from-[#185c4e] hover:to-[#258562] text-white'
                            : isPro
                            ? 'bg-gradient-to-r from-[#D97706] to-amber-700 hover:from-amber-700 hover:to-[#D97706] text-white'
                            : 'bg-white dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 text-slate-800 dark:text-white hover:bg-slate-50'
                        }`}
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isExpired && plan.slug === currentPlanSlug ? (
                          'Renouveler mon abonnement'
                        ) : (
                          'Choisir cette formule'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Guarantee Notice */}
        <div className="mt-12 p-6 rounded-3xl bg-white dark:bg-[#121A16] border border-[#EBE7DF] dark:border-white/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF7F1] dark:bg-[#0F3B32] text-[#2E9D74] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#111827] dark:text-white">
              Paiements Sécurisés & Conservation Garantie
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Vos paiements Wave et Orange Money sont sécurisés et traités avec confirmation serveur instantanée. Aucune donnée de votre atelier n&apos;est supprimée lors d&apos;un changement de formule ou d&apos;une expiration.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Selection Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#121A16] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[#111827] dark:text-white">
                  Passer à la formule {selectedPlan.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Montant : <span className="font-bold text-[#0F3B32] dark:text-[#2E9D74] font-mono">{formatCurrency(Number(selectedPlan.price))}</span> / mois
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Mode de paiement
              </label>

              <div
                onClick={() => setProvider('WAVE')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  provider === 'WAVE'
                    ? 'border-[#1DC3E2] bg-[#1DC3E2]/10'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1DC3E2] flex items-center justify-center text-white font-black text-sm">
                    W
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-white">Wave Sénégal</p>
                    <p className="text-xs text-slate-500">Paiement instantané 0% frais</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${provider === 'WAVE' ? 'border-[#1DC3E2] bg-[#1DC3E2]' : 'border-slate-300'}`}>
                  {provider === 'WAVE' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <div
                onClick={() => setProvider('ORANGE_MONEY')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  provider === 'ORANGE_MONEY'
                    ? 'border-[#FF7900] bg-[#FF7900]/10'
                    : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF7900] flex items-center justify-center text-white font-black text-sm">
                    OM
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111827] dark:text-white">Orange Money</p>
                    <p className="text-xs text-slate-500">Paiement sécurisé avec validation OTP</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${provider === 'ORANGE_MONEY' ? 'border-[#FF7900] bg-[#FF7900]' : 'border-slate-300'}`}>
                  {provider === 'ORANGE_MONEY' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmPayment}
                className="flex-1 py-3 rounded-2xl bg-[#0F3B32] hover:bg-[#185c4e] text-white text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirection...</span>
                  </>
                ) : (
                  <span>Payer {formatCurrency(Number(selectedPlan.price))}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
