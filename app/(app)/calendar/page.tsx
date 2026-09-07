'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Filter,
} from 'lucide-react';
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  parseISO,
  isBefore,
  startOfToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';

type CalendarView = 'today' | 'week' | 'month' | 'all';

export default function CalendarPage() {
  const router = useRouter();
  const { orders, currentWorkshop } = useAppStore();
  const [view, setView] = useState<CalendarView>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready' | 'late' | 'delivered'>('all');

  const today = startOfToday();

  // Filtrer les commandes avec date d'échéance et non supprimées
  const validOrders = orders.filter((o) => !o.deleted_at && o.due_date);

  // Catégoriser par état temporel et de livraison
  const ordersWithStatus = validOrders.map((order) => {
    const dueDate = parseISO(order.due_date!);
    const isLate = isBefore(dueDate, today) && order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
    const isDueToday = isToday(dueDate);
    const isDueSoon = isTomorrow(dueDate) || (isThisWeek(dueDate, { weekStartsOn: 1 }) && !isBefore(dueDate, today));
    const isReady = order.status === 'READY';
    const isDelivered = order.status === 'DELIVERED';

    let colorBadge = 'bg-blue-50 text-blue-700 border-blue-200';
    let statusLabel = 'Planifié';

    if (isDelivered) {
      colorBadge = 'bg-gray-100 text-gray-700 border-gray-300';
      statusLabel = 'Livrée';
    } else if (isLate) {
      colorBadge = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
      statusLabel = 'En retard';
    } else if (isReady) {
      colorBadge = 'bg-green-100 text-green-800 border-green-300';
      statusLabel = 'Prête à livrer';
    } else if (isDueToday) {
      colorBadge = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      statusLabel = "Aujourd'hui !";
    } else if (isDueSoon) {
      colorBadge = 'bg-yellow-50 text-yellow-800 border-yellow-200';
      statusLabel = 'Cette semaine';
    }

    return {
      ...order,
      dueDate,
      isLate,
      isDueToday,
      isDueSoon,
      isReady,
      isDelivered,
      colorBadge,
      statusLabel,
    };
  });

  // Filtrage selon la vue
  const filteredOrders = ordersWithStatus
    .filter((order) => {
      if (view === 'today') return isToday(order.dueDate);
      if (view === 'week') return isThisWeek(order.dueDate, { weekStartsOn: 1 });
      if (view === 'month') return isThisMonth(order.dueDate);
      return true;
    })
    .filter((order) => {
      if (statusFilter === 'pending') return !order.isDelivered && !order.isReady && !order.isLate;
      if (statusFilter === 'ready') return order.isReady;
      if (statusFilter === 'late') return order.isLate;
      if (statusFilter === 'delivered') return order.isDelivered;
      return true;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Statistiques de calendrier
  const countToday = ordersWithStatus.filter((o) => o.isDueToday && !o.isDelivered).length;
  const countLate = ordersWithStatus.filter((o) => o.isLate).length;
  const countReady = ordersWithStatus.filter((o) => o.isReady).length;
  const countThisWeek = ordersWithStatus.filter((o) => isThisWeek(o.dueDate, { weekStartsOn: 1 }) && !o.isDelivered).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-green-700" />
            Calendrier des livraisons
          </h1>
          <p className="text-sm text-gray-500">
            Suivi des dates d&apos;échéance, alertes de retard et planification des livraisons
          </p>
        </div>
      </div>

      {/* Cartes métriques rapides de livraison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => { setView('today'); setStatusFilter('all'); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            view === 'today' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4" />
            Aujourd&apos;hui
          </div>
          <p className="text-2xl font-bold text-gray-900">{countToday}</p>
          <p className="text-[11px] text-gray-500">à livrer ce jour</p>
        </div>

        <div
          onClick={() => { setView('all'); setStatusFilter('late'); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'late' ? 'bg-red-50 border-red-300 ring-2 ring-red-400/20' : 'bg-white border-gray-200 hover:border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 text-red-700 text-xs font-semibold mb-1">
            <AlertTriangle className="w-4 h-4" />
            En retard
          </div>
          <p className="text-2xl font-bold text-red-600">{countLate}</p>
          <p className="text-[11px] text-gray-500">échéances dépassées</p>
        </div>

        <div
          onClick={() => { setView('all'); setStatusFilter('ready'); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'ready' ? 'bg-green-50 border-green-300 ring-2 ring-green-400/20' : 'bg-white border-gray-200 hover:border-green-200'
          }`}
        >
          <div className="flex items-center gap-2 text-green-700 text-xs font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Prêtes
          </div>
          <p className="text-2xl font-bold text-green-700">{countReady}</p>
          <p className="text-[11px] text-gray-500">à récupérer par client</p>
        </div>

        <div
          onClick={() => { setView('week'); setStatusFilter('all'); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            view === 'week' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20' : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold mb-1">
            <Package className="w-4 h-4" />
            Cette semaine
          </div>
          <p className="text-2xl font-bold text-gray-900">{countThisWeek}</p>
          <p className="text-[11px] text-gray-500">échéances de la semaine</p>
        </div>
      </div>

      {/* Barre d'onglets de période */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {(
            [
              { id: 'today', label: "Aujourd'hui" },
              { id: 'week', label: 'Cette semaine' },
              { id: 'month', label: 'Ce mois' },
              { id: 'all', label: 'Toutes' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === t.id ? 'bg-white text-green-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtre d'état */}
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gray-400 ml-2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white text-gray-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En cours</option>
            <option value="ready">Prêtes seulement</option>
            <option value="late">En retard seulement</option>
            <option value="delivered">Livrées</option>
          </select>
        </div>
      </div>

      {/* Légende du code couleur */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
        <span className="font-semibold text-gray-700">Légende :</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Retard
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Échéance aujourd&apos;hui
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Échéance proche (semaine)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Prête à livrer
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Livrée
        </span>
      </div>

      {/* Liste des commandes sous format chronologique */}
      {filteredOrders.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Aucune commande pour cette sélection</p>
            <p className="text-xs text-gray-500 mt-1">
              Modifiez la période ou le filtre de statut pour visualiser vos livraisons.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const customer = order.customer;
            return (
              <div
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className={`p-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  order.isLate
                    ? 'border-red-300 bg-red-50/20'
                    : order.isDueToday
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-gray-200'
                }`}
              >
                {/* Info principale */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      order.isLate
                        ? 'bg-red-100 text-red-700'
                        : order.isDueToday
                        ? 'bg-amber-100 text-amber-700'
                        : order.isReady
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {format(order.dueDate, 'dd', { locale: fr })}
                    <br />
                    <span className="text-[9px] uppercase">{format(order.dueDate, 'MMM', { locale: fr })}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {order.order_number}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${order.colorBadge}`}>
                        {order.statusLabel}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-700 mt-0.5">
                      Client : {customer?.full_name || 'Client non spécifié'} {customer?.phone && `(${customer.phone})`}
                    </p>

                    {order.items && order.items.length > 0 && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {order.items.map((it) => `${it.quantity}x ${it.name}`).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Statut de production et finances */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <OrderStatusBadge status={order.status} isLate={order.isLate} size="sm" />
                    <p className="text-xs text-gray-500 mt-1">
                      Échéance : {formatDate(order.due_date)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">Reste à payer</p>
                    <p className={`text-sm font-bold ${order.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatCurrency(order.balance, currentWorkshop?.currency_symbol)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
