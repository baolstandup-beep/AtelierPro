'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Check, ChevronRight, ChevronLeft, Smartphone,
  User, Building2, Lock, Eye, EyeOff, Loader2, AlertCircle,
  CreditCard, ArrowRight, Phone
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billing_interval: string;
  duration_days: number;
  features: string[];
  description?: string;
}

type Step = 1 | 2 | 3;

// ─── Utilitaire ──────────────────────────────────────────────────────────────
function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}

// ─── Composant interne (doit être dans un Suspense pour useSearchParams) ─────
function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedPlanId = searchParams.get('plan');

  const [step, setStep] = useState<Step>(preSelectedPlanId ? 2 : 1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    workshopName: '',
    pin: '',
  });
  const [showPin, setShowPin] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [provider, setProvider] = useState<'WAVE' | 'ORANGE_MONEY' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Détection stricte du plan gratuit Découverte
  const isFreePlan =
    selectedPlan?.slug === 'decouverte' ||
    selectedPlan?.slug === 'discovery' ||
    Number(selectedPlan?.price) === 0;

  // Charger les plans
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/subscription/plans');
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
          if (preSelectedPlanId) {
            const found = (data.plans || []).find((p: Plan) => p.id === preSelectedPlanId || p.slug === preSelectedPlanId);
            if (found) setSelectedPlan(found);
          }
        }
      } catch {}
      setPlansLoading(false);
    }
    loadPlans();
  }, [preSelectedPlanId]);

  function validateStep2() {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Prénom requis.';
    if (!form.lastName.trim()) errs.lastName = 'Nom requis.';
    const phone = form.phone.replace(/\s+/g, '');
    if (!phone || phone.length < 9) errs.phone = 'Numéro invalide (min 9 chiffres).';
    if (!form.workshopName.trim()) errs.workshopName = 'Nom de l\'atelier requis.';
    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      errs.pin = 'Le code PIN doit comporter 4 chiffres.';
    }
    return errs;
  }

  // ─── Activation Gratuite Découverte (0 FCFA - Aucun provider de paiement) ───
  async function handleActivateFree() {
    if (submitting) return;
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      setStep(2);
      return;
    }
    if (!selectedPlan) return;

    setSubmitting(true);
    setError('');

    let normalizedPhone = form.phone.replace(/\s+/g, '');
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 9) {
      normalizedPhone = '+221' + normalizedPhone;
    }

    try {
      const res = await fetch('/api/subscriptions/activate-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: normalizedPhone,
          workshopName: form.workshopName.trim(),
          pin: form.pin || undefined,
          planId: selectedPlan.id,
          slug: selectedPlan.slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue lors de l’activation.');
        setSubmitting(false);
        return;
      }

      // Injecter la session Supabase si disponible
      if (data.session?.access_token) {
        try {
          const sb = getSupabase();
          await sb?.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        } catch (sessErr) {
          console.warn('[Session set warning]', sessErr);
        }
      }

      // Redirection immédiate vers le dashboard
      router.push('/dashboard');
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
      setSubmitting(false);
    }
  }

  // ─── Paiement Plans Payants (Starter / Pro via Wave / OM) ───────────────────
  async function handlePay(chosenProvider: 'WAVE' | 'ORANGE_MONEY') {
    if (submitting) return;
    const errs = validateStep2();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    if (!selectedPlan) return;

    // Protection supplémentaire : interdiction de paiement pour plan gratuit
    if (isFreePlan) {
      return handleActivateFree();
    }

    setSubmitting(true);
    setProvider(chosenProvider);
    setError('');

    let normalizedPhone = form.phone.replace(/\s+/g, '');
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 9) {
      normalizedPhone = '+221' + normalizedPhone;
    }

    try {
      const res = await fetch('/api/subscription/init-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: normalizedPhone,
          workshopName: form.workshopName.trim(),
          planId: selectedPlan.id,
          provider: chosenProvider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'PAYMENT_ALREADY_CONFIRMED' && data.redirect) {
          router.push(data.redirect);
          return;
        }
        setError(data.error || 'Une erreur est survenue.');
        setSubmitting(false);
        return;
      }

      // Rediriger vers le checkout Wave/OM
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
      setSubmitting(false);
    }
  }

  const stepLabels = ['Formule', 'Informations', isFreePlan ? 'Activation' : 'Paiement'];

  return (
    <div className="min-h-screen bg-[#FBF9F5] font-sans antialiased">
      {/* Header */}
      <header className="border-b border-[#EBE7DF] bg-white/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#D97706]" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
              Atelier<span className="text-[#D97706]">Pro</span>
            </span>
          </Link>
          <span className="text-xs text-slate-500">Inscription sécurisée</span>
        </div>
      </header>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div className="flex items-center justify-center gap-0">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as Step;
            const isDone = step > stepNum;
            const isActive = step === stepNum;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone ? 'bg-[#16A34A] text-white' : isActive ? 'bg-[#0F3B32] text-white' : 'bg-[#EBE7DF] text-slate-400'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className={`text-[11px] mt-1 font-medium ${isActive ? 'text-[#0F3B32]' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`w-16 sm:w-24 h-0.5 mx-1 mb-4 transition-all ${step > stepNum ? 'bg-[#16A34A]' : 'bg-[#EBE7DF]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {/* ─── Étape 1 : Choix du plan ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl font-extrabold text-[#111827] font-serif-luxury mb-2 text-center">
                Choisissez votre formule
              </h1>
              <p className="text-sm text-slate-500 text-center mb-8">
                Activez votre atelier numérique en 3 minutes.
              </p>

              {plansLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#0F3B32] animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map(plan => {
                    const features = Array.isArray(plan.features) ? plan.features
                      : typeof plan.features === 'string' ? JSON.parse(plan.features) : [];
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-[#0F3B32] bg-[#0F3B32]/5 shadow-md'
                            : 'border-[#EBE7DF] bg-white hover:border-[#0F3B32]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-extrabold text-[#0F3B32] font-serif-luxury">{plan.name}</div>
                            {plan.description && <div className="text-xs text-slate-500 mt-0.5">{plan.description}</div>}
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-[#0F3B32]">{formatPrice(plan.price)}</div>
                            <div className="text-xs text-slate-400">
                              {plan.billing_interval === 'month' ? '/ mois' : '/ an'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {features.slice(0, 3).map((f: string, idx: number) => (
                            <span key={idx} className="text-[11px] bg-[#0F3B32]/8 text-[#0F3B32] px-2 py-0.5 rounded-full font-medium">
                              {f}
                            </span>
                          ))}
                          {features.length > 3 && (
                            <span className="text-[11px] text-slate-400">+{features.length - 3} autres</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                disabled={!selectedPlan}
                onClick={() => setStep(2)}
                className={`mt-8 w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedPlan
                    ? 'bg-[#0F3B32] text-white hover:bg-[#185c4e] shadow-lg shadow-emerald-900/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ─── Étape 2 : Informations personnelles ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl font-extrabold text-[#111827] font-serif-luxury mb-2 text-center">
                Vos informations
              </h1>
              <p className="text-sm text-slate-500 text-center mb-8">
                Renseignez vos coordonnées pour créer votre atelier.
              </p>

              <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Prénom *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                        placeholder="Amadou"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.firstName ? 'border-red-400' : 'border-slate-200'}`}
                      />
                    </div>
                    {formErrors.firstName && <p className="text-[11px] text-red-500 mt-1">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nom *</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Diallo"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.lastName ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    {formErrors.lastName && <p className="text-[11px] text-red-500 mt-1">{formErrors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Téléphone *</label>
                  <div className="relative flex">
                    <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3 pr-2 border-r border-slate-200">
                      <Phone className="w-4 h-4 text-slate-400 mr-1" />
                      <span className="text-xs font-semibold text-slate-600">+221</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="77 000 00 00"
                      className={`w-full pl-24 pr-3 py-2.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.phone ? 'border-red-400' : 'border-slate-200'}`}
                    />
                  </div>
                  {formErrors.phone && <p className="text-[11px] text-red-500 mt-1">{formErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nom de votre atelier *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.workshopName}
                      onChange={e => setForm(f => ({ ...f, workshopName: e.target.value }))}
                      placeholder="Atelier Mariama Couture"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.workshopName ? 'border-red-400' : 'border-slate-200'}`}
                    />
                  </div>
                  {formErrors.workshopName && <p className="text-[11px] text-red-500 mt-1">{formErrors.workshopName}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Code PIN de connexion (4 chiffres)</label>
                    <span className="text-[10px] text-slate-400">Optionnel (défaut: 4 derniers chiffres)</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={4}
                      value={form.pin}
                      onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="1234"
                      className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.pin ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.pin && <p className="text-[11px] text-red-500 mt-1">{formErrors.pin}</p>}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
                <button
                  onClick={() => {
                    const errs = validateStep2();
                    if (Object.keys(errs).length) { setFormErrors(errs); return; }
                    setFormErrors({});
                    setStep(3);
                  }}
                  className="flex-[2] py-3.5 rounded-2xl bg-[#0F3B32] text-white text-sm font-bold hover:bg-[#185c4e] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Étape 3 : Activation (Découverte) ou Paiement (Starter/Pro) ─── */}
          {step === 3 && selectedPlan && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {isFreePlan ? (
                /* ─── INTERFACE PLAN DÉCOUVERTE (0 FCFA - Aucun paiement requis) ─── */
                <>
                  <h1 className="text-2xl font-extrabold text-[#111827] font-serif-luxury mb-2 text-center">
                    Activez gratuitement votre atelier
                  </h1>
                  <p className="text-sm text-slate-500 text-center mb-8">
                    Commencez immédiatement avec AtelierPro. Aucun paiement requis.
                  </p>

                  {/* Récapitulatif Découverte */}
                  <div className="bg-white rounded-2xl border border-[#EBE7DF] p-5 mb-6 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500">Plan sélectionné</span>
                      <span className="font-bold text-[#0F3B32]">Découverte</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500">Clients inclus</span>
                      <span className="text-sm font-medium text-slate-700">Jusqu’à 5 clients</span>
                    </div>
                    <div className="border-t border-[#EBE7DF] mt-3 pt-3 flex justify-between items-center">
                      <span className="font-bold text-slate-700">Total à payer</span>
                      <span className="text-xl font-extrabold text-[#0F3B32]">
                        0 FCFA
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Bouton unique d'activation directe */}
                  <div className="space-y-3">
                    <button
                      onClick={handleActivateFree}
                      disabled={submitting}
                      className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                        submitting
                          ? 'bg-[#0F3B32]/70 text-white cursor-wait'
                          : 'bg-[#0F3B32] hover:bg-[#185c4e] text-white shadow-lg shadow-emerald-900/20'
                      }`}
                    >
                      {submitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Activation de votre atelier...</>
                      ) : (
                        <>
                          <span>Commencer gratuitement</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="mt-4 w-full py-3 text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Modifier mes informations
                  </button>

                  <p className="text-center text-[11px] text-slate-400 mt-4">
                    🔒 Activation sécurisée
                  </p>
                </>
              ) : (
                /* ─── INTERFACE PLANS PAYANTS (Starter / Pro via Wave & OM) ─── */
                <>
                  <h1 className="text-2xl font-extrabold text-[#111827] font-serif-luxury mb-2 text-center">
                    Activez votre atelier
                  </h1>
                  <p className="text-sm text-slate-500 text-center mb-8">
                    Paiement sécurisé — aucune carte bancaire requise.
                  </p>

                  {/* Récapitulatif Payant */}
                  <div className="bg-white rounded-2xl border border-[#EBE7DF] p-5 mb-6 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500">Plan sélectionné</span>
                      <span className="font-bold text-[#0F3B32]">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500">Durée</span>
                      <span className="text-sm font-medium text-slate-700">
                        {selectedPlan.billing_interval === 'month' ? '1 mois' : '1 an'}
                      </span>
                    </div>
                    <div className="border-t border-[#EBE7DF] mt-3 pt-3 flex justify-between items-center">
                      <span className="font-bold text-slate-700">Total à payer</span>
                      <span className="text-xl font-extrabold text-[#0F3B32]">
                        {formatPrice(selectedPlan.price)}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Boutons Wave & Orange Money */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handlePay('WAVE')}
                      disabled={submitting}
                      className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                        submitting && provider === 'WAVE'
                          ? 'bg-blue-400 text-white cursor-wait'
                          : submitting
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#1B74E4] hover:bg-[#1564CE] text-white shadow-lg shadow-blue-900/20'
                      }`}
                    >
                      {submitting && provider === 'WAVE' ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Redirection Wave...</>
                      ) : (
                        <>
                          <img src="/logos/wave-logo.svg" alt="Wave" className="h-5 w-auto" onError={e => (e.currentTarget.style.display='none')} />
                          Payer avec Wave
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handlePay('ORANGE_MONEY')}
                      disabled={submitting}
                      className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                        submitting && provider === 'ORANGE_MONEY'
                          ? 'bg-orange-400 text-white cursor-wait'
                          : submitting
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#FF6600] hover:bg-[#e55a00] text-white shadow-lg shadow-orange-900/20'
                      }`}
                    >
                      {submitting && provider === 'ORANGE_MONEY' ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Redirection Orange Money...</>
                      ) : (
                        <>
                          <img src="/logos/orange-money-logo.svg" alt="Orange Money" className="h-5 w-auto" onError={e => (e.currentTarget.style.display='none')} />
                          Payer avec Orange Money
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="mt-4 w-full py-3 text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Modifier mes informations
                  </button>

                  <p className="text-center text-[11px] text-slate-400 mt-4">
                    🔒 Paiement sécurisé — Vos données ne sont jamais stockées côté AtelierPro
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Export par défaut avec Suspense ─────────────────────────────────────────
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#0F3B32] animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Chargement...</p>
          </div>
        </div>
      }
    >
      <SignupInner />
    </Suspense>
  );
}
