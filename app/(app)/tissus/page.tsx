'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Package,
  Sparkles,
  ArrowUpDown,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Info,
  DollarSign,
  Tag,
  Palette,
  Scissors
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface FabricItem {
  id: string;
  name: string;
  category: 'BAZIN' | 'WAX' | 'SOIE' | 'LIN' | 'CREPE' | 'BRODERIE' | 'VELOURS' | 'AUTRE';
  colorName: string;
  colorHex: string;
  pattern: string;
  origin: string;
  totalMeters: number;
  availableMeters: number;
  reservedMeters: number;
  pricePerMeter: number;
  supplier: string;
  qualityGrade: 'SUPER_VIP' | 'PREMIUM' | 'STANDARD';
  locationShelf: string;
  lowStockThreshold: number;
  notes?: string;
  assignedOrders?: { id: string; orderNumber: string; customerName: string; meters: number }[];
}

const INITIAL_FABRICS: FabricItem[] = [
  {
    id: 'fab-01',
    name: 'Bazin Riche GAGNY LAH Getzner',
    category: 'BAZIN',
    colorName: 'Bleu Roi Impérial',
    colorHex: '#1E3A8A',
    pattern: 'Brillant Damassé floral',
    origin: 'Autriche / Mali',
    totalMeters: 45,
    availableMeters: 14,
    reservedMeters: 31,
    pricePerMeter: 18000,
    supplier: 'Maison du Bazin Sandaga',
    qualityGrade: 'SUPER_VIP',
    locationShelf: 'Étagère A - Tiroir 1',
    lowStockThreshold: 10,
    notes: 'Excellente tenue, idéal pour Grands Boubous Tabaski.',
    assignedOrders: [
      { id: 'ord-01', orderNumber: 'CMD-2024-001', customerName: 'Amadou Diallo', meters: 10 },
      { id: 'ord-02', orderNumber: 'CMD-2024-004', customerName: 'El Hadj Ndiaye', meters: 8 },
    ],
  },
  {
    id: 'fab-02',
    name: 'Wax Vlisco Hollandais Authentique',
    category: 'WAX',
    colorName: 'Jaune Ocre & Émeraude',
    colorHex: '#D97706',
    pattern: 'Motif Hirondelle / Fleur de Mariage',
    origin: 'Hollande',
    totalMeters: 36,
    availableMeters: 6,
    reservedMeters: 30,
    pricePerMeter: 14500,
    supplier: 'Boutique Wax Prestige HLM',
    qualityGrade: 'SUPER_VIP',
    locationShelf: 'Étagère B - Rayon 2',
    lowStockThreshold: 8,
    notes: '100% Coton premium, grand classique cérémonial.',
    assignedOrders: [
      { id: 'ord-03', orderNumber: 'CMD-2024-002', customerName: 'Fatou Sow', meters: 6 },
    ],
  },
  {
    id: 'fab-03',
    name: 'Soie Sauvage & Mousseline Perlée',
    category: 'SOIE',
    colorName: 'Champagne Nacré',
    colorHex: '#F3E5D8',
    pattern: 'Uni Reflets Dorés',
    origin: 'Italie / Dubaï',
    totalMeters: 20,
    availableMeters: 2.5,
    reservedMeters: 17.5,
    pricePerMeter: 24000,
    supplier: 'Dakar Tissus Haute Couture',
    qualityGrade: 'SUPER_VIP',
    locationShelf: 'Coffre Soies & Précieux',
    lowStockThreshold: 5,
    notes: 'Attention : repassage doux exclusivement.',
    assignedOrders: [
      { id: 'ord-04', orderNumber: 'CMD-2024-005', customerName: 'Aïssatou Ba', meters: 4.5 },
    ],
  },
  {
    id: 'fab-04',
    name: 'Lin Brut Naturel Premium',
    category: 'LIN',
    colorName: 'Sable Désert',
    colorHex: '#D4C3A3',
    pattern: 'Tissage Aéré Respirant',
    origin: 'Belgique',
    totalMeters: 50,
    availableMeters: 28,
    reservedMeters: 22,
    pricePerMeter: 11000,
    supplier: 'Comptoir Textile Almadies',
    qualityGrade: 'PREMIUM',
    locationShelf: 'Étagère C - Rayon 1',
    lowStockThreshold: 12,
    notes: 'Idéal chemises col mao, sahariennes et ensembles d’été.',
    assignedOrders: [
      { id: 'ord-05', orderNumber: 'CMD-2024-006', customerName: 'Moussa Sarr', meters: 7 },
    ],
  },
  {
    id: 'fab-05',
    name: 'Dentelle Broderie Richelieu Coton',
    category: 'BRODERIE',
    colorName: 'Blanc Pur Céleste',
    colorHex: '#FFFFFF',
    pattern: 'Festons ajourés traditionnels',
    origin: 'Suisse',
    totalMeters: 25,
    availableMeters: 4,
    reservedMeters: 21,
    pricePerMeter: 22000,
    supplier: 'Marché Kermel Tissus d’Art',
    qualityGrade: 'SUPER_VIP',
    locationShelf: 'Étagère D - Tiroir 3',
    lowStockThreshold: 6,
    notes: 'Apprécié pour les baptêmes et tenues de fête religieuse.',
    assignedOrders: [
      { id: 'ord-06', orderNumber: 'CMD-2024-007', customerName: 'Mariama Kouyaté', meters: 5 },
    ],
  },
  {
    id: 'fab-06',
    name: 'Crêpe Georgette Élasthanne',
    category: 'CREPE',
    colorName: 'Vert Forêt Sombre',
    colorHex: '#0F3B32',
    pattern: 'Uni Fluide & Extensible',
    origin: 'France',
    totalMeters: 30,
    availableMeters: 18,
    reservedMeters: 12,
    pricePerMeter: 9500,
    supplier: 'Import Dakar Express',
    qualityGrade: 'PREMIUM',
    locationShelf: 'Étagère B - Rayon 4',
    lowStockThreshold: 8,
    notes: 'Pour robes de cocktail et drapés structurés.',
    assignedOrders: [],
  },
  {
    id: 'fab-07',
    name: 'Bazin Super Vainqueur Teint Artisanal',
    category: 'BAZIN',
    colorName: 'Indigo Foncé Marbré',
    colorHex: '#1E1B4B',
    pattern: 'Teinture Thioup Bamako',
    origin: 'Mali (Bamako)',
    totalMeters: 40,
    availableMeters: 1.5,
    reservedMeters: 38.5,
    pricePerMeter: 16000,
    supplier: 'Atelier Thioup Medina',
    qualityGrade: 'PREMIUM',
    locationShelf: 'Étagère A - Tiroir 2',
    lowStockThreshold: 8,
    notes: 'Attention dégorger avant premier lavage.',
    assignedOrders: [
      { id: 'ord-07', orderNumber: 'CMD-2024-008', customerName: 'Ousmane Fall', meters: 12 },
    ],
  },
];

