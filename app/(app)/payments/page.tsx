'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { PageHeader, Card, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import { CreditCard, Plus } from 'lucide-react';

const PERIOD_TABS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'all', label: 'Tout' },
];

export default function PaymentsPage() {
  const router = useRouter();
  const { payments, orders, customers, currentWorkshop } = useAppStore();
  const [period, setPeriod] = useState('month');
  const ws = currentWorkshop;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
  const startOfWeek = new Date(now.getTime() - (now.getDay() * 86400000)).toISOString().split('T')[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = payments.filter((p) => p.status === 'CONFIRMED');
    if (period === 'today') list = list.filter((p) => p.payment_date >= startOfDay);
    else if (period === 'week') list = list.filter((p) => p.payment_date >= startOfWeek);
    else if (period === 'month') list = list.filter((p) => p.payment_date >= startOfMonth);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [payments, period, startOfDay, startOfWeek, startOfMonth]);

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  // Outstanding balances
  const activeOrders = orders.filter((o) => !o.deleted_at && o.status !== 'CANCELLED' && o.status !== 'DELIVERED');
  const totalBalanceToRecover = activeOrders.reduce((s, o) => {
    const paid = payments.filter(p => p.order_id === o.id && p.status === 'CONFIRMED').reduce((a, p) => a + p.amount, 0);
    return s + Math.max(0, o.total_amount - paid);
  }, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paiements"
        action={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => router.push('/payments/new')}>
            Nouveau
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Encaissé</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(total, ws?.currency_symbol)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {period === 'today' ? "Aujourd'hui" : period === 'week' ? 'Cette semaine' : period === 'month' ? 'Ce mois' : 'Total'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">À récupérer</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalBalanceToRecover, ws?.currency_symbol)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Sur {activeOrders.length} commandes actives</p>
        </Card>
      </div>

      <Tabs tabs={PERIOD_TABS} value={period} onChange={setPeriod} variant="pills" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="Aucun paiement"
          description="Aucun paiement enregistré pour cette période."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => {
            const order = orders.find((o) => o.id === payment.order_id);
            const customer = customers.find((c) => c.id === payment.customer_id);
            return (
              <button
                key={payment.id}
                onClick={() => order && router.push(`/orders/${order.id}`)}
                className="w-full text-left"
              >
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {payment.method === 'WAVE' ? (
                        <img src="/logos/wave.png" alt="Wave" className="w-9 h-9 object-cover rounded-xl shadow-xs" />
                      ) : payment.method === 'ORANGE_MONEY' ? (
                        <img src="/logos/orange-money.png" alt="Orange Money" className="w-9 h-9 object-cover rounded-xl shadow-xs bg-black" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
                          <CreditCard className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {customer?.full_name || 'Client inconnu'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order?.order_number} · {PAYMENT_METHOD_LABELS[payment.method]} · {formatDate(payment.payment_date)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-700 flex-shrink-0">
                      +{formatCurrency(payment.amount, ws?.currency_symbol)}
                    </p>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
