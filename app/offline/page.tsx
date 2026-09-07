'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Scissors, ArrowRight, ShieldCheck } from 'lucide-react';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);

  const handleRetry = () => {
    setIsRetrying(true);
    if (navigator.onLine) {
      window.location.reload();
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 1000);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F4ED] text-[#111827] flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans antialiased selection:bg-[#0F3B32] selection:text-white">
      {/* Top Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#0F3B32] flex items-center justify-center text-white shadow-sm">
            <Scissors className="w-4 h-4 text-[#D97706]" />
          </div>
          <span className="text-lg font-black tracking-tight text-[#0F3B32] font-serif-luxury">
            Atelier<span className="text-[#D97706]">Pro</span>
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Mode hors ligne
        </span>
      </header>

      {/* Main Content Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,59,50,0.06)] border border-[#E7E2D8] text-center space-y-6">
          {/* Animated Offline Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0F3B32]/5 border-2 border-[#0F3B32]/10 mx-auto flex items-center justify-center text-[#0F3B32] shadow-inner relative">
            <WifiOff className="w-10 h-10 sm:w-12 sm:h-12 text-[#0F3B32]" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D97706] text-white flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold">!</span>
            </div>
          </div>

          {/* Heading and text */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F3B32] tracking-tight font-serif-luxury">
              Connexion indisponible
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Il semble que votre appareil ne soit pas connecté à Internet. Vos données d&apos;atelier sont protégées et synchroniseront dès le retour du réseau.
            </p>
          </div>

          {/* Status Indicator */}
          {isOnline ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Connexion rétablie ! Vous pouvez recharger la page.
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F7F4ED] border border-[#E7E2D8] text-slate-600 text-xs flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0F3B32]" />
              <span>Sécurité active : aucun cache sensible stocké hors ligne.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#0F3B32] hover:bg-[#14532D] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Vérification...' : 'Réessayer'}</span>
            </button>

            <Link
              href="/"
              className="w-full py-3 px-5 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Retour à l&apos;accueil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <footer className="max-w-md mx-auto w-full text-center text-xs text-slate-500 py-2">
        <p>AtelierPro — Application Progressive Web</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Assistance directe : +221 77 303 31 96</p>
      </footer>
    </main>
  );
}
