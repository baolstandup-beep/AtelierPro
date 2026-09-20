'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Scissors, CheckCircle2, Lock, Eye, EyeOff, Loader2,
  AlertCircle, Phone, ShieldCheck, ArrowRight
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

// ─── Inner component (useSearchParams inside Suspense) ───────────────────────
function CompleteSignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const pid = searchParams.get('pid');
  const urlStatus = searchParams.get('status');

  const [signupInfo, setSignupInfo] = useState<{
    id: string;
    status: string;
    first_name: string;
    phone: string;
    is_paid: boolean;
    is_completed: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ pin: '', confirmPin: '' });
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Vérifier l'état côté serveur (jamais faire confiance au param ?status=success)
  useEffect(() => {
    async function checkStatus() {
      if (!ref && !pid) {
        setError('Lien invalide ou expiré.');
        setLoading(false);
        return;
      }

      if (urlStatus === 'error' || urlStatus === 'cancel') {
        setError('Le paiement a été annulé ou a échoué. Veuillez réessayer.');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (pid) params.set('pid', pid);
        if (ref) params.set('ref', ref);

        const res = await fetch(`/api/subscription/complete?${params}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Pré-inscription introuvable.');
          setLoading(false);
          return;
        }

        setSignupInfo(data);

        if (data.is_completed) {
          setError('Ce compte a déjà été créé. Connectez-vous.');
        } else if (!data.is_paid) {
          setError('Paiement non encore confirmé. Patientez quelques secondes et actualisez la page.');
        }
      } catch {
        setError('Erreur réseau. Vérifiez votre connexion.');
      }
      setLoading(false);
    }

    checkStatus();
  }, [ref, pid, urlStatus]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.pin || !/^\d{4}$/.test(form.pin)) errs.pin = 'Le code PIN doit contenir exactement 4 chiffres.';
    if (form.pin !== form.confirmPin) errs.confirmPin = 'Les codes PIN ne correspondent pas.';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    if (!signupInfo) return;

    setSubmitting(true);
    setFormErrors({});
    setError('');

    try {
      const res = await fetch('/api/subscription/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingSignupId: signupInfo.id,
          pin: form.pin,
          confirmPin: form.confirmPin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création du compte.');
        setSubmitting(false);
        return;
      }

      // Injecter la session dans le client Supabase
      if (data.session?.access_token) {
        const sb = getSupabase();
        await sb?.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#0F3B32] animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] font-sans antialiased flex flex-col">
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
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* ─── Succès ─── */}
          {success ? (
            <div className="bg-white rounded-3xl border border-[#EBE7DF] p-8 text-center shadow-xl">
              <div className="w-16 h-16 bg-[#16A34A]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#111827] font-serif-luxury mb-2">
                Compte créé avec succès !
              </h1>
              <p className="text-slate-500 text-sm mb-6">
                Votre abonnement AtelierPro est activé. Redirection en cours...
              </p>
              <Loader2 className="w-6 h-6 text-[#0F3B32] animate-spin mx-auto" />
            </div>
          ) : signupInfo?.is_paid && !error ? (
            /* ─── Formulaire de finalisation ─── */
            <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xl overflow-hidden">
              {/* Banner succès paiement */}
              <div className="bg-gradient-to-r from-[#16A34A] to-[#15803d] px-6 py-5 text-white text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-90" />
                <h2 className="font-bold text-base">✓ Paiement confirmé</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  Votre abonnement AtelierPro est activé.
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <h1 className="text-xl font-extrabold text-[#111827] font-serif-luxury mb-1 text-center">
                  Créez maintenant votre accès
                </h1>
                <p className="text-sm text-slate-500 text-center mb-6">
                  Bonjour {signupInfo.first_name} ! Choisissez un code PIN sécurisé.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Code PIN à 4 chiffres *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="● ● ● ●"
                        value={form.pin}
                        onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm tracking-widest bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.pin ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      <button type="button" onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.pin && <p className="text-[11px] text-red-500 mt-1">{formErrors.pin}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirmer le PIN *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="● ● ● ●"
                        value={form.confirmPin}
                        onChange={e => setForm(f => ({ ...f, confirmPin: e.target.value.replace(/\D/g, '') }))}
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm tracking-widest bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${formErrors.confirmPin ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.confirmPin && <p className="text-[11px] text-red-500 mt-1">{formErrors.confirmPin}</p>}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      submitting
                        ? 'bg-slate-200 text-slate-400 cursor-wait'
                        : 'bg-[#0F3B32] text-white hover:bg-[#185c4e] shadow-lg shadow-emerald-900/20'
                    }`}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Création du compte...</>
                    ) : (
                      <>Accéder à mon atelier <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                  PIN stocké de façon chiffrée — jamais en clair
                </div>
              </div>
            </div>
          ) : (
            /* ─── Paiement non confirmé ou erreur ─── */
            <div className="bg-white rounded-3xl border border-[#EBE7DF] p-8 text-center shadow-xl">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="text-xl font-extrabold text-[#111827] font-serif-luxury mb-2">
                {error || 'Paiement en attente'}
              </h1>
              <p className="text-slate-500 text-sm mb-6">
                Si vous venez de payer, le traitement peut prendre quelques secondes.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F3B32] text-white text-sm font-bold hover:bg-[#185c4e] transition-colors"
              >
                Actualiser
              </button>
              <div className="mt-4">
                <Link href="/pricing" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  Retour aux tarifs
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0F3B32] animate-spin" />
      </div>
    }>
      <CompleteSignupInner />
    </Suspense>
  );
}
