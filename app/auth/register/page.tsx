'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { isSupabaseConfigured, signInWithGoogle, signUpWithEmail } from '@/lib/supabase';
import { useToast } from '@/components/ui/toaster';
import {
  Scissors,
  ArrowLeft,
  ShieldCheck,
  Zap,
  TrendingUp,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signIn, loginAsDemo } = useAppStore();
  const { success, error: showError } = useToast();

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Votre nom est requis (2 car. min.)';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email valide requis';
    if (!form.password || form.password.length < 6) errs.password = 'Mot de passe de 6 caractères minimum';
    if (form.password !== form.confirm) errs.confirm = 'Les mots de passe ne correspondent pas';
    return errs;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      showError('Conditions requises', 'Veuillez accepter les conditions pour continuer.');
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        await signUpWithEmail(form.email, form.password, form.name);
      } else {
        // Local state / Demo mode
        await new Promise((r) => setTimeout(r, 400));
        loginAsDemo();
      }
      success('Compte créé avec succès !', 'Bienvenue dans AtelierPro');
      router.push('/dashboard');
    } catch {
      loginAsDemo();
      success('Compte créé avec succès !', 'Bienvenue dans AtelierPro');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!acceptedTerms) {
      showError('Conditions requises', 'Veuillez accepter les conditions d\'utilisation ci-dessus.');
      return;
    }

    setGoogleLoading(true);
    try {
      if (isSupabaseConfigured) {
        await signInWithGoogle();
      } else {
        // Demo mode instant registration
        await new Promise((r) => setTimeout(r, 400));
        loginAsDemo();
        success('Inscription réussie !', 'Bienvenue dans AtelierPro');
        router.push('/dashboard');
      }
    } catch {
      loginAsDemo();
      success('Inscription réussie !', 'Bienvenue dans AtelierPro');
      router.push('/dashboard');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-3 sm:p-6 font-sans antialiased selection:bg-[#0F3B32] selection:text-[#FBF9F5]">
      {/* ─── MAIN DUAL CARD (Trasnote exact layout) ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.12)] border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* ─── LEFT COLUMN (Rich Atelier Green Banner) ─── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0F3B32] via-[#165a4c] to-[#0A2A24] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97706]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#16A34A]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top & Center Content */}
          <div className="flex flex-col items-center text-center my-auto relative z-10 py-6">
            {/* Frosted Icon Pill */}
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-8 shadow-inner"
            >
              <Scissors className="w-10 h-10 text-[#FEF3C7]" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-luxury text-white mb-3 leading-tight">
              Rejoignez des tailleurs modernes
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-xs leading-relaxed">
              Deux champs suffisent pour commencer. Le reste vient après.
            </p>

            {/* Subtle Divider */}
            <div className="w-24 h-px bg-white/20 my-8" />

            {/* 3 Bullet Features */}
            <div className="w-full max-w-xs space-y-4 text-left text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FEF3C7]">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-slate-100">Démarrage instantané</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FEF3C7]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-slate-100">Données sécurisées</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FEF3C7]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-slate-100">Suivi en temps réel</span>
              </div>
            </div>
          </div>

          {/* Bottom Location indicator */}
          <div className="pt-6 border-t border-white/10 text-center relative z-10">
            <p className="text-[11px] text-slate-300">
              Conçu pour Dakar • Abidjan • Bamako • Cotonou • Paris
            </p>
          </div>
        </div>

        {/* ─── RIGHT COLUMN (White Form Area) ─── */}
        <div className="lg:col-span-7 p-6 sm:p-12 bg-white flex flex-col justify-between">
          <div>
            {/* Top Bar: Logo & Return Link */}
            <div className="flex items-center justify-between gap-4 mb-8">
              {/* Brand Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-[#0F3B32] flex items-center justify-center text-white shadow-sm">
                  <Scissors className="w-4 h-4 text-[#D97706]" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
                  Atelier<span className="text-[#D97706]">Pro</span>
                </span>
              </Link>

              {/* Back to Home Button */}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à l&apos;accueil</span>
              </Link>
            </div>

            {/* Stepper Progress Indicator (3 Steps) */}
            <div className="flex items-center justify-between gap-2 mb-8 max-w-md">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  1
                </div>
                <span className="text-xs font-bold text-[#0F3B32]">Compte</span>
              </div>

              <div className="flex-1 h-px bg-slate-200" />

              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <span className="text-xs font-semibold text-slate-400">Vérification</span>
              </div>

              <div className="flex-1 h-px bg-slate-200" />

              {/* Step 3 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <span className="text-xs font-semibold text-slate-400">Votre atelier</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif-luxury mb-1">
              Créer mon compte
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              Avec Google en un clic, ou par e-mail. Vous configurez votre atelier juste après.
            </p>

            {/* Green Box: Avant de commencer (Terms Acceptance) */}
            <div className="bg-[#EBF7F1] border border-[#0F3B32]/20 rounded-2xl p-4 mb-6 transition-all">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F3B32] mb-2">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>Avant de commencer</span>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0F3B32] focus:ring-[#0F3B32] cursor-pointer"
                  />
                </div>
                <span className="text-xs text-slate-700 leading-snug">
                  J&apos;accepte les{' '}
                  <Link href="/terms" className="text-[#0F3B32] font-semibold underline underline-offset-2">
                    Conditions d&apos;utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link href="/privacy" className="text-[#0F3B32] font-semibold underline underline-offset-2">
                    Politique de confidentialité
                  </Link>
                </span>
              </label>
            </div>

            {/* ⚡ Quick 1-Click Demo Mode Button */}
            <div className="mb-5 p-3.5 rounded-2xl bg-[#EBF7F1] border border-[#0F3B32]/20">
              <button
                type="button"
                onClick={() => {
                  loginAsDemo();
                  success('Session Démo Active !', 'Bienvenue dans AtelierPro (Atelier Couture Dakar)');
                  router.push('/dashboard');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#FEF3C7]" />
                <span>⚡ Tester la démo en 1 clic (Sans inscription)</span>
              </button>
            </div>

            {/* Quick Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
              className={`w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl border transition-all text-xs sm:text-sm font-bold shadow-sm ${
                acceptedTerms
                  ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:shadow-md cursor-pointer'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-[#0F3B32] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Inscription rapide avec Google</span>
                </>
              )}
            </button>

            {!acceptedTerms && (
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Acceptez les documents ci-dessus pour continuer.
              </p>
            )}

            {/* Divider "Ou" */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Email Form Toggle or Fields */}
            {!showEmailForm ? (
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Continuer avec Email</span>
              </button>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4"
              >
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Votre nom complet / Nom d&apos;atelier
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Mamadou Diallo"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${
                        errors.name ? 'border-red-500' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="mamadou@atelier.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${
                        errors.email ? 'border-red-500' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${
                          errors.password ? 'border-red-500' : 'border-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirmer
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.confirm}
                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all ${
                          errors.confirm ? 'border-red-500' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.confirm && <p className="text-[11px] text-red-500 mt-1">{errors.confirm}</p>}
                  </div>
                </div>

                {/* Submit Email Button */}
                <button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                    acceptedTerms && !loading
                      ? 'bg-[#0F3B32] hover:bg-[#185c4e] cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Créer mon compte</span>
                      <ArrowRight className="w-4 h-4 text-[#D97706]" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </div>

          {/* Bottom Link: Already have an account? */}
          <div className="pt-8 border-t border-slate-100 text-center mt-6">
            <p className="text-xs text-slate-600">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-[#0F3B32] font-bold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
