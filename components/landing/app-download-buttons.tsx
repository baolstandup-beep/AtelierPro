'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Sparkles, X, Check, Smartphone, ArrowRight, Download, ExternalLink } from 'lucide-react';

interface AppDownloadButtonsProps {
  className?: string;
  theme?: 'light' | 'dark';
  layout?: 'row' | 'stacked';
}

export function AppDownloadButtons({ className = '', theme = 'dark', layout = 'row' }: AppDownloadButtonsProps) {
  const { isAuthenticated, isOnboardingDone } = useAppStore();
  const [modalType, setModalType] = useState<'app_store' | 'google_play' | null>(null);

  const webAppHref = isAuthenticated
    ? isOnboardingDone
      ? '/dashboard'
      : '/onboarding'
    : '/auth/register';

  return (
    <>
      <div className={`flex flex-wrap items-center justify-center gap-3.5 ${className}`}>
        {/* Apple App Store Button with Smooth Floating & Shimmer Animation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{
            opacity: 1,
            y: [0, -3, 0],
          }}
          transition={{
            opacity: { duration: 0.5 },
            y: {
              repeat: Infinity,
              duration: 4,
              ease: 'easeInOut',
            },
          }}
        >
          <motion.button
            whileHover={{
              scale: 1.05,
              y: -3,
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 255, 255, 0.15)',
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalType('app_store')}
            type="button"
            className="group relative flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0D1117] hover:bg-[#161B22] text-white border-2 border-slate-700 hover:border-slate-400 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors duration-300 cursor-pointer text-left overflow-hidden h-[54px]"
          >
            {/* Animated Shimmer Light Beam Effect */}
            <motion.span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              animate={{
                translateX: ['−100%', '200%'],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.5,
                ease: 'easeInOut',
                repeatDelay: 1.5,
              }}
            />

            {/* Apple Logo SVG with subtle hover wiggle */}
            <motion.div
              className="w-7 h-7 flex items-center justify-center shrink-0"
              whileHover={{ rotate: [-4, 4, -4, 0] }}
              transition={{ duration: 0.4 }}
            >
              <svg
                className="w-7 h-7 fill-current text-white shrink-0 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all"
                viewBox="0 0 170 170"
              >
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.75-7.94-12.18-14.58-6.19-9.24-11.03-19.78-14.52-31.62-3.48-11.83-5.23-23.36-5.23-34.58 0-14.56 3.73-26.68 11.19-36.35 7.46-9.67 16.92-14.6 28.37-14.8 4.35 0 9.29 1.15 14.82 3.46 5.53 2.31 9.38 3.51 11.55 3.61 1.74-.1 5.76-1.36 12.06-3.78 6.3-2.43 11.54-3.53 15.71-3.32 10.65.65 19.34 4.54 26.06 11.66-9.35 5.65-13.91 13.59-13.68 23.83.23 8.04 3.37 14.89 9.42 20.55 6.05 5.66 13.26 8.92 21.63 9.78-2.61 7.61-5.76 15.22-9.44 22.82zm-28.56-107.82c0-5.43 1.94-10.43 5.82-15 3.88-4.57 8.78-7.39 14.7-8.43.43 1.09.65 2.18.65 3.26 0 5.43-2.02 10.59-6.06 15.48-4.04 4.89-9.08 7.61-15.11 8.15z" />
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-300 font-normal leading-tight">
                Télécharger sur
              </span>
              <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none mt-0.5">
                l&apos;App Store
              </span>
            </div>
          </motion.button>
        </motion.div>

        {/* Google Play Store Button with Smooth Floating & Shimmer Animation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{
            opacity: 1,
            y: [0, -3, 0],
          }}
          transition={{
            opacity: { duration: 0.5, delay: 0.1 },
            y: {
              repeat: Infinity,
              duration: 4,
              ease: 'easeInOut',
              delay: 0.5,
            },
          }}
        >
          <motion.button
            whileHover={{
              scale: 1.05,
              y: -3,
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45), 0 0 20px rgba(0, 230, 118, 0.25)',
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setModalType('google_play')}
            type="button"
            className="group relative flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0D1117] hover:bg-[#161B22] text-white border-2 border-slate-700 hover:border-slate-400 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors duration-300 cursor-pointer text-left overflow-hidden h-[54px]"
          >
            {/* Animated Shimmer Light Beam Effect */}
            <motion.span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              animate={{
                translateX: ['−100%', '200%'],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.5,
                ease: 'easeInOut',
                delay: 0.7,
                repeatDelay: 1.5,
              }}
            />

            {/* Google Play Logo SVG with vibrant colors & rotation pop on hover */}
            <motion.div
              className="w-7 h-7 relative flex items-center justify-center shrink-0"
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <svg viewBox="0 0 512 512" className="w-full h-full group-hover:drop-shadow-[0_0_8px_rgba(0,230,118,0.5)] transition-all">
                <path
                  d="M325.3 234.3L104.6 13l280.8 161.2-60.1 59.9z"
                  fill="#00E676"
                />
                <path
                  d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z"
                  fill="#00B0FF"
                />
                <path
                  d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z"
                  fill="#FF3D00"
                />
                <path
                  d="M486.7 232.7l-101.3-58.4-60.1 60 60.1 60 101.3-58.4c17.5-10.1 17.5-26.6 0-36.7l-0-3.5z"
                  fill="#FFC107"
                />
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-300 font-normal leading-tight">
                Disponible sur
              </span>
              <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none mt-0.5">
                Google Play
              </span>
            </div>
          </motion.button>
        </motion.div>

        {/* Aligned "Commencer sur le web" Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            whileHover={{
              scale: 1.05,
              y: -3,
              boxShadow: '0 12px 35px rgba(46, 157, 116, 0.55), 0 0 25px rgba(46, 157, 116, 0.4)',
            }}
            whileTap={{ scale: 0.96 }}
            className="rounded-2xl"
          >
            <Link
              href={webAppHref}
              className="relative inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-2xl bg-gradient-to-r from-[#2E9D74] via-[#34A87C] to-[#258562] hover:from-[#258562] hover:to-[#1E6B4F] text-white font-bold text-sm sm:text-base tracking-wide shadow-[0_8px_25px_rgba(46,157,116,0.4)] transition-all h-[54px] overflow-hidden group"
            >
              {/* Subtle light shimmer sweep on hover */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <span>Commencer sur le web</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Installation / Store Guide Modal */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-3xl bg-[#0F172A] border border-slate-700 text-white p-6 sm:p-8 shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setModalType(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {modalType === 'app_store' ? (
                <div className="space-y-5 text-center">
                  <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="w-16 h-16 rounded-2xl bg-black border border-white/20 mx-auto flex items-center justify-center shadow-lg"
                  >
                    <svg className="w-9 h-9 fill-current text-white" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.75-7.94-12.18-14.58-6.19-9.24-11.03-19.78-14.52-31.62-3.48-11.83-5.23-23.36-5.23-34.58 0-14.56 3.73-26.68 11.19-36.35 7.46-9.67 16.92-14.6 28.37-14.8 4.35 0 9.29 1.15 14.82 3.46 5.53 2.31 9.38 3.51 11.55 3.61 1.74-.1 5.76-1.36 12.06-3.78 6.3-2.43 11.54-3.53 15.71-3.32 10.65.65 19.34 4.54 26.06 11.66-9.35 5.65-13.91 13.59-13.68 23.83.23 8.04 3.37 14.89 9.42 20.55 6.05 5.66 13.26 8.92 21.63 9.78-2.61 7.61-5.76 15.22-9.44 22.82zm-28.56-107.82c0-5.43 1.94-10.43 5.82-15 3.88-4.57 8.78-7.39 14.7-8.43.43 1.09.65 2.18.65 3.26 0 5.43-2.02 10.59-6.06 15.48-4.04 4.89-9.08 7.61-15.11 8.15z" />
                    </svg>
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Installer sur iPhone / iPad</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      AtelierPro fonctionne comme une application native sans encombrer la mémoire de votre appareil.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-2.5 text-xs text-slate-200">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2E9D74] text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                      <span>Ouvrez le site dans Safari sur votre iPhone.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2E9D74] text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                      <span>Appuyez sur le bouton <strong>Partager</strong> (icône avec la flèche vers le haut).</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2E9D74] text-white flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                      <span>Sélectionnez <strong>« Sur l&apos;écran d&apos;accueil »</strong>.</span>
                    </div>
                  </div>

                  <Link
                    href={webAppHref}
                    onClick={() => setModalType(null)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2E9D74] hover:bg-[#258562] text-white font-bold text-sm shadow-lg transition-transform active:scale-98"
                  >
                    <span>Lancer immédiatement</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-5 text-center">
                  <motion.div
                    initial={{ scale: 0.8, rotate: 10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="w-16 h-16 rounded-2xl bg-black border border-white/20 mx-auto flex items-center justify-center shadow-lg p-3"
                  >
                    <svg viewBox="0 0 512 512" className="w-full h-full">
                      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 59.9z" fill="#00E676" />
                      <path d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" fill="#00B0FF" />
                      <path d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z" fill="#FF3D00" />
                      <path d="M486.7 232.7l-101.3-58.4-60.1 60 60.1 60 101.3-58.4c17.5-10.1 17.5-26.6 0-36.7l-0-3.5z" fill="#FFC107" />
                    </svg>
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Installer sur Android / Google Play</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Accédez instantanément à l&apos;application optimisée pour tous les smartphones Android.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-2.5 text-xs text-slate-200">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2E9D74] text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                      <span>Ouvrez AtelierPro dans Chrome ou votre navigateur.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2E9D74] text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                      <span>Cliquez sur les 3 points en haut à droite.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2E9D74] text-white flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                      <span>Appuyez sur <strong>« Installer l&apos;application »</strong>.</span>
                    </div>
                  </div>

                  <Link
                    href={webAppHref}
                    onClick={() => setModalType(null)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2E9D74] hover:bg-[#258562] text-white font-bold text-sm shadow-lg transition-transform active:scale-98"
                  >
                    <span>Lancer immédiatement</span>
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