const CATEGORIES = [
  { id: 'ALL', label: 'Tous les coupons' },
  { id: 'BAZIN', label: 'Bazin Riche' },
  { id: 'WAX', label: 'Wax Hollandais' },
  { id: 'SOIE', label: 'Soies & Mousselines' },
  { id: 'LIN', label: 'Lin Brut' },
  { id: 'BRODERIE', label: 'Dentelles & Broderies' },
  { id: 'CREPE', label: 'Crêpes & Fluides' },
];

export default function FabricsInventoryPage() {
  const { currentWorkshop } = useAppStore();
  const [fabrics, setFabrics] = useState<FabricItem[]>(INITIAL_FABRICS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'IN_STOCK'>('ALL');
  const [selectedFabric, setSelectedFabric] = useState<FabricItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isOrderAssignModalOpen, setIsOrderAssignModalOpen] = useState(false);

  // Form State for new Fabric
  const [formData, setFormData] = useState({
    name: '',
    category: 'BAZIN' as FabricItem['category'],
    colorName: '',
    colorHex: '#0F3B32',
    pattern: '',
    origin: '',
    totalMeters: 10,
    pricePerMeter: 15000,
    supplier: '',
    locationShelf: 'Rayon A',
    notes: '',
  });

  // Filtered list
  const filteredFabrics = useMemo(() => {
    return fabrics.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.colorName.toLowerCase().includes(search.toLowerCase()) ||
        f.pattern.toLowerCase().includes(search.toLowerCase()) ||
        f.supplier.toLowerCase().includes(search.toLowerCase()) ||
        f.origin.toLowerCase().includes(search.toLowerCase());

      const matchCat = categoryFilter === 'ALL' || f.category === categoryFilter;

      const isLow = f.availableMeters <= f.lowStockThreshold;
      const matchStock =
        stockStatusFilter === 'ALL' ||
        (stockStatusFilter === 'LOW' && isLow) ||
        (stockStatusFilter === 'IN_STOCK' && !isLow);

      return matchSearch && matchCat && matchStock;
    });
  }, [fabrics, search, categoryFilter, stockStatusFilter]);

  // Overall Stats
  const totalMetersInStock = fabrics.reduce((sum, f) => sum + f.availableMeters, 0);
  const totalStockValue = fabrics.reduce((sum, f) => sum + f.availableMeters * f.pricePerMeter, 0);
  const lowStockCount = fabrics.filter((f) => f.availableMeters <= f.lowStockThreshold).length;
  const totalReservedMeters = fabrics.reduce((sum, f) => sum + f.reservedMeters, 0);

  function handleCreateFabric(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) return;

    const newFabric: FabricItem = {
      id: `fab-${Date.now()}`,
      name: formData.name,
      category: formData.category,
      colorName: formData.colorName || 'Couleur personnalisée',
      colorHex: formData.colorHex,
      pattern: formData.pattern || 'Motif uni',
      origin: formData.origin || 'Importé',
      totalMeters: Number(formData.totalMeters),
      availableMeters: Number(formData.totalMeters),
      reservedMeters: 0,
      pricePerMeter: Number(formData.pricePerMeter),
      supplier: formData.supplier || 'Fournisseur local',
      qualityGrade: 'PREMIUM',
      locationShelf: formData.locationShelf || 'Étagère générale',
      lowStockThreshold: 5,
      notes: formData.notes,
      assignedOrders: [],
    };

    setFabrics([newFabric, ...fabrics]);
    setIsNewModalOpen(false);
    setFormData({
      name: '',
      category: 'BAZIN',
      colorName: '',
      colorHex: '#0F3B32',
      pattern: '',
      origin: '',
      totalMeters: 10,
      pricePerMeter: 15000,
      supplier: '',
      locationShelf: 'Rayon A',
      notes: '',
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0F3B32]/10 text-[#0F3B32]">
              Gestion des Matières Premières
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {currentWorkshop?.name || 'Atelier'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif tracking-tight mt-1">
            Tissus, Bazin & Stocks
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Suivi des coupons, métrages restants, réservations par commande et valorisation de l'inventaire.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#0F3B32]/15 hover:bg-[#0B2B26] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Coupon / Rouleau</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Métrage Disponible</span>
            <Layers className="w-4 h-4 text-[#0F3B32]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
            {totalMetersInStock.toFixed(1)} <span className="text-sm font-normal text-slate-500">mètres</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="text-emerald-700 font-bold">+{fabrics.length} références</span> en atelier
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Valeur Estimée Stock</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#0F3B32] font-serif truncate">
            {formatCurrency(totalStockValue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Prix moyen : {formatCurrency(Math.round(totalStockValue / (totalMetersInStock || 1)))}/m</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Métrage Réservé</span>
            <Scissors className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 font-serif">
            {totalReservedMeters.toFixed(1)} <span className="text-sm font-normal text-slate-500">m</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span className="font-bold">Pour commandes en confection</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className={cn(
          "p-5 rounded-2xl border shadow-xs transition-all",
          lowStockCount > 0 ? "bg-red-50/70 border-red-200" : "bg-white border-[#EBE7DF]"
        )}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider", lowStockCount > 0 ? "text-red-700" : "text-slate-500")}>
              Alerte Stock Faible
            </span>
            <AlertTriangle className={cn("w-4 h-4", lowStockCount > 0 ? "text-red-600 animate-pulse" : "text-slate-400")} />
          </div>
          <p className={cn("text-2xl sm:text-3xl font-black font-serif", lowStockCount > 0 ? "text-red-700" : "text-slate-900")}>
            {lowStockCount} <span className="text-sm font-normal text-slate-500">tissu(s)</span>
          </p>
          <div className="mt-2 text-xs text-red-600 font-semibold">
            {lowStockCount > 0 ? 'Réapprovisionnement conseillé' : 'Tous les stocks sont optimaux'}
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, couleur, motif, fournisseur (ex: Bazin Getzner, Vlisco, Sandaga)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F3B32]/20 focus:border-[#0F3B32] outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Quick Stock Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl self-start">
            <button
              onClick={() => setStockStatusFilter('ALL')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                stockStatusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Tous ({fabrics.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('LOW')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1',
                stockStatusFilter === 'LOW'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:bg-red-50'
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              Stock Bas ({lowStockCount})
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
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

      {/* ── Fabric Cards Grid ── */}
      {filteredFabrics.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EBE7DF] shadow-xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 font-serif">Aucun tissu ne correspond à votre recherche</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Essayez de modifier vos filtres de recherche ou ajoutez un nouveau coupon à l'inventaire.
          </p>
          <button
            onClick={() => { setSearch(''); setCategoryFilter('ALL'); setStockStatusFilter('ALL'); }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0F3B32] text-white text-xs font-bold hover:bg-[#0B2B26]"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFabrics.map((fabric) => {
            const isLowStock = fabric.availableMeters <= fabric.lowStockThreshold;
            const percentAvailable = Math.round((fabric.availableMeters / fabric.totalMeters) * 100);

            return (
              <div
                key={fabric.id}
                className={cn(
                  "bg-white rounded-2xl border transition-all duration-200 overflow-hidden hover:shadow-md flex flex-col justify-between group",
                  isLowStock ? "border-amber-300/80" : "border-[#EBE7DF]"
                )}
              >
                {/* Card Top: Visual Swatch & Info */}
                <div className="p-5">
                  {/* Swatch Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Color Circle */}
                      <div
                        className="w-10 h-10 rounded-2xl shadow-inner border-2 border-white flex-shrink-0 flex items-center justify-center relative"
                        style={{ backgroundColor: fabric.colorHex }}
                      >
                        <Sparkles className="w-4 h-4 text-white/70 drop-shadow-xs" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {fabric.category} • {fabric.origin}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 font-serif leading-snug group-hover:text-[#0F3B32] transition-colors">
                          {fabric.name}
                        </h3>
                      </div>
                    </div>

                    {isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Stock bas
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        En stock
                      </span>
                    )}
                  </div>

                  {/* Attributes Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-[#FBF9F5] p-3 rounded-xl border border-[#EBE7DF] mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Teinte & Motif :</span>
                      <span className="font-bold text-slate-800 text-right">{fabric.colorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Aspect :</span>
                      <span className="text-slate-700 text-right truncate max-w-[170px]">{fabric.pattern}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Fournisseur :</span>
                      <span className="text-slate-700 text-right">{fabric.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Emplacement :</span>
                      <span className="text-slate-700 font-mono text-[11px]">{fabric.locationShelf}</span>
                    </div>
                  </div>

                  {/* Stock Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-700">
                        Disponible : <span className="text-slate-900 font-black text-sm">{fabric.availableMeters} m</span>
                      </span>
                      <span className="text-slate-500 font-normal">
                        Réservé : <strong className="text-amber-700 font-bold">{fabric.reservedMeters} m</strong> / {fabric.totalMeters} m
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#EBE7DF] h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isLowStock ? "bg-red-500" : "bg-[#0F3B32]"
                        )}
                        style={{ width: `${percentAvailable}%` }}
                      />
                      <div
                        className="h-full bg-amber-400 opacity-60"
                        style={{ width: `${100 - percentAvailable}%` }}
                      />
                    </div>
                  </div>

                  {/* Assigned Orders Tags */}
                  {fabric.assignedOrders && fabric.assignedOrders.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#EBE7DF]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Commandes affectées ({fabric.assignedOrders.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {fabric.assignedOrders.map((ord) => (
                          <span
                            key={ord.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-900"
                          >
                            <ShoppingBag className="w-2.5 h-2.5" />
                            {ord.customerName} ({ord.meters}m)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Price & Quick Action */}
                <div className="px-5 py-3.5 bg-[#FBF9F5] border-t border-[#EBE7DF] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">Prix au mètre</span>
                    <span className="text-sm font-black text-[#0F3B32] font-serif">
                      {formatCurrency(fabric.pricePerMeter)}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedFabric(fabric)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#EBE7DF] text-xs font-bold text-slate-800 hover:bg-[#0F3B32] hover:text-white hover:border-[#0F3B32] transition-all shadow-xs"
                  >
                    Détails & Ajuster
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Nouveau Tissu / Rouleau ── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EBE7DF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE7DF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-serif">Nouveau Coupon / Rouleau</h3>
                  <p className="text-xs text-slate-500">Ajouter une référence au stock de l'atelier</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFabric} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du tissu & Marque *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bazin Riche Getzner Imperial..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#0F3B32]/20 focus:border-[#0F3B32] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as FabricItem['category'] })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                  >
                    <option value="BAZIN">Bazin Riche</option>
                    <option value="WAX">Wax Hollandais</option>
                    <option value="SOIE">Soie & Mousseline</option>
                    <option value="LIN">Lin Brut</option>
                    <option value="BRODERIE">Broderie & Dentelle</option>
                    <option value="CREPE">Crêpe Georgette</option>
                    <option value="VELOURS">Velours</option>
                    <option value="AUTRE">Autre matière</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.colorHex}
                      onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-[#EBE7DF] p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Nom (ex: Bleu Roi)"
                      value={formData.colorName}
                      onChange={(e) => setFormData({ ...formData, colorName: e.target.value })}
                      className="flex-1 px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Métrage Total (m) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.totalMeters}
                    onChange={(e) => setFormData({ ...formData, totalMeters: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prix au mètre (FCFA)</label>
                  <input
                    type="number"
                    step="500"
                    value={formData.pricePerMeter}
                    onChange={(e) => setFormData({ ...formData, pricePerMeter: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motif / Aspect</label>
                  <input
                    type="text"
                    placeholder="Ex: Damassé, Uni, Floral..."
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emplacement Atelier</label>
                  <input
                    type="text"
                    placeholder="Ex: Rayon A, Étagère 2..."
                    value={formData.locationShelf}
                    onChange={(e) => setFormData({ ...formData, locationShelf: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur & Provenance</label>
                <input
                  type="text"
                  placeholder="Ex: Maison du Bazin Sandaga (Autriche)"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-medium text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes d'entretien / Particularités</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Dégorger avant lavage, repassage doux..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EBE7DF]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EBE7DF] text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs font-bold hover:bg-[#0B2B26] shadow-md shadow-[#0F3B32]/10"
                >
                  Enregistrer dans le stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Détail & Ajustement de Métrage ── */}
      {selectedFabric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE7DF]">
            <div className="flex items-start justify-between pb-3 border-b border-[#EBE7DF]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl shadow-xs border border-slate-200"
                  style={{ backgroundColor: selectedFabric.colorHex }}
                />
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-serif">{selectedFabric.name}</h3>
                  <p className="text-xs text-slate-500">{selectedFabric.colorName} • {selectedFabric.locationShelf}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFabric(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-[#FBF9F5] rounded-xl border border-[#EBE7DF] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Métrage disponible :</span>
                  <span className="font-black text-slate-900">{selectedFabric.availableMeters} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Métrage réservé :</span>
                  <span className="font-black text-amber-700">{selectedFabric.reservedMeters} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valeur totale stock :</span>
                  <span className="font-black text-[#0F3B32]">
                    {formatCurrency(selectedFabric.availableMeters * selectedFabric.pricePerMeter)}
                  </span>
                </div>
              </div>

              {/* Adjust buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Ajustement rapide du stock</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      if (selectedFabric.availableMeters >= 1) {
                        const updated = fabrics.map((f) =>
                          f.id === selectedFabric.id
                            ? { ...f, availableMeters: f.availableMeters - 1 }
                            : f
                        );
                        setFabrics(updated);
                        setSelectedFabric({ ...selectedFabric, availableMeters: selectedFabric.availableMeters - 1 });
                      }
                    }}
                    className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
                  >
                    - 1 mètre
                  </button>
                  <button
                    onClick={() => {
                      const updated = fabrics.map((f) =>
                        f.id === selectedFabric.id
                          ? { ...f, availableMeters: f.availableMeters + 1 }
                          : f
                      );
                      setFabrics(updated);
                      setSelectedFabric({ ...selectedFabric, availableMeters: selectedFabric.availableMeters + 1 });
                    }}
                    className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
                  >
                    + 1 mètre
                  </button>
                  <button
                    onClick={() => {
                      const updated = fabrics.map((f) =>
                        f.id === selectedFabric.id
                          ? { ...f, availableMeters: f.availableMeters + 5 }
                          : f
                      );
                      setFabrics(updated);
                      setSelectedFabric({ ...selectedFabric, availableMeters: selectedFabric.availableMeters + 5 });
                    }}
                    className="px-2 py-2 rounded-xl bg-[#0F3B32]/10 hover:bg-[#0F3B32]/20 text-xs font-bold text-[#0F3B32]"
                  >
                    + 5 mètres
                  </button>
                </div>
              </div>

              {selectedFabric.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong className="font-bold block mb-0.5">Notes atelier :</strong>
                  {selectedFabric.notes}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EBE7DF] flex justify-end">
              <button
                onClick={() => setSelectedFabric(null)}
                className="px-4 py-2 rounded-xl bg-[#0F3B32] text-white text-xs font-bold hover:bg-[#0B2B26]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
