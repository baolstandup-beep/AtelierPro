'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Star,
  Scissors,
  MessageCircle,
  Phone,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Calendar,
  X,
  Layers,
} from 'lucide-react';
import { PUBLIC_WORKSHOPS, PublicModel } from '@/lib/explore-data';
import { formatCurrency } from '@/lib/utils';

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workshop = PUBLIC_WORKSHOPS.find((w) => w.id === resolvedParams.id);
  const [selectedModel, setSelectedModel] = useState<PublicModel | null>(null);

  if (!workshop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Atelier non trouvé</h2>
          <p className="text-xs text-slate-500 mb-6">L&apos;atelier recherché n&apos;existe pas ou a été désactivé.</p>
          <Link
            href="/ateliers"
            className="px-5 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs font-bold shadow-md"
          >
            Retourner à l&apos;annuaire des ateliers
          </Link>
        </div>
      </div>
    );
  }

  const generateWhatsAppLink = (model?: PublicModel) => {
    const cleanPhone = workshop.whatsapp.replace(/[^0-9]/g, '');
    let text = `Bonjour ${workshop.name}, j'ai vu votre vitrine sur AtelierPro !`;
    if (model) {
      text += ` Je souhaite avoir des informations pour la confection du modèle "${model.name}" (Prix estimé: ${formatCurrency(model.basePrice)}).`;
    } else {
      text += ` Je souhaite prendre rendez-vous ou me renseigner pour une création sur-mesure.`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 selection:bg-[#0F3B32] selection:text-white">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-[#0F3B32] text-white shadow-md border-b border-[#185c4e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/ateliers" className="inline-flex items-center gap-2 text-xs font-bold text-[#FEF3C7] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Ateliers</span>
          </Link>

          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1eb956] text-white text-xs font-extrabold shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Contacter sur WhatsApp</span>
          </a>
        </div>
      </header>

      {/* WORKSHOP HERO COVER & PROFILE */}
      <section className="relative bg-slate-900 text-white">
        <div className="h-64 sm:h-80 relative overflow-hidden">
          <img
            src={workshop.coverUrl}
            alt={workshop.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-20 pb-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <img
                src={workshop.avatarUrl}
                alt={workshop.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-lg flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-3xl font-black font-serif-luxury text-slate-900">
                    {workshop.name}
                  </h1>
                  {workshop.isVerified && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 mb-3 font-medium">
                  {workshop.tagline}
                </p>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    {workshop.rating} ({workshop.reviewsCount} avis)
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                    {workshop.address}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {workshop.openingHours}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <a
                href={`tel:${workshop.phone}`}
                className="py-3 px-5 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-slate-500" />
                <span>{workshop.phone}</span>
              </a>

              <a
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1eb956] text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Demande de Devis</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* MODELS CATALOG SECTION */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-luxury text-slate-900 flex items-center gap-2">
              <Scissors className="w-6 h-6 text-[#D97706]" />
              <span>Catalogue des Modèles sur-mesure</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sélectionnez un modèle pour consulter les caractéristiques et commander.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#0F3B32] text-white text-xs font-bold">
            {workshop.models.length} Création(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {workshop.models.map((model) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedModel(model)}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative h-64 bg-slate-100 overflow-hidden">
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {model.badge && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#D97706] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      {model.badge}
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                      {model.garmentType}
                    </span>
                    <h4 className="text-base font-extrabold mt-1 font-serif-luxury line-clamp-1">
                      {model.name}
                    </h4>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                    {model.description}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                      {model.estimatedDays} jours de confection
                    </span>
                    <span className="font-extrabold text-[#0F3B32] text-sm">
                      {formatCurrency(model.basePrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-slate-900 group-hover:bg-[#0F3B32] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Commander sur WhatsApp</span>
                  <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* MODEL DETAIL MODAL */}
      <AnimatePresence>
        {selectedModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8"
            >
              <div className="relative h-64 bg-slate-900">
                <img
                  src={selectedModel.imageUrl}
                  alt={selectedModel.name}
                  className="w-full h-full object-cover opacity-90"
                />
                <button
                  onClick={() => setSelectedModel(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/60 hover:bg-slate-950 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <span className="px-2.5 py-1 rounded bg-[#D97706] text-[10px] font-extrabold uppercase tracking-wider">
                    {selectedModel.category}
                  </span>
                  <h3 className="text-2xl font-black font-serif-luxury mt-1">
                    {selectedModel.name}
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {selectedModel.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Prix Indicatif
                    </span>
                    <span className="text-lg font-extrabold text-[#0F3B32]">
                      {formatCurrency(selectedModel.basePrice)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Délai Estimé
                    </span>
                    <span className="text-lg font-extrabold text-slate-800">
                      {selectedModel.estimatedDays} jours
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Tissus recommandés :
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedModel.recommendedFabrics.map((f) => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900 text-xs font-semibold">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Fermer
                </button>
                <a
                  href={generateWhatsAppLink(selectedModel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-5 rounded-xl bg-[#25D366] hover:bg-[#1eb956] text-white text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Commander sur WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
