'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, EmptyState, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar, Tabs, OrderStatusBadge } from '@/components/ui/tabs';
import { formatCurrency, formatDate, isDueDateLate, ORDER_STATUS_LABELS } from '@/lib/utils';
import { Plus, ShoppingBag, AlertTriangle, ChevronRight } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';

const STATUS_TABS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'READY', label: 'Prêts' },
  { value: 'DELIVERED', label: 'Livrés' },
  { value: 'late', label: '⚠ Retard' },
];

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orders, currentWorkshop, payments } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'late' ? 'late' : 'all');
  const ws = currentWorkshop;

  const enrichedOrders = useMemo(() => {
    return orders
      .filter((o) => !o.deleted_at && o.status !== 'CANCELLED')
      .map((o) => {
        const paid = payments.filter(p => p.order_id === o.id && p.status === 'CONFIRMED').reduce((s, p) => s + p.amount, 0);
        return {
          ...o,
          paid_amount: paid,
          balance: Math.max(0, o.total_amount - paid),
          is_late: isDueDateLate(o.due_date, o.status),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, payments]);

  const filtered = useMemo(() => {
    let list = enrichedOrders;

    if (statusFilter === 'active') {
      list = list.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
    } else if (statusFilter === 'late') {
      list = list.filter((o) => o.is_late);
    } else if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer?.full_name.toLowerCase().includes(q) ||
        o.customer?.phone.includes(q)
      );
    }

    return list;
  }, [enrichedOrders, statusFilter, search]);

  const lateCount = enrichedOrders.filter((o) => o.is_late).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commandes"
        subtitle={`${enrichedOrders.filter(o => o.status !== 'DELIVERED').length} en cours`}
        action={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/orders/new')}
            size="sm"
          >
            <span className="hidden sm:inline">Nouvelle commande</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Numéro, client, téléphone…"
      />

      <Tabs
        tabs={STATUS_TABS.map(t => ({
          ...t,
          count: t.value === 'late' ? lateCount : undefined,
        }))}
        value={statusFilter}
        onChange={setStatusFilter}
        variant="pills"
      />

      {filtered.length === 0 && enrichedOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Aucune commande encore"
          description="Créez votre première commande en sélectionnant un client."
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => router.push('/orders/new')}>
              Créer une commande
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Aucun résultat"
          description="Essayez d'autres critères de recherche."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <button key={order.id} onClick={() => router.push(`/orders/${order.id}`)} className="w-full text-left">
              <Card hover padding="sm">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                      <OrderStatusBadge status={order.status} isLate={order.is_late} size="sm" />
                      {order.priority === 'URGENT' && (
                        <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-bold">URGENT</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium truncate mt-0.5">
                      {order.customer?.full_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items?.map(i => i.name).join(', ')}
                      {order.due_date && (
                        <> · Livr. {formatDate(order.due_date)}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(order.total_amount, ws?.currency_symbol)}
                    </p>
                    {order.balance > 0 && (
                      <p className="text-xs text-orange-600 font-medium">
                        Reste: {formatCurrency(order.balance, ws?.currency_symbol)}
                      </p>
                    )}
                    {order.balance === 0 && (
                      <p className="text-xs text-green-600">✓ Soldé</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
