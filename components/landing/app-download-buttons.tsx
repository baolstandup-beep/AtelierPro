'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  X,
  ArrowRight,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface AppDownloadButtonsProps {
  className?: string;
}

export function AppDownloadButtons({
  className = '',
}: AppDownloadButtonsProps) {
  const { isAuthenticated, isOnboardingDone } = useAppStore();
  const [modalType, setModalType] = useState<'ios' | 'android' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect Standalone Display Mode (Android / iOS / Desktop)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Listen for display mode changes
    const matcher = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) setIsInstalled(true);
    };
    matcher.addEventListener('change', handleDisplayChange);

    // 2. Listen for Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setModalType(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      matcher.removeEventListener('change', handleDisplayChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const webAppHref = isAuthenticated
    ? isOnboardingDone
      ? '/dashboard'
      : '/onboarding'
    : '/auth/login?source=pwa';

  // Handle Android Install Click
  const handleAndroidInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
        setModalType('android');
      }
    } else {
      // Fallback manual instructions modal
      setModalType('android');
    }
  };

  // If already running in standalone mode or just installed
  if (isStandalone || isInstalled) {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-3.5 ${className}`}>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>AtelierPro est installé en mode application</span>
        </div>
        <Link
          href={webAppHref}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0F3B32] hover:bg-[#14532D] text-white font-bold text-sm tracking-wide shadow-md transition-all h-[48px]"
        >
          <span>Accéder à mon Atelier</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap items-center justify-center gap-3.5 ${className}`}>
        {/* 1. Installer sur iPhone (iOS PWA) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.button
            whileHover={{
              scale: 1.03,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setModalType('ios')}
            type="button"
            className="group relative flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0D1117] hover:bg-[#161B22] text-white border-2 border-slate-700 hover:border-slate-400 shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-colors duration-200 cursor-pointer text-left min-h-[52px]"
          >
            {/* Apple Logo SVG */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6 fill-current text-white shrink-0"
                viewBox="0 0 170 170"
              >
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.75-7.94-12.18-14.58-6.19-9.24-11.03-19.78-14.52-31.62-3.48-11.83-5.23-23.36-5.23-34.58 0-14.56 3.73-26.68 11.19-36.35 7.46-9.67 16.92-14.6 28.37-14.8 4.35 0 9.29 1.15 14.82 3.46 5.53 2.31 9.38 3.51 11.55 3.61 1.74-.1 5.76-1.36 12.06-3.78 6.3-2.43 11.54-3.53 15.71-3.32 10.65.65 19.34 4.54 26.06 11.66-9.35 5.65-13.91 13.59-13.68 23.83.23 8.04 3.37 14.89 9.42 20.55 6.05 5.66 13.26 8.92 21.63 9.78-2.61 7.61-5.76 15.22-9.44 22.82zm-28.56-107.82c0-5.43 1.94-10.43 5.82-15 3.88-4.57 8.78-7.39 14.7-8.43.43 1.09.65 2.18.65 3.26 0 5.43-2.02 10.59-6.06 15.48-4.04 4.89-9.08 7.61-15.11 8.15z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-300 font-medium leading-tight">
                Application Web
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight leading-none mt-0.5">
                Installer sur iPhone
              </span>
            </div>
          </motion.button>
        </motion.div>

        {/* 2. Installer sur Android (Chromium PWA) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <motion.button
            whileHover={{
              scale: 1.03,
              boxShadow: '0 10px 25px rgba(0, 230, 118, 0.2)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAndroidInstallClick}
            type="button"
            className="group relative flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0D1117] hover:bg-[#161B22] text-white border-2 border-slate-700 hover:border-emerald-600/70 shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-colors duration-200 cursor-pointer text-left min-h-[52px]"
          >
            {/* Android Icon SVG */}
            <div className="w-6 h-6 relative flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-emerald-400">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1556-.2696.0634-.6138-.2062-.7694-.2691-.1556-.6133-.0634-.7689.2062l-2.0232 3.5042c-1.4239-.6486-3.0039-1.0094-4.6792-1.0094s-3.2553.3608-4.6792 1.0094L5.0978 5.3013c-.1556-.2696-.4998-.3618-.7689-.2062-.2696.1556-.3618.4998-.2062.7694l1.996 3.4572C2.666 11.2335.3333 15.3534.3333 20.0889h23.3334c0-4.7355-2.3327-8.8554-5.7852-10.7675" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-300 font-medium leading-tight">
                Application Web
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight leading-none mt-0.5">
                Installer sur Android
              </span>
            </div>
          </motion.button>
        </motion.div>

        {/* 3. Commencer sur le web (Bouton d'accès direct) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Link
            href={webAppHref}
            className="relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#0F3B32] via-[#14532D] to-[#0F3B32] hover:from-[#14532D] hover:to-[#0F3B32] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all min-h-[52px] group"
          >
            <span>Ouvrir sur le web</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>

      {/* Explication sous les boutons */}
      <p className="text-[11px] text-[#6B7280] text-center mt-2 max-w-md mx-auto">
        AtelierPro s&apos;installe directement depuis votre navigateur et s&apos;ouvre ensuite comme une application.
      </p>

      {/* Guide Modals (iOS & Android) */}
      <AnimatePresence>
        {modalType && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setModalType(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl bg-[#0F172A] border border-slate-700 text-white p-6 sm:p-7 shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setModalType(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              {modalType === 'ios' ? (
                /* iOS Safari Instructions */
                <div className="space-y-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-white/20 mx-auto flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 fill-current text-white" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.75-7.94-12.18-14.58-6.19-9.24-11.03-19.78-14.52-31.62-3.48-11.83-5.23-23.36-5.23-34.58 0-14.56 3.73-26.68 11.19-36.35 7.46-9.67 16.92-14.6 28.37-14.8 4.35 0 9.29 1.15 14.82 3.46 5.53 2.31 9.38 3.51 11.55 3.61 1.74-.1 5.76-1.36 12.06-3.78 6.3-2.43 11.54-3.53 15.71-3.32 10.65.65 19.34 4.54 26.06 11.66-9.35 5.65-13.91 13.59-13.68 23.83.23 8.04 3.37 14.89 9.42 20.55 6.05 5.66 13.26 8.92 21.63 9.78-2.61 7.61-5.76 15.22-9.44 22.82zm-28.56-107.82c0-5.43 1.94-10.43 5.82-15 3.88-4.57 8.78-7.39 14.7-8.43.43 1.09.65 2.18.65 3.26 0 5.43-2.02 10.59-6.06 15.48-4.04 4.89-9.08 7.61-15.11 8.15z" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Installer sur iPhone & iPad</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      AtelierPro s&apos;installe depuis Safari sans passer par l&apos;App Store.
                    </p>
                  </div>

                  {/* Steps */}
                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-3 text-xs text-slate-200">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">1</span>
                      <span>Ouvrez AtelierPro dans <strong>Safari</strong> sur votre iPhone.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">2</span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        Appuyez sur <strong className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"><Share2 className="w-3 h-3 text-sky-400" /> Partager</strong> en bas de l&apos;écran.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">3</span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        Sélectionnez <strong className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"><PlusSquare className="w-3 h-3 text-emerald-400" /> Sur l&apos;écran d&apos;accueil</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">4</span>
                      <span>Appuyez sur <strong>« Ajouter »</strong> en haut à droite.</span>
                    </div>
                  </div>

                  <Link
                    href={webAppHref}
                    onClick={() => setModalType(null)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F3B32] hover:bg-[#14532D] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                  >
                    <span>Continuer dans le navigateur</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                /* Android Chrome Instructions */
                <div className="space-y-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-white/20 mx-auto flex items-center justify-center shadow-lg p-2.5">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-emerald-400">
                      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1556-.2696.0634-.6138-.2062-.7694-.2691-.1556-.6133-.0634-.7689.2062l-2.0232 3.5042c-1.4239-.6486-3.0039-1.0094-4.6792-1.0094s-3.2553.3608-4.6792 1.0094L5.0978 5.3013c-.1556-.2696-.4998-.3618-.7689-.2062-.2696.1556-.3618.4998-.2062.7694l1.996 3.4572C2.666 11.2335.3333 15.3534.3333 20.0889h23.3334c0-4.7355-2.3327-8.8554-5.7852-10.7675" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Installer sur Android</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Ajoutez l&apos;application directement sur votre écran d&apos;accueil.
                    </p>
                  </div>

                  {/* Steps */}
                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-3 text-xs text-slate-200">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">1</span>
                      <span>Ouvrez AtelierPro dans <strong>Chrome</strong>.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">2</span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        Appuyez sur les <strong className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"><MoreVertical className="w-3 h-3 text-amber-400" /> trois points</strong> en haut à droite.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-[11px] font-bold shrink-0 border border-emerald-500/30">3</span>
                      <span>Sélectionnez <strong>« Installer l&apos;application »</strong> ou <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong>.</span>
                    </div>
                  </div>

                  <Link
                    href={webAppHref}
                    onClick={() => setModalType(null)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F3B32] hover:bg-[#14532D] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                  >
                    <span>Continuer dans le navigateur</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
