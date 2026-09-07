'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  Scissors,
  Layers,
  ArrowRight,
  Clock,
  DollarSign,
  Tag,
  CheckCircle2,
  Bookmark,
  Share2,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export interface CatalogModel {
  id: string;
  name: string;
  category: 'HOMME' | 'FEMME' | 'MARIAGE' | 'CEREMONIE' | 'CASUAL';
  garmentType: string;
  difficulty: 'FACILE' | 'MOYEN' | 'COMPLEXE' | 'HAUTE_COUTURE';
  estimatedDays: number;
  recommendedFabrics: string[];
  fabricMetersNeeded: number;
  basePrice: number;
  description: string;
  features: string[];
  imagePlaceholderColor: string;
  accentBadge: string;
  popularityRank: number;
}

const CATALOG_MODELS: CatalogModel[] = [
  {
    id: 'mod-01',
    name: 'Grand Boubou 3 Pièces Royal Damassé',
    category: 'HOMME',
    garmentType: 'BOUBOU',
    difficulty: 'HAUTE_COUTURE',
    estimatedDays: 7,
    recommendedFabrics: ['Bazin Riche Getzner', 'Bazin Super Vainqueur', 'Soie Brodée'],
    fabricMetersNeeded: 10,
    basePrice: 85000,
    description: 'Le chef-d’œuvre traditionnel par excellence. Comprend le grand boubou flottant, la tunique brodée col officier et le pantalon assorti avec broderies dorées au fil de soie.',
    features: ['Broderie fil de soie sur col et poitrine', 'Finitions festonnées à la main', 'Poche invisible sécurisée'],
    imagePlaceholderColor: 'from-amber-900 to-amber-950',
    accentBadge: 'Bestseller Cérémonie',
    popularityRank: 1,
  },
  {
    id: 'mod-02',
    name: 'Kaftan Moderne Sénégalais Col Brodé',
    category: 'HOMME',
    garmentType: 'KAFTAN',
    difficulty: 'MOYEN',
    estimatedDays: 4,
    recommendedFabrics: ['Lin Brut Belge', 'Bazin Riche Teint', 'Coton Glacé'],
    fabricMetersNeeded: 4.5,
    basePrice: 45000,
    description: 'Coupe épurée et contemporaine avec fentes latérales et broderie ton sur ton minimaliste sur le plastron.',
    features: ['Col Mao structuré', 'Boutons recouverts de tissu', 'Coupe slim ajustée'],
    imagePlaceholderColor: 'from-emerald-900 to-[#0F3B32]',
    accentBadge: 'Tendance Urbaine',
    popularityRank: 2,
  },
  {
    id: 'mod-03',
    name: 'Robe Sirène Gala en Wax & Mousseline',
    category: 'FEMME',
    garmentType: 'ROBE',
    difficulty: 'HAUTE_COUTURE',
    estimatedDays: 8,
    recommendedFabrics: ['Wax Vlisco Hollandais', 'Soie Sauvage', 'Dentelle perlée'],
    fabricMetersNeeded: 6,
    basePrice: 95000,
    description: 'Robe de soirée sculpturale épousant la silhouette avec traîne en mousseline fluide et incrustations de dentelle artisanale.',
    features: ['Corset baleiné intégré', 'Drapé asymétrique fluide', 'Dos nu en V plongeant'],
    imagePlaceholderColor: 'from-purple-950 to-indigo-950',
    accentBadge: 'Haute Confection',
    popularityRank: 3,
  },
  {
    id: 'mod-04',
    name: 'Taille Basse & Jupe Longue en Bazin Floral',
    category: 'FEMME',
    garmentType: 'ENSEMBLE',
    difficulty: 'COMPLEXE',
    estimatedDays: 6,
    recommendedFabrics: ['Bazin Riche Teint Artisanal', 'Broderie Richelieu'],
    fabricMetersNeeded: 7,
    basePrice: 65000,
    description: 'Ensemble féminin traditionnel raffiné avec corsage à basque structurée et jupe plissée ornée de motifs brodés.',
    features: ['Basque évasée structurée', 'Manches pagode 3/4', 'Doublure 100% coton respirant'],
    imagePlaceholderColor: 'from-rose-950 to-pink-950',
    accentBadge: 'Mariage & Baptême',
    popularityRank: 4,
  },
  {
    id: 'mod-05',
    name: 'Saharienne Sur-Mesure en Lin Naturel',
    category: 'CASUAL',
    garmentType: 'CHEMISE',
    difficulty: 'MOYEN',
    estimatedDays: 3,
    recommendedFabrics: ['Lin Brut Naturel', 'Gabardine Coton Légère'],
    fabricMetersNeeded: 3.5,
    basePrice: 38000,
    description: 'Veste-chemise d’été avec 4 poches à soufflet plaquées et ceinture amovible à boucle.',
    features: ['4 poches plaquées à rabat', 'Ceinture avec boucle en corne', 'Coutures rabattues renforcées'],
    imagePlaceholderColor: 'from-amber-950 to-stone-900',
    accentBadge: 'Style Casual Chic',
    popularityRank: 5,
  },
  {
    id: 'mod-06',
    name: 'Costume 2 Pièces Safari Veste Droite',
    category: 'HOMME',
    garmentType: 'COSTUME',
    difficulty: 'HAUTE_COUTURE',
    estimatedDays: 7,
    recommendedFabrics: ['Laine Froide Tropicale', 'Lin-Soie Mélangé'],
    fabricMetersNeeded: 5.5,
    basePrice: 110000,
    description: 'Ensemble complet veste droite 2 boutons et pantalon ajusté à pinces, confectionné selon les règles du tailleur sartorial.',
    features: ['Entoilage semi-traditionnel', 'Boutonnières ouvertes bas de manches', 'Doublure jacquard'],
    imagePlaceholderColor: 'from-slate-900 to-zinc-950',
    accentBadge: 'Prestige Business',
    popularityRank: 6,
  },
];

