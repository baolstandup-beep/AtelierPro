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
  Sparkles,
  Clock,
  Tag,
  CheckCircle2,
  ChevronRight,
  X,
  Layers,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { PUBLIC_WORKSHOPS, PublicWorkshop, PublicModel } from '@/lib/explore-data';
import { formatCurrency } from '@/lib/utils';

export default function AteliersDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('TOUS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
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
      const matchesCategory = selectedCategory === 'TOUS' || model.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.garmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workshop.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesCategory && matchesSearch;
    });
  }, [allModels, searchQuery, selectedCity, selectedCategory]);

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
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 selection:bg-[#0F3B32] selection:text-white">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-[#0F3B32] text-white shadow-md border-b border-[#185c4e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#D97706] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight font-serif-luxury">
              Atelier<span className="text-[#D97706]">Pro</span>
              <span className="ml-2 text-xs font-sans uppercase tracking-widest text-[#FEF3C7] font-semibold bg-[#165a4c] px-2 py-0.5 rounded-full border border-white/10">
                Annuaire & Modèles
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Accueil</span>
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D97706] hover:bg-[#b46305] text-xs font-bold text-white shadow-sm transition-colors"
            >
              <span>Inscrire mon atelier</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative bg-gradient-to-br from-[#0F3B32] via-[#165a4c] to-[#0A2A24] text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97706]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D97706]/20 border border-[#D97706]/30 text-[#FEF3C7] text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            Trouvez les meilleurs tailleurs & ateliers d&apos;Afrique
          </span>
          <h1 className="text-3xl sm:text-5xl font-black font-serif-luxury tracking-tight mb-4 leading-tight">
            Explorez les Ateliers de Couture <br className="hidden sm:inline" />
            <span className="text-[#FBBF24]">& leurs Créations Exclusives</span>
          </h1>
          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto mb-8 font-medium">
            Découvrez des ateliers certifiés à Dakar, Abidjan, Thiès et Bamako. Consultez les modèles, comparez les délais et contactez directement les maîtres tailleurs sur WhatsApp.
          </p>

          <div className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-2xl border border-slate-200">
              <Search className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher par atelier, ville (Dakar, Abidjan...), tenue (Boubou, Kaftan)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS & NAVIGATION TABS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 border border-slate-300/60 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('workshops')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'workshops'
                  ? 'bg-[#0F3B32] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Ateliers ({filteredWorkshops.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'models'
                  ? 'bg-[#0F3B32] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Catalogue Modèles ({filteredModels.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" /> Ville:
            </span>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCity === city
                    ? 'bg-[#D97706] text-white font-bold shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {city === 'TOUS' ? 'Toutes les Villes' : city}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'models' && (
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 flex-shrink-0">
              <Tag className="w-3.5 h-3.5" /> Style:
            </span>
            {['TOUS', 'HOMME', 'FEMME', 'MARIAGE', 'CEREMONIE', 'CASUAL'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0F3B32] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* CONTENT GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {activeTab === 'workshops' && (
          <div>
            {filteredWorkshops.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">Aucun atelier trouvé</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Essayez de modifier votre recherche ou de changer la ville sélectionnée.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {filteredWorkshops.map((workshop) => (
                  <motion.div
                    key={workshop.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative h-44 bg-slate-100 overflow-hidden">
                        <img
                          src={workshop.coverUrl}
                          alt={workshop.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                        {workshop.isVerified && (
                          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Atelier Vérifié</span>
                          </div>
                        )}

                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-md text-slate-900 text-xs font-extrabold flex items-center gap-1 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{workshop.rating}</span>
                          <span className="text-[10px] text-slate-500 font-medium">({workshop.reviewsCount})</span>
                        </div>

                        <div className="absolute bottom-3 left-4 right-20 text-white">
                          <h3 className="text-lg font-extrabold tracking-tight font-serif-luxury drop-shadow-sm">
                            {workshop.name}
                          </h3>
                          <p className="text-xs text-emerald-100 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#FBBF24]" />
                            <span>{workshop.neighborhood}, {workshop.city}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-5">
                        <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed font-medium">
                          {workshop.tagline}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {workshop.specialties.map((spec) => (
                            <span
                              key={spec}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-semibold mb-2">
                          <span className="flex items-center gap-1.5">
                            <Scissors className="w-4 h-4 text-[#0F3B32]" />
                            <span>{workshop.models.length} Modèle(s) au catalogue</span>
                          </span>
                          <span className="text-[11px] text-[#D97706] font-bold">À partir de {formatCurrency(Math.min(...workshop.models.map(m => m.basePrice)))}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 grid grid-cols-2 gap-3">
                      <Link
                        href={`/ateliers/${workshop.id}`}
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Voir la Vitrine</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>

                      <a
                        href={generateWhatsAppLink(workshop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1eb956] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all hover:shadow-md"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'models' && (
          <div>
            {filteredModels.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">Aucun modèle trouvé</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ajustez vos filtres de recherche ou sélectionnez une autre catégorie.
                </p>
              </div>
            ) : (
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
                      <div className="relative h-60 bg-slate-100 overflow-hidden">
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

                      <div className="p-4">
                        <div className="flex items-center justify-between text-xs mb-3">
                          <span className="text-slate-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                            {model.estimatedDays} jours de confection
                          </span>
                          <span className="font-extrabold text-[#0F3B32] text-sm">
                            {formatCurrency(model.basePrice)}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <img
                              src={workshop.avatarUrl}
                              alt={workshop.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            />
                            <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                              {workshop.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {workshop.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl bg-slate-900 group-hover:bg-[#0F3B32] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Détails & Devis WhatsApp</span>
                        <ChevronRight className="w-4 h-4 text-[#FBBF24]" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODEL DETAIL MODAL */}
      <AnimatePresence>
        {selectedModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8"
            >
              <div className="relative h-64 bg-slate-900">
                <img
                  src={selectedModel.model.imageUrl}
                  alt={selectedModel.model.name}
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
                    {selectedModel.model.category}
                  </span>
                  <h3 className="text-2xl font-black font-serif-luxury mt-1">
                    {selectedModel.model.name}
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedModel.workshop.avatarUrl}
                      alt={selectedModel.workshop.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{selectedModel.workshop.name}</h4>
                      <p className="text-[11px] text-slate-500">{selectedModel.workshop.neighborhood}, {selectedModel.workshop.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{selectedModel.workshop.rating}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {selectedModel.model.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Prix Indicatif Confection
                    </span>
                    <span className="text-lg font-extrabold text-[#0F3B32]">
                      {formatCurrency(selectedModel.model.basePrice)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Délai de Réalisation
                    </span>
                    <span className="text-lg font-extrabold text-slate-800">
                      {selectedModel.model.estimatedDays} jours
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Tissus recommandés :
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedModel.model.recommendedFabrics.map((f) => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900 text-xs font-semibold">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Finitions & Détails :
                  </h5>
                  <ul className="space-y-1.5">
                    {selectedModel.model.features.map((feat) => (
                      <li key={feat} className="text-xs text-slate-600 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
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
                  href={generateWhatsAppLink(selectedModel.workshop, selectedModel.model)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-5 rounded-xl bg-[#25D366] hover:bg-[#1eb956] text-white text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Demander un devis sur WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
