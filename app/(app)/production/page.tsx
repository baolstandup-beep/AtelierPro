'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { PageHeader, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toaster';
import { OrderStatusBadge } from '@/components/ui/tabs';
import { formatDate, isDueDateLate, KANBAN_COLUMNS, ORDER_STATUS_LABELS, formatCurrency } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import type { OrderStatus, Order } from '@/lib/types';

export default function ProductionPage() {
  const router = useRouter();
  const { orders, payments, changeOrderStatus, archiveOrder, currentWorkshop } = useAppStore();
  const { success } = useToast();
  const ws = currentWorkshop;

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const activeOrders = useMemo(() =>
    orders.filter((o) => !o.deleted_at && o.status !== 'CANCELLED'),
    [orders]
  );

  const columns = KANBAN_COLUMNS.map((col) => ({
    ...col,
    orders: activeOrders
      .filter((o) => o.status === col.status)
      .map((o) => {
        const isLate = isDueDateLate(o.due_date, o.status);
        const paid = payments.filter(p => p.order_id === o.id && p.status === 'CONFIRMED').reduce((s, p) => s + p.amount, 0);
        const balance = Math.max(0, o.total_amount - paid);
        return { ...o, is_late: isLate, paid_amount: paid, balance };
      })
      .sort((a, b) => {
        if (a.is_late && !b.is_late) return -1;
        if (!a.is_late && b.is_late) return 1;
        return 0;
      }),
  }));

  const PRIORITY_DOT: Record<string, string> = {
    LOW: '🔵',
    NORMAL: '',
    HIGH: '🟠',
    URGENT: '🔴',
  };

  function getNextStatus(status: OrderStatus): OrderStatus | null {
    const flow: OrderStatus[] = ['NEW', 'MEASURED', 'CUTTING', 'SEWING', 'FINISHING', 'READY', 'DELIVERED'];
    const idx = flow.indexOf(status);
    if (idx >= 0 && idx < flow.length - 1) return flow[idx + 1];
    return null;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production"
        subtitle={`${activeOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length} commandes en cours`}
      />

      {/* Summary row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {columns.filter(c => c.orders.length > 0).map((col) => (
          <div key={col.status} className="flex-shrink-0 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-center min-w-[80px]">
            <p className="text-lg font-bold text-gray-900">{col.orders.length}</p>
            <p className="text-[10px] text-gray-500">{col.label}</p>
          </div>
        ))}
      </div>

      {/* Kanban columns — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3 min-w-max pb-4">
          {columns.map((col) => (
            <div key={col.status} className="w-64 flex-shrink-0">
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.label}</h3>
                  {col.orders.length > 0 && (
                    <span className="bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {col.orders.length}
                    </span>
                  )}
                </div>
                {col.orders.some(o => o.is_late) && (
                  <span className="text-[10px] text-red-500 font-bold">⚠</span>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[120px]">
                {col.orders.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
                    <p className="text-xs text-gray-300">Aucune commande</p>
                  </div>
                ) : (
                  col.orders.map((order) => {
                    const nextStatus = getNextStatus(order.status);
                    return (
                      <div
                        key={order.id}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                          order.is_late ? 'border-red-200' : 'border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="w-full text-left p-3"
                        >
                          {order.is_late && (
                            <div className="text-[10px] text-red-600 font-bold mb-1">⚠ EN RETARD</div>
                          )}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1 min-w-0">
                              {PRIORITY_DOT[order.priority] && (
                                <span className="text-[10px] flex-shrink-0">{PRIORITY_DOT[order.priority]}</span>
                              )}
                              <p className="text-xs font-bold text-gray-900 truncate">{order.order_number}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(order);
                              }}
                              title="Supprimer cette commande de la production"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-sm font-medium text-gray-800 truncate">{order.customer?.full_name}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {order.items?.map(i => i.name).join(', ')}
                          </p>

                          <div className="mt-2 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500">Total :</span>
                              <span className="font-bold text-slate-700">{formatCurrency(order.total_amount, ws?.currency_symbol)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500">Acompte :</span>
                              <span className="text-green-600 font-semibold">{formatCurrency(order.paid_amount, ws?.currency_symbol)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] border-t border-slate-200 pt-1 mt-1">
                              <span className="text-slate-500 font-semibold">Reste :</span>
                              <span className="text-orange-600 font-bold">{formatCurrency(order.balance, ws?.currency_symbol)}</span>
                            </div>
                          </div>

                          {order.assignee_name && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 py-1 px-2 rounded-md border border-slate-100">
                              <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center shrink-0">👤</span>
                              <span className="truncate">Couturier : <span className="font-semibold text-slate-700">{order.assignee_name}</span></span>
                            </div>
                          )}

                          {order.due_date && (
                            <p className={`text-[10px] mt-2 font-medium ${order.is_late ? 'text-red-500' : 'text-gray-400'}`}>
                              📅 {formatDate(order.due_date)}
                            </p>
                          )}
                        </button>

                        {/* Quick status advance */}
                        {nextStatus && (
                          <div className="border-t border-gray-100 px-3 py-2">
                            <button
                              onClick={() => {
                                changeOrderStatus(order.id, nextStatus);
                              }}
                              className="w-full text-xs text-green-700 font-medium text-center hover:text-green-800 active:scale-95 transition-transform"
                            >
                              → {ORDER_STATUS_LABELS[nextStatus]}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {activeOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">✂️</div>
          <p className="text-sm font-medium text-gray-900 mb-1">Aucune commande en production</p>
          <p className="text-xs text-gray-500">Les commandes créées apparaîtront ici.</p>
        </div>
      )}

      {/* ─── Delete / Archive Confirmation Modal ─── */}
      <Modal
        open={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        title="Supprimer de la production"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer la commande{' '}
            <strong>« {orderToDelete?.order_number} »</strong>
            {orderToDelete?.customer?.full_name ? ` (${orderToDelete.customer.full_name})` : ''} de la production ?
          </p>
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            La commande sera archivée et retirée du flux Kanban de l&apos;atelier.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOrderToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                if (orderToDelete) {
                  archiveOrder(orderToDelete.id);
                  setOrderToDelete(null);
                  success('Commande supprimée', 'La commande a été retirée du tableau de production.');
                }
              }}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