const CATEGORIES = [
  { id: 'ALL', label: 'Tous les modèles' },
  { id: 'HOMME', label: 'Homme' },
  { id: 'FEMME', label: 'Femme' },
  { id: 'CEREMONIE', label: 'Cérémonie & Fêtes' },
  { id: 'CASUAL', label: 'Casual & Quotidien' },
];

export default function LookbookCataloguePage() {
  const router = useRouter();
  const { currentWorkshop } = useAppStore();
  const [models, setModels] = useState<CatalogModel[]>(CATALOG_MODELS);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedModel, setSelectedModel] = useState<CatalogModel | null>(null);

  const filteredModels = models.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.recommendedFabrics.some((f) => f.toLowerCase().includes(search.toLowerCase()));

    const matchCat =
      selectedCategory === 'ALL' ||
      m.category === selectedCategory ||
      (selectedCategory === 'CEREMONIE' && (m.category === 'MARIAGE' || m.accentBadge.includes('Cérémonie')));

    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0F3B32]/10 text-[#0F3B32]">
              Lookbook & Fiches Techniques
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Inspiration & Patronage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif tracking-tight mt-1">
            Catalogue de Modèles & Coupes
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Sélectionnez un modèle pour estimer instantanément le métrage de tissu et initier une nouvelle commande client.
          </p>
        </div>

        <Link
          href="/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#0F3B32]/15 hover:bg-[#0B2B26] transition-all self-start md:self-auto"
        >
          <Scissors className="w-4 h-4" />
          <span>Créer une commande libre</span>
        </Link>
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-xs space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un modèle, style ou matière (ex: Grand Boubou, Kaftan, Lin, Robe Sirène)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F3B32]/20 focus:border-[#0F3B32] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0',
                  active
                    ? 'bg-[#0F3B32] text-white shadow-xs'
                    : 'bg-[#F4EFE6] text-slate-700 hover:bg-[#EBE7DF]'
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Models Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className="bg-white rounded-3xl border border-[#EBE7DF] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
          >
            {/* Visual Banner */}
            <div className={cn("h-44 bg-gradient-to-br p-5 relative flex flex-col justify-between text-white", model.imagePlaceholderColor)}>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-white/20 backdrop-blur-md border border-white/20 uppercase tracking-wider">
                  {model.accentBadge}
                </span>
                <span className="text-xs font-bold bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-300" /> ~{model.estimatedDays} jours
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest block mb-0.5">
                  {model.category} • {model.difficulty}
                </span>
                <h3 className="text-lg font-black font-serif leading-tight drop-shadow-xs">
                  {model.name}
                </h3>
              </div>
            </div>

            {/* Body Info */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {model.description}
              </p>

              {/* Requirements & Metrics */}
              <div className="p-3 bg-[#FBF9F5] rounded-2xl border border-[#EBE7DF] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0F3B32]" /> Métrage conseillé :
                  </span>
                  <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {model.fabricMetersNeeded} mètres
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                    Tissus recommandés :
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {model.recommendedFabrics.map((f, i) => (
                      <span key={i} className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-[#EBE7DF]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Direct Order CTA */}
              <div className="pt-2 border-t border-[#EBE7DF] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">À partir de</span>
                  <span className="text-base font-black text-[#0F3B32] font-serif">
                    {formatCurrency(model.basePrice)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedModel(model)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    title="Voir fiche technique complète"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <Link
                    href={`/orders/new?model=${encodeURIComponent(model.name)}&price=${model.basePrice}&meters=${model.fabricMetersNeeded}&type=${model.garmentType}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F3B32] hover:bg-[#0B2B26] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <span>Lancer commande</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal: Fiche Technique Détaillée ── */}
      {selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EBE7DF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-[#EBE7DF]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F3B32]">
                  {selectedModel.category} • Niveau {selectedModel.difficulty}
                </span>
                <h3 className="text-xl font-black text-slate-900 font-serif mt-0.5">
                  {selectedModel.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {selectedModel.description}
              </p>

              <div className="p-4 bg-[#FBF9F5] rounded-2xl border border-[#EBE7DF] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Métrage requis estimé :</span>
                  <span className="font-bold text-slate-900">{selectedModel.fabricMetersNeeded} mètres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Délai moyen de confection :</span>
                  <span className="font-bold text-slate-900">{selectedModel.estimatedDays} jours ouvrés</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Prix de base confection :</span>
                  <span className="font-black text-[#0F3B32]">{formatCurrency(selectedModel.basePrice)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Détails & Finitions Haute Confection
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {selectedModel.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EBE7DF] flex items-center justify-between">
              <button
                onClick={() => setSelectedModel(null)}
                className="px-4 py-2.5 rounded-xl border border-[#EBE7DF] text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
              <Link
                href={`/orders/new?model=${encodeURIComponent(selectedModel.name)}&price=${selectedModel.basePrice}&meters=${selectedModel.fabricMetersNeeded}&type=${selectedModel.garmentType}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs font-bold hover:bg-[#0B2B26] shadow-md shadow-[#0F3B32]/15"
              >
                <Scissors className="w-4 h-4" />
                <span>Créer commande avec ce patron</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
