'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Banknote,
  DollarSign,
  Download,
  AlertTriangle,
  Award,
  Scissors,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  format,
  isToday,
  isThisWeek,
  isThisMonth,
  isThisYear,
  parseISO,
} from 'date-fns';

export default function ReportsPage() {
  const { orders, payments, expenses, customers, currentWorkshop } = useAppStore();

  const sym = currentWorkshop?.currency_symbol || 'FCFA';

  // 1. Chiffres d'affaires
  const confirmedPayments = payments.filter((p) => p.status === 'CONFIRMED');

  let caToday = 0;
  let caWeek = 0;
  let caMonth = 0;
  let caYear = 0;

  confirmedPayments.forEach((p) => {
    try {
      const d = parseISO(p.payment_date);
      if (isToday(d)) caToday += p.amount;
      if (isThisWeek(d, { weekStartsOn: 1 })) caWeek += p.amount;
      if (isThisMonth(d)) caMonth += p.amount;
      if (isThisYear(d)) caYear += p.amount;
    } catch {
      // ignore
    }
  });

  // 2. Commandes & Panier Moyen
  const activeOrders = orders.filter((o) => !o.deleted_at && o.status !== 'CANCELLED');
  const totalOrdersCount = activeOrders.length;
  const totalOrdersVolume = activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const averageTicket = totalOrdersCount > 0 ? Math.round(totalOrdersVolume / totalOrdersCount) : 0;

  // 3. Reste à encaisser (créances clients)
  const totalBalanceToRecover = activeOrders.reduce((sum, o) => sum + (o.balance || 0), 0);

  // 4. Dépenses totales & Résultat Net estimé
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netEstimatedResult = caYear - totalExpenses;

  // 5. Commandes en retard
  const lateOrders = activeOrders.filter((o) => {
    if (!o.due_date || o.status === 'DELIVERED') return false;
    try {
      return new Date(o.due_date) < new Date();
    } catch {
      return false;
    }
  });

  // 6. Clients les plus actifs
  const customerSpending: Record<string, { name: string; count: number; spent: number }> = {};
  activeOrders.forEach((o) => {
    const custId = o.customer_id;
    const custName = o.customer?.full_name || 'Client';
    if (!customerSpending[custId]) {
      customerSpending[custId] = { name: custName, count: 0, spent: 0 };
    }
    customerSpending[custId].count += 1;
    customerSpending[custId].spent += o.total_amount || 0;
  });

  const topCustomers = Object.values(customerSpending)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // 7. Types de vêtements les plus commandés
  const garmentCounts: Record<string, number> = {};
  activeOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const type = item.garment_type || item.name || 'AUTRE';
      garmentCounts[type] = (garmentCounts[type] || 0) + item.quantity;
    });
  });

  const topGarments = Object.entries(garmentCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Export CSV
  function handleExportCSV() {
    const rows = [
      ['Rapport d activite AtelierPro', currentWorkshop?.name || 'Atelier'],
      ['Date generation', format(new Date(), 'yyyy-MM-dd HH:mm')],
      [''],
      ['Indicateur', 'Valeur'],
      ['CA Aujourd hui', `${caToday} ${sym}`],
      ['CA Cette semaine', `${caWeek} ${sym}`],
      ['CA Ce mois', `${caMonth} ${sym}`],
      ['CA Cette annee', `${caYear} ${sym}`],
      ['Nombre total de commandes', totalOrdersCount.toString()],
      ['Ticket moyen', `${averageTicket} ${sym}`],
      ['Reste a recouvrer (Dettes)', `${totalBalanceToRecover} ${sym}`],
      ['Total des depenses', `${totalExpenses} ${sym}`],
      ['Resultat net estime', `${netEstimatedResult} ${sym}`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapport_atelierpro_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-700" />
            Rapports & Statistiques
          </h1>
          <p className="text-sm text-gray-500">
            Performance financière, rentabilité, analyse des ventes et clients phares
          </p>
        </div>

        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleExportCSV}
          className="w-full sm:w-auto"
        >
          Exporter en CSV
        </Button>
      </div>

      {/* Grille des Chiffres d'Affaires */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">CA Aujourd&apos;hui</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(caToday, sym)}
          </p>
          <p className="text-[11px] text-green-700 font-semibold mt-1">Encaissé ce jour</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">CA Semaine</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(caWeek, sym)}
          </p>
          <p className="text-[11px] text-green-700 font-semibold mt-1">7 derniers jours</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">CA Mois en cours</p>
          <p className="text-xl font-bold text-green-700 mt-1">
            {formatCurrency(caMonth, sym)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Mois de {format(new Date(), 'MMMM')}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">CA Annuel</p>
          <p className="text-xl font-bold text-purple-700 mt-1">
            {formatCurrency(caYear, sym)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Exercice {format(new Date(), 'yyyy')}</p>
        </div>
      </div>

      {/* Synthèse globale & Résultat Net */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-xs font-semibold mb-1">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Commandes & Panier moyen
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrdersCount} commandes</p>
          <p className="text-xs text-gray-500 mt-1">
            Ticket moyen : <span className="font-bold text-gray-900">{formatCurrency(averageTicket, sym)}</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
            <Banknote className="w-4 h-4" />
            Créances & Reste à récupérer
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {formatCurrency(totalBalanceToRecover, sym)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Dettes clients à relancer</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${netEstimatedResult >= 0 ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
          <div className="flex items-center gap-2 text-xs font-semibold mb-1 text-gray-700">
            <TrendingUp className="w-4 h-4 text-green-700" />
            Résultat Net Estimé
          </div>
          <p className={`text-2xl font-bold ${netEstimatedResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(netEstimatedResult, sym)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Revenus ({formatCurrency(caYear, sym)}) - Charges ({formatCurrency(totalExpenses, sym)})
          </p>
        </div>
      </div>

      {/* Deux colonnes : Clients Phares & Modèles les plus demandés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Clients */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Clients les plus actifs
            </h3>
            <span className="text-xs text-gray-400">Par montant dépensé</span>
          </div>
          {topCustomers.length === 0 ? (
            <p className="p-4 text-xs text-gray-500">Aucune commande pour classer les clients.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topCustomers.map((c, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-[10px]">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    <span className="text-gray-400">({c.count} commande{c.count > 1 ? 's' : ''})</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(c.spent, sym)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Vêtements */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-green-700" />
              Vêtements les plus confectionnés
            </h3>
            <span className="text-xs text-gray-400">Par quantité</span>
          </div>
          {topGarments.length === 0 ? (
            <p className="p-4 text-xs text-gray-500">Aucun article confectionné pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topGarments.map(([name, qty], i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-900">{name}</span>
                  <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    {qty} confection{qty > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Alerte sur les retards */}
      {lateOrders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-red-900">
              {lateOrders.length} commande{lateOrders.length > 1 ? 's' : ''} en retard identifiée{lateOrders.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Ces commandes n&apos;ont pas encore été livrées et ont dépassé leur date d&apos;échéance promise.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lateOrders.map((o) => (
                <span
                  key={o.id}
                  className="text-xs font-semibold bg-white border border-red-300 text-red-800 px-2.5 py-1 rounded-lg shadow-2xs"
                >
                  {o.order_number} ({o.customer?.full_name}) · Échéance {formatDate(o.due_date)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
