'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Card, SectionHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils';
import {
  ShoppingBag,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  UserPlus,
  Banknote,
  ArrowRight,
  Package,
  Timer,
  DollarSign,
  Ruler,
  Scissors,
  Sparkles,
  ChevronRight,
  Calendar,
} from 'lucide-react';

export default function LuxuryDashboardPage() {
  const router = useRouter();
  const { getDashboardStats, orders, customers, measurementProfiles, auditLogs, currentWorkshop } = useAppStore();
  const stats = getDashboardStats();
  const ws = currentWorkshop;

  // Recent orders (active, non-cancelled)
  const recentOrders = orders
    .filter((o) => !o.deleted_at && o.status !== 'CANCELLED')
    .slice(0, 5);

  // Late orders
  const lateOrders = orders.filter((o) =>
    !o.deleted_at && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' &&
    o.due_date && new Date(o.due_date) < new Date()
  );

  // Recent measurements taken
  const recentMeasurements = measurementProfiles.slice(0, 4);

  return (
    <div className="space-y-7 pb-10">
      {/* ─── 1. Atelier Hero Banner (Matching Luxury Reference) ─── */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0B2B26] via-[#0F3B32] to-[#081F1B] text-white p-6 sm:p-8 lg:p-10 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Atelier Actif • {ws?.city || 'Dakar'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-serif tracking-tight">
              {ws?.name || 'Mon Atelier de Couture'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/measurements/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#0F3B32] hover:bg-slate-100 font-bold text-xs shadow-lg transition-all hover:scale-105"
            >
              <Ruler className="w-4 h-4" />
              <span>Prendre Mesures</span>
            </Link>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Commande</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. Alert: Late Orders Notice ─── */}
      {stats.ordersLate > 0 && (
        <button
          onClick={() => router.push('/orders?filter=late')}
          className="w-full bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-left hover:bg-amber-100/70 transition-all shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                {stats.ordersLate} commande{stats.ordersLate > 1 ? 's' : ''} nécessitant une attention urgente
              </p>
              <p className="text-xs text-amber-800">Cliquez pour voir les commandes proches de la date limite.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-800 flex-shrink-0" />
        </button>
      )}

      {/* ─── 3. Major KPI Metrics (Luxury Cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 : Encaissements */}
        <div
          onClick={() => router.push('/payments')}
          className="bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paiements du mois</span>
            <div className="w-8 h-8 rounded-xl bg-[#E5EFEA] text-[#0F3B32] flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#0F3B32] font-mono mt-2">
            {formatCurrency(stats.paymentsThisMonth, ws?.currency_symbol)}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 inline-block">
            ✓ Total encaissé en caisse
          </span>
        </div>

        {/* Metric 2 : Reste à récupérer */}
        <div
          onClick={() => router.push('/payments')}
          className="bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reste à récupérer</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-2">
            {formatCurrency(stats.balanceToRecover, ws?.currency_symbol)}
          </p>
          <span className="text-[10px] text-amber-700 font-bold mt-1 inline-block">
            Acomptes & soldes à la livraison
          </span>
        </div>

        {/* Metric 3 : En production */}
        <div
          onClick={() => router.push('/production')}
          className="bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">En production</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-900 font-mono mt-2">
            {stats.ordersInProduction} tenues
          </p>
          <span className="text-[10px] text-blue-700 font-bold mt-1 inline-block">
            {stats.ordersReady} prêtes • {stats.ordersDueToday} à livrer auj.
          </span>
        </div>

        {/* Metric 4 : Total clients & Mesures */}
        <div
          onClick={() => router.push('/customers')}
          className="bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clients & Mesures</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-900 font-mono mt-2">
            {stats.totalCustomers} clients
          </p>
          <span className="text-[10px] text-purple-700 font-bold mt-1 inline-block">
            {measurementProfiles.length} fiches de mesures
          </span>
        </div>
      </div>

      {/* ─── 4. Quick Actions Pills ─── */}
      <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Actions rapides de l'atelier
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <Link
            href="/customers/new"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] text-slate-800 text-xs font-bold transition-all hover:shadow-xs active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Nouveau client</span>
          </Link>
          <Link
            href="/measurements/new"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] text-slate-800 text-xs font-bold transition-all hover:shadow-xs active:scale-95"
          >
            <Ruler className="w-4 h-4 text-amber-600" />
            <span>Prendre mesures</span>
          </Link>
          <Link
            href="/orders/new"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] text-slate-800 text-xs font-bold transition-all hover:shadow-xs active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-[#0F3B32]" />
            <span>Nouvelle commande</span>
          </Link>
          <Link
            href="/payments/new"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] text-slate-800 text-xs font-bold transition-all hover:shadow-xs active:scale-95"
          >
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>Encaisser paiement</span>
          </Link>
          <Link
            href="/expenses"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] text-slate-800 text-xs font-bold transition-all hover:shadow-xs active:scale-95"
          >
            <DollarSign className="w-4 h-4 text-red-600" />
            <span>Nouvelle dépense</span>
          </Link>
        </div>
      </div>

      {/* ─── 5. Grid: Recent Orders & Recent Measurements ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">Commandes Récentes</h2>
              <p className="text-xs text-slate-500">Suivi en direct des tenues en cours</p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-bold text-[#0F3B32] hover:underline flex items-center gap-1"
            >
              Voir tout ({orders.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucune commande enregistrée. Créez votre première commande pour débuter.
            </div>
          ) : (
            <div className="divide-y divide-[#EBE7DF]">
              {recentOrders.map((order) => {
                const cust = customers.find((c) => c.id === order.customer_id);
                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-[#FBF9F5] px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {cust?.full_name || 'Client'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {order.order_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {order.items?.map((i) => i.name).join(', ') || 'Tenue sur-mesure'}
                        {order.due_date && ` • Livraison le ${formatDate(order.due_date)}`}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-900 font-mono">
                        {formatCurrency(order.total_amount, ws?.currency_symbol)}
                      </p>
                      {order.balance > 0 ? (
                        <span className="text-[10px] text-amber-700 font-semibold block">
                          Reste {formatCurrency(order.balance, ws?.currency_symbol)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold block">
                          Soldé ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Measurements Quick Panel (1 Col) */}
        <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">Carnet de Mesures</h2>
              <p className="text-xs text-slate-500">Dernières prises</p>
            </div>
            <Link
              href="/measurements"
              className="text-xs font-bold text-[#0F3B32] hover:underline flex items-center gap-1"
            >
              Ouvrir carnet <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMeasurements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucune mesure enregistrée.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentMeasurements.map((p) => {
                const cust = customers.find((c) => c.id === p.customer_id);
                return (
                  <Link
                    key={p.id}
                    href="/measurements"
                    className="block p-3 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-slate-900 truncate">
                        {cust?.full_name || 'Client'}
                      </strong>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EFEA] text-[#0F3B32] font-semibold">
                        {p.label || 'Standard'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{p.values?.length || 0} mensurations</span>
                      <span>{formatDate(p.taken_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
