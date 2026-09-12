'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  Scissors,
  MessageCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  Layers,
  Building2,
  ArrowRight,
  Crown,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { PUBLIC_WORKSHOPS, PublicWorkshop, PublicModel } from '@/lib/explore-data';
import { formatCurrency } from '@/lib/utils';

export default function AteliersShowcaseSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('TOUS');
  const [activeTab, setActiveTab] = useState<'workshops' | 'models'>('workshops');
  const [selectedModel, setSelectedModel] = useState<{ model: PublicModel; workshop: PublicWorkshop } | null>(null);

  const cities = useMemo(() => {
    const set = new Set<string>();
    PUBLIC_WORKSHOPS.forEach((w) => set.add(w.city));
    return ['TOUS', ...Array.from(set)];
  }, []);

  const allModels = useMemo(() => {
    const list: { model: PublicModel; workshop: PublicWorkshop }[] = [];
    PUBLIC_WORKSHOPS.forEach((w) => {
      w.models.forEach((m) => {
        list.push({ model: m, workshop: w });
      });
    });
    return list;
  }, []);

  const filteredWorkshops = useMemo(() => {
    return PUBLIC_WORKSHOPS.filter((w) => {
      const matchesCity = selectedCity === 'TOUS' || w.city === selectedCity;
      const matchesSearch =
        searchQuery === '' ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCity && matchesSearch;
    });
  }, [searchQuery, selectedCity]);

  const filteredModels = useMemo(() => {
    return allModels.filter(({ model, workshop }) => {
      const matchesCity = selectedCity === 'TOUS' || workshop.city === selectedCity;
      const matchesSearch =
        searchQuery === '' ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.garmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workshop.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesSearch;
    });
  }, [allModels, searchQuery, selectedCity]);

  const generateWhatsAppLink = (workshop: PublicWorkshop, model?: PublicModel) => {
    const cleanPhone = workshop.whatsapp.replace(/[^0-9]/g, '');
    let text = `Bonjour ${workshop.name}, j'ai trouvé votre atelier sur AtelierPro !`;
    if (model) {
      text += ` Je suis intéressé(e) par le modèle "${model.name}" (Prix estimé: ${formatCurrency(model.basePrice)}). Pouvons-nous échanger ?`;
    } else {
      text += ` Je souhaite me renseigner pour une commande sur-mesure.`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <section id="ateliers-vitrine" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* SECTION TITLE */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EBF7F1] border border-[#0F3B32]/15 text-[#0F3B32] text-xs font-bold uppercase tracking-wider mb-3">
          <Crown className="w-3.5 h-3.5 text-[#D97706]" />
          Ateliers Partenaires Certifiés & VIP
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-luxury tracking-tight mb-3">
          Trouvez un Atelier de Couture & <br />
          <span className="text-[#0F3B32]">Explorez les Modèles Exclusifs</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          Retrouvez ici les ateliers abonnés <span className="font-bold text-[#0F3B32]">Business Évolutif</span> et nos partenaires <span className="font-bold text-[#D97706]">Sponsorisés VIP</span> à Dakar, Abidjan et Thiès.
        </p>
      </div>

      {/* INFO BADGE FOR TAILORS */}
      <div className="max-w-4xl mx-auto mb-8 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#D97706] flex-shrink-0" />
          <span>
            <strong>Vous êtes tailleur ?</strong> Seuls les membres de la formule <strong>Business Évolutif</strong> et les ateliers ayant activé l&apos;option <strong>Pub / Epinglé</strong> sont mis en avant auprès des clients.
          </span>
        </div>
        <Link
          href="/auth/register"
          className="px-3.5 py-1.5 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-[11px] whitespace-nowrap transition-colors flex-shrink-0"
        >
          Rejoindre le Business Évolutif
        </Link>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200/80 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par atelier, ville (Dakar, Abidjan...), tenue (Boubou, Kaftan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3B32] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('workshops')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'workshops'
                  ? 'bg-[#0F3B32] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Ateliers Pro ({filteredWorkshops.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'models'
                  ? 'bg-[#0F3B32] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modèles ({filteredModels.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 border-t border-slate-100 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 flex-shrink-0 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#D97706]" /> Ville:
          </span>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCity === city
                  ? 'bg-[#D97706] text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {city === 'TOUS' ? 'Toutes les Villes' : city}
            </button>
          ))}
        </div>
      </div>

      {/* WORKSHOPS GRID */}
      {activeTab === 'workshops' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkshops.map((workshop) => (
            <motion.div
              key={workshop.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-40 bg-slate-100 overflow-hidden">
                  <img
                    src={workshop.coverUrl}
                    alt={workshop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Plan / Sponsored Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    {workshop.plan === 'BUSINESS_EVOLUTIF' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0F3B32]/90 backdrop-blur-md text-[#FEF3C7] text-[10px] font-extrabold flex items-center gap-1 border border-[#FBBF24]/30 shadow-sm">
                        <Crown className="w-3 h-3 text-[#FBBF24]" />
                        Business Évolutif
                      </span>
                    )}
                    {workshop.isSponsored && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#D97706]/90 backdrop-blur-md text-white text-[10px] font-extrabold flex items-center gap-1 border border-white/20 shadow-sm">
                        <Zap className="w-3 h-3 fill-white" />
                        Sponsorisé (Pub)
                      </span>
                    )}
                  </div>

                  {workshop.isVerified && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Vérifié</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-white/90 text-slate-900 text-xs font-extrabold flex items-center gap-1 backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{workshop.rating}</span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-20 text-white">
                    <h3 className="text-base font-bold font-serif-luxury line-clamp-1">
                      {workshop.name}
                    </h3>
                    <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#FBBF24]" />
                      <span>{workshop.neighborhood}, {workshop.city}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed font-medium">
                    {workshop.tagline}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {workshop.specialties.slice(0, 3).map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <Link
                  href={`/ateliers/${workshop.id}`}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Vitrine</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <a
                  href={generateWhatsAppLink(workshop)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1eb956] text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODELS GRID */}
      {activeTab === 'models' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map(({ model, workshop }) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedModel({ model, workshop })}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative h-56 bg-slate-100 overflow-hidden">
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {model.badge && (
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[#D97706] text-white text-[10px] font-extrabold uppercase tracking-wider">
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

                <div className="p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                      {model.estimatedDays}j confection
                    </span>
                    <span className="font-extrabold text-[#0F3B32] text-sm">
                      {formatCurrency(model.basePrice)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                      {workshop.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {workshop.city}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  className="w-full py-2 rounded-xl bg-[#0F3B32] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Détails & WhatsApp</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#FBBF24]" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* FOOTER LINK TO ALL ATELIERS */}
      <div className="mt-10 text-center">
        <Link
          href="/ateliers"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-lg transition-all hover:scale-105"
        >
          <span>Voir tout l&apos;annuaire des ateliers VIP ({PUBLIC_WORKSHOPS.length}+ partenaires)</span>
          <ArrowRight className="w-4 h-4 text-[#FBBF24]" />
        </Link>
      </div>

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
              <div className="relative h-60 bg-slate-900">
                <img
                  src={selectedModel.model.imageUrl}
                  alt={selectedModel.model.name}
                  className="w-full h-full object-cover opacity-90"
                />
                <button
                  onClick={() => setSelectedModel(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950/60 text-white flex items-center justify-center backdrop-blur-md"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <span className="px-2.5 py-0.5 rounded bg-[#D97706] text-[10px] font-extrabold uppercase tracking-wider">
                    {selectedModel.model.category}
                  </span>
                  <h3 className="text-xl font-black font-serif-luxury mt-1">
                    {selectedModel.model.name}
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{selectedModel.workshop.name}</span>
                    <span className="text-slate-500">{selectedModel.workshop.neighborhood}, {selectedModel.workshop.city}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{selectedModel.workshop.rating}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedModel.model.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Prix Indicatif
                    </span>
                    <span className="text-base font-extrabold text-[#0F3B32]">
                      {formatCurrency(selectedModel.model.basePrice)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Délai Estimé
                    </span>
                    <span className="text-base font-extrabold text-slate-800">
                      {selectedModel.model.estimatedDays} jours
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Fermer
                </button>
                <a
                  href={generateWhatsAppLink(selectedModel.workshop, selectedModel.model)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1eb956] text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Commander sur WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
