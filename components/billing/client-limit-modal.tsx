'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount?: number;
}

export function ClientLimitModal({ isOpen, onClose, currentCount = 5 }: ClientLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden bg-[#FBF9F5] border border-[#E7E2D8] rounded-3xl shadow-2xl"
        >
          {/* Header Banner */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-b from-white to-[#FBF9F5] border-b border-[#E7E2D8]">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-full hover:bg-stone-100"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Formule Découverte</span>
            </div>

            <h3 className="text-2xl font-black text-stone-900 font-serif">
              Limite atteinte
            </h3>

            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Vous avez utilisé les <strong>{currentCount} clients</strong> inclus dans votre formule <strong>Découverte</strong>.
              Passez à <strong>Starter</strong> ou <strong>Pro</strong> pour continuer à développer votre atelier en illimité.
            </p>
          </div>

          {/* Plan Options Grid */}
          <div className="p-6 sm:p-8 space-y-4">
            {/* Starter Option */}
            <div className="p-5 bg-white border border-[#E7E2D8] rounded-2xl shadow-sm hover:border-[#0F3B32] transition-all">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <h4 className="text-lg font-bold text-stone-900">Formule Starter</h4>
                  <p className="text-xs text-stone-500">Clients et commandes illimités</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#0F3B32]">5 000 FCFA</span>
                  <span className="text-xs text-stone-500 font-medium"> / mois</span>
                </div>
              </div>

              <ul className="my-3 space-y-1.5 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Clients & mesures <strong>illimités</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Suivi Kanban de production</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Reçus et rappels WhatsApp en 1 clic</span>
                </li>
              </ul>

              <button
                onClick={() => {
                  onClose();
                  router.push('/pricing?plan=starter');
                }}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-white border-2 border-[#0F3B32] text-[#0F3B32] hover:bg-[#0F3B32] hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Passer à Starter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Pro Option (Recommandée) */}
            <div className="relative p-5 bg-gradient-to-br from-white to-[#FAF6EE] border-2 border-[#D97706] rounded-2xl shadow-md">
              <div className="absolute -top-3 right-5 bg-gradient-to-r from-[#D97706] to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                Populaire
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <h4 className="text-lg font-bold text-stone-900">Formule Pro</h4>
                  <p className="text-xs text-stone-500">Pour les ateliers en pleine croissance</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#D97706]">15 000 FCFA</span>
                  <span className="text-xs text-stone-500 font-medium"> / mois</span>
                </div>
              </div>

              <ul className="my-3 space-y-1.5 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>Tout ce qui est inclus dans Starter</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>Gestion d&apos;équipe et tailleurs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>Rapports financiers et export Excel</span>
                </li>
              </ul>

              <button
                onClick={() => {
                  onClose();
                  router.push('/pricing?plan=pro');
                }}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D97706] to-amber-700 hover:from-amber-700 hover:to-[#D97706] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>Passer à Pro</span>
                <ArrowRight className="w-4 h-4 text-amber-200" />
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-6 py-4 bg-stone-100/80 border-t border-[#E7E2D8] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-stone-600">
            <span>Paiement Wave &amp; Orange Money • Vos données sont conservées</span>
            <button
              onClick={() => {
                onClose();
                router.push('/pricing');
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E7E2D8] text-xs font-bold text-[#0F3B32] hover:bg-[#0F3B32] hover:text-white transition-all cursor-pointer shadow-sm"
            >
              Voir les abonnements
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
