'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { isSupabaseConfigured, signInWithGoogle, signInWithEmail } from '@/lib/supabase';
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
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loginAsDemo, isOnboardingDone, syncWithSupabase } = useAppStore();
  const { success, error: showError } = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide';
    if (!form.password || form.password.length < 6) errs.password = 'Mot de passe trop court (6 car. min.)';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      // 1. Anti-Brute-Force Rate Limit Check (Max 5 attempts per IP)
      const rateCheck = await fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attempt' }),
      });

      if (rateCheck.status === 429) {
        const data = await rateCheck.json().catch(() => ({}));
        showError(
          'Accès Bloqué (Force Brute Détectée)',
          data.error || 'Trop de tentatives (5 max). Votre IP est temporairement bloquée pour 15 minutes.'
        );
        return;
      }

      // 2. Authentication flow
      if (isSupabaseConfigured) {
        const { user } = await signInWithEmail(form.email, form.password);
        if (user) {
          const fullName = user.user_metadata?.full_name || form.email.split('@')[0];
          await syncWithSupabase(user.id, fullName);
        }
      } else {
        // Mode Démo / Store Local
        await new Promise((r) => setTimeout(r, 300));
        loginAsDemo();
      }

      // Reset rate limit on valid login
      fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'success' }),
      }).catch(() => {});

      success('Bienvenue !', 'Connexion réussie');
      router.push('/dashboard');
    } catch (err: any) {
      if (isSupabaseConfigured) {
        showError('Erreur de connexion', err?.message || 'Identifiants incorrects.');
      } else {
        loginAsDemo();
        success('Bienvenue !', 'Connexion réussie (Mode Démo)');
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      if (isSupabaseConfigured) {
        await signInWithGoogle();
      } else {
        // Mode Démo
        await new Promise((r) => setTimeout(r, 400));
        loginAsDemo();
        success('Connexion réussie !', 'Bienvenue dans AtelierPro');
        router.push('/dashboard');
      }
    } catch {
      loginAsDemo();
      success('Connexion réussie !', 'Bienvenue dans AtelierPro');
      router.push('/dashboard');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-3 sm:p-6 font-sans antialiased selection:bg-[#0F3B32] selection:text-[#FBF9F5]">
      {/* ─── MAIN DUAL CARD (Trasnote Style) ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.12)] border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* ─── LEFT COLUMN (Rich Atelier Green Banner) ─── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0F3B32] via-[#165a4c] to-[#0A2A24] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97706]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#16A34A]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Center Content */}
          <div className="flex flex-col items-center text-center my-auto relative z-10 py-6">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-8 shadow-inner"
            >
              <Scissors className="w-10 h-10 text-[#FEF3C7]" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-luxury text-white mb-3 leading-tight">
              Bon retour parmi nous
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-xs leading-relaxed">
              Accédez à votre carnet de mesures, vos commandes et vos rapports d&apos;atelier.
            </p>

            <div className="w-24 h-px bg-white/20 my-8" />

            <div className="w-full max-w-xs space-y-4 text-left text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FEF3C7]">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-slate-100">Accès rapide & fluide</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FEF3C7]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-slate-100">Données chiffrées & isolées</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FEF3C7]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-slate-100">Trésorerie en temps réel</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-center relative z-10">
            <p className="text-[11px] text-slate-300">
              AtelierPro — Dakar • Abidjan • Bamako • Cotonou • Paris
            </p>
          </div>
        </div>

        {/* ─── RIGHT COLUMN (White Form Area) ─── */}
        <div className="lg:col-span-7 p-6 sm:p-12 bg-white flex flex-col justify-between">
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-4 mb-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-[#0F3B32] flex items-center justify-center text-white shadow-sm">
                  <Scissors className="w-4 h-4 text-[#D97706]" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
                  Atelier<span className="text-[#D97706]">Pro</span>
                </span>
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à l&apos;accueil</span>
              </Link>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif-luxury mb-1">
              Se connecter à mon atelier
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              Entrez vos identifiants ou lancez la démo instantanée.
            </p>

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

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold shadow-sm transition-all hover:shadow-md cursor-pointer mb-4"
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
                  <span>Continuer avec Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ou avec e-mail</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Mot de passe
                  </label>
                  <Link href="/auth/forgot-password" className="text-[11px] text-[#0F3B32] font-semibold hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider text-white bg-[#0F3B32] hover:bg-[#185c4e] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4 text-[#D97706]" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Link: Don't have an account? */}
          <div className="pt-8 border-t border-slate-100 text-center mt-6">
            <p className="text-xs text-slate-600">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="text-[#0F3B32] font-bold hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
