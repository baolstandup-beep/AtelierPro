'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingBag,
  Users,
  CreditCard,
  AlertTriangle,
  Banknote,
  ArrowRight,
  Package,
  Ruler,
  Scissors,
  Sparkles,
  ChevronRight,
  Calendar,
  Layers,
  UserPlus,
  Plus,
} from 'lucide-react';

export default function AtelierProLovableDashboardPage() {
  const router = useRouter();
  const { getDashboardStats, orders, customers, measurementProfiles, currentWorkshop } = useAppStore();
  const stats = getDashboardStats();
  const ws = currentWorkshop;

  // Active orders count
  const activeOrdersCount = orders.filter(
    (o) => !o.deleted_at && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  ).length;

  // Active upcoming orders (sorted by delivery date)
  const upcomingDeliveries = orders
    .filter((o) => !o.deleted_at && o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
    .sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return dateA - dateB;
    })
    .slice(0, 6);

  // Recouvrement calculation (% collected)
  const totalRevenue = stats.paymentsThisMonth + stats.balanceToRecover;
  const recoveryRate = totalRevenue > 0 ? Math.round((stats.paymentsThisMonth / totalRevenue) * 100) : 0;

  // Recent measurements taken
  const recentMeasurements = measurementProfiles.slice(0, 4);

  return (
    <div className="space-y-8 pb-12">
      
      {/* ─── 1. LOVABLE-INSPIRED HERO HEADER (VOTRE ATELIER MESURÉ AU MILLIMÈTRE) ─── */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0B2B26] via-[#0F3B32] to-[#071F1B] text-white p-6 sm:p-10 shadow-2xl border border-white/10">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-[#2E9D74]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-72 h-72 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#A3E635] text-xs font-mono font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bonjour, bon travail à l&apos;atelier</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-serif-luxury tracking-tight text-white leading-tight">
              Votre atelier, mesuré au millimètre.
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Mesures, délais et acomptes réunis au même endroit — plus de carnet perdu.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#0F3B32] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4 text-[#2E9D74]" />
              <span>Voir les commandes</span>
            </Link>

            <Link
              href="/measurements"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2E9D74] hover:bg-[#258562] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-[#2E9D74]/30 transition-all hover:scale-105"
            >
              <Ruler className="w-4 h-4" />
              <span>Carnet de mesures</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. ALERT: URGENT / LATE ORDERS NOTICE ─── */}
      {stats.ordersLate > 0 && (
        <button
          onClick={() => router.push('/orders?filter=late')}
          className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-left hover:bg-amber-500/15 transition-all shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                {stats.ordersLate} commande{stats.ordersLate > 1 ? 's' : ''} nécessitant une attention urgente
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-400">Cliquez pour voir les commandes proches ou ayant dépassé la date d&apos;essayage.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-800 dark:text-amber-300 flex-shrink-0" />
        </button>
      )}

      {/* ─── 3. THE 4 PRIMARY METRIC CARDS (EXACT LOVABLE CARDS) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1 : Commandes en cours */}
        <Link
          href="/orders"
          className="bg-white dark:bg-[#121A16] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#2E9D74]/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Commandes en cours</span>
            <div className="w-8 h-8 rounded-xl bg-[#EBF7F1] dark:bg-[#0F3B32] text-[#2E9D74] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl sm:text-4xl font-black text-[#111827] dark:text-white font-mono">
              {activeOrdersCount}
            </p>
            <span className="text-[11px] font-bold text-[#2E9D74] mt-1 inline-flex items-center gap-1 group-hover:underline">
              <span>Voir la production</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* KPI 2 : Clients suivis */}
        <Link
          href="/customers"
          className="bg-white dark:bg-[#121A16] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#2E9D74]/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Clients suivis</span>
            <div className="w-8 h-8 rounded-xl bg-[#EBF7F1] dark:bg-[#0F3B32] text-[#2E9D74] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl sm:text-4xl font-black text-[#111827] dark:text-white font-mono">
              {customers.length || stats.totalCustomers}
            </p>
            <span className="text-[11px] font-bold text-[#2E9D74] mt-1 inline-flex items-center gap-1 group-hover:underline">
              <span>Carnet de clients</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* KPI 3 : Encaissé */}
        <Link
          href="/payments"
          className="bg-white dark:bg-[#121A16] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#2E9D74]/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Encaissé (Ce mois)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[#16A34A] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-[#0F3B32] dark:text-[#A3E635] font-mono">
              {formatCurrency(stats.paymentsThisMonth, ws?.currency_symbol)}
            </p>
            <span className="text-[11px] font-bold text-[#16A34A] mt-1 inline-flex items-center gap-1">
              ✓ Wave, OM & Espèces
            </span>
          </div>
        </Link>

        {/* KPI 4 : Reste à percevoir */}
        <Link
          href="/payments"
          className="bg-white dark:bg-[#121A16] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#D97706]/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Reste à percevoir</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D97706] flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-[#D97706] font-mono">
              {formatCurrency(stats.balanceToRecover, ws?.currency_symbol)}
            </p>
            <span className="text-[11px] font-bold text-[#D97706] mt-1 inline-flex items-center gap-1 group-hover:underline">
              <span>Soldes à la livraison</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* ─── 4. SPLIT SECTIONS: PROCHAINES LIVRAISONS & RECOUVREMENT (LOVABLE WIDGETS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Prochaines Livraisons */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-serif-luxury text-[#111827] dark:text-white">
                Prochaines livraisons & Essayages
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Commandes planifiées pour cette semaine
              </p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-bold text-[#2E9D74] hover:underline inline-flex items-center gap-1"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingDeliveries.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#121A16] border border-slate-200 dark:border-white/10 text-center space-y-3">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Aucune commande en attente</p>
                <Link
                  href="/orders/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E9D74] text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enregistrer une commande</span>
                </Link>
              </div>
            ) : (
              upcomingDeliveries.map((order) => {
                const customer = customers.find((c) => c.id === order.customer_id);
                const itemName = order.items?.[0]?.name || 'Tenue sur-mesure';

                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121A16] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#2E9D74]/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#EBF7F1] dark:bg-[#0F3B32] text-[#0F3B32] dark:text-[#A3E635] flex items-center justify-center font-bold text-sm shrink-0">
                        <Scissors className="w-5 h-5 -rotate-45" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#111827] dark:text-white">
                            {customer?.full_name || 'Client Atelier'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'READY'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {order.status === 'READY' ? 'Prêt' : 'En Atelier'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {itemName} • Réf: {order.order_number || order.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-[#2E9D74]" />
                          <span>{order.due_date ? formatDate(order.due_date) : 'Non planifié'}</span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-[#D97706] mt-0.5">
                          Solde: {formatCurrency(order.balance || 0, ws?.currency_symbol)}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Recouvrement (Lovable Rate Widget) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-serif-luxury text-[#111827] dark:text-white">
              Recouvrement
            </h2>
            <span className="text-xs font-mono font-bold text-[#16A34A]">{recoveryRate}% encaissé</span>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#121A16] border border-slate-200 dark:border-white/10 shadow-sm space-y-6 text-left">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Part des montants déjà encaissés.</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black font-mono text-[#0F3B32] dark:text-[#A3E635]">{recoveryRate}%</span>
                <span className="text-xs font-semibold text-slate-400">du chiffre d&apos;affaires</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2E9D74] to-[#A3E635] rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, recoveryRate))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E9D74]" />
                  Total Encaissé
                </span>
                <span className="font-bold text-[#0F3B32] dark:text-white font-mono">
                  {formatCurrency(stats.paymentsThisMonth, ws?.currency_symbol)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  Reste à Percevoir
                </span>
                <span className="font-bold text-[#D97706] font-mono">
                  {formatCurrency(stats.balanceToRecover, ws?.currency_symbol)}
                </span>
              </div>
            </div>

            <Link
              href="/payments"
              className="w-full py-3 rounded-2xl bg-[#EBF7F1] dark:bg-[#0F3B32] hover:bg-[#2E9D74] hover:text-white text-[#0F3B32] dark:text-[#A3E635] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <span>Gérer les Paiements & Acomptes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* ─── 5. FAST SHORTCUTS & MEASUREMENT PROFILES ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Measurements Taken */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121A16] border border-slate-200 dark:border-white/10 shadow-sm space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#2E9D74]" />
              <span>Dernières Mesures Enregistrées</span>
            </h3>
            <Link href="/measurements/new" className="text-xs font-bold text-[#2E9D74] hover:underline">
              + Ajouter
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentMeasurements.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucune mesure encore enregistrée.</p>
            ) : (
              recentMeasurements.map((m) => {
                const customer = customers.find((c) => c.id === m.customer_id);
                return (
                  <div
                    key={m.id}
                    onClick={() => router.push(`/customers/${m.customer_id}`)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#111827] dark:text-white">
                        {customer?.full_name || m.label || 'Profil Mesure'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {m.fabric_type || 'Sur-mesure'} • {formatDate(m.taken_at || m.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Workshop Actions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#121A16] border border-slate-200 dark:border-white/10 shadow-sm space-y-4 text-left">
          <h3 className="text-sm font-bold text-[#111827] dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>Actions Rapides Atelier</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/orders/new"
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-[#2E9D74] hover:bg-[#EBF7F1]/30 transition-all text-left group"
            >
              <ShoppingBag className="w-5 h-5 text-[#2E9D74] mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-[#111827] dark:text-white">Nouvelle Commande</p>
              <p className="text-[10px] text-slate-400">Modèle, tissu & acompte</p>
            </Link>

            <Link
              href="/measurements/new"
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-[#2E9D74] hover:bg-[#EBF7F1]/30 transition-all text-left group"
            >
              <Ruler className="w-5 h-5 text-[#2E9D74] mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-[#111827] dark:text-white">Prendre Mesures</p>
              <p className="text-[10px] text-slate-400">Gabarits Boubou, Kaftan</p>
            </Link>

            <Link
              href="/customers/new"
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-[#2E9D74] hover:bg-[#EBF7F1]/30 transition-all text-left group"
            >
              <UserPlus className="w-5 h-5 text-[#2E9D74] mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-[#111827] dark:text-white">Nouveau Client</p>
              <p className="text-[10px] text-slate-400">Fiche & contact WhatsApp</p>
            </Link>

            <Link
              href="/production"
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-[#2E9D74] hover:bg-[#EBF7F1]/30 transition-all text-left group"
            >
              <Layers className="w-5 h-5 text-[#D97706] mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-[#111827] dark:text-white">Kanban Atelier</p>
              <p className="text-[10px] text-slate-400">Suivi coupe & finitions</p>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
