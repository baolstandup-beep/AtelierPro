'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, Avatar, SectionHeader, EmptyState, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, OrderStatusBadge } from '@/components/ui/tabs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate, formatDateTime, isDueDateLate, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import {
  ArrowLeft, CreditCard, Clock, ChevronRight, Plus, Phone, Kanban, CheckCircle, Truck, XCircle, MessageCircle, Trash2
} from 'lucide-react';
import { PaymentMethodIcon } from '@/components/ui/payment-method-icon';
import type { OrderStatus, PaymentMethod } from '@/lib/types';
import { WhatsAppSenderModal } from '@/components/whatsapp/whatsapp-sender-modal';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'STRIPE', label: 'Carte bancaire (Stripe)' },
  { value: 'BANK', label: 'Virement bancaire' },
  { value: 'OTHER', label: 'Autre' },
];

const STATUS_TRANSITIONS: { from: OrderStatus[]; to: OrderStatus; label: string; icon: string }[] = [
  { from: ['NEW'], to: 'MEASURED', label: 'Confirmer mesures', icon: '📏' },
  { from: ['NEW', 'MEASURED'], to: 'CUTTING', label: 'Passer en coupe', icon: '✂️' },
  { from: ['CUTTING'], to: 'SEWING', label: 'Passer en couture', icon: '🪡' },
  { from: ['SEWING'], to: 'FINISHING', label: 'Passer en finition', icon: '✨' },
  { from: ['FINISHING'], to: 'READY', label: 'Marquer Prêt', icon: '✅' },
  { from: ['READY'], to: 'DELIVERED', label: 'Marquer Livré', icon: '📦' },
  { from: ['NEW', 'MEASURED', 'CUTTING', 'SEWING', 'FINISHING', 'READY'], to: 'ON_HOLD', label: 'Mettre en attente', icon: '⏸' },
  { from: ['ON_HOLD', 'NEW', 'MEASURED'], to: 'CANCELLED', label: 'Annuler', icon: '❌' },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getOrder, changeOrderStatus, archiveOrder, createPayment, currentWorkshop, payments, customers } = useAppStore();
  const { success, error: showError } = useToast();

  const order = getOrder(id);
  const ws = currentWorkshop;

  const [tab, setTab] = useState('detail');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH' as PaymentMethod,
    reference: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState('');

  const orderPayments = useMemo(() =>
    payments.filter((p) => p.order_id === id).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [payments, id]
  );

  if (!order || order.deleted_at) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>Retour</Button>
        <EmptyState title="Commande introuvable" />
      </div>
    );
  }

  const isLate = isDueDateLate(order.due_date, order.status);
  const paidAmount = orderPayments.filter(p => p.status === 'CONFIRMED').reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, order.total_amount - paidAmount);
  const isFullyPaid = balance === 0 && order.total_amount > 0;

  const availableTransitions = STATUS_TRANSITIONS.filter((t) =>
    t.from.includes(order.status)
  );

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amount) || amount <= 0) errs.amount = 'Montant invalide';
    if (amount > balance + 0.01) errs.amount = `Maximum: ${formatCurrency(balance, ws?.currency_symbol)}`;
    if (!paymentForm.payment_date) errs.payment_date = 'Date requise';
    if (Object.keys(errs).length) return setPaymentErrors(errs);

    setPaymentLoading(true);
    try {
      if (!order) throw new Error('Commande introuvable');
      createPayment({
        order_id: id,
        customer_id: order.customer_id,
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
        payment_date: paymentForm.payment_date,
      });
      success('Paiement enregistré !', formatCurrency(amount, ws?.currency_symbol));
      setPaymentForm({ amount: '', method: 'CASH', reference: '', notes: '', payment_date: new Date().toISOString().split('T')[0] });
      setPaymentOpen(false);
    } catch (err: unknown) {
      showError('Erreur', err instanceof Error ? err.message : 'Impossible d\'enregistrer le paiement.');
    } finally {
      setPaymentLoading(false);
    }
  }

  function handleStatusChange() {
    if (!selectedStatus) return;
    changeOrderStatus(id, selectedStatus, statusNotes.trim() || undefined);
    success('Statut mis à jour', ORDER_STATUS_LABELS[selectedStatus]);
    setStatusOpen(false);
    setSelectedStatus(null);
    setStatusNotes('');
  }

  const TABS = [
    { value: 'detail', label: 'Détail' },
    { value: 'payments', label: 'Paiements', count: orderPayments.length },
    { value: 'history', label: 'Historique' },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
          Commandes
        </Button>
      </div>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-base font-bold text-gray-900">{order.order_number}</h1>
              <OrderStatusBadge status={order.status} isLate={isLate} />
              {order.priority !== 'NORMAL' && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                  order.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {order.priority}
                </span>
              )}
            </div>
            <button
              onClick={() => router.push(`/customers/${order.customer_id}`)}
              className="flex items-center gap-2 mt-1 group"
            >
              <Avatar name={order.customer?.full_name || '?'} size="xs" />
              <span className="text-sm font-medium text-green-700 group-hover:underline">
                {order.customer?.full_name || 'Client inconnu'}
              </span>
            </button>
            {order.customer?.phone && (
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Phone className="h-3 w-3" />
                {order.customer.phone}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Supprimer
          </Button>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount, ws?.currency_symbol)}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-green-700">{formatCurrency(paidAmount, ws?.currency_symbol)}</p>
            <p className="text-[10px] text-gray-500">Payé</p>
          </div>
          <div className="text-center">
            <p className={`text-sm font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(balance, ws?.currency_symbol)}
            </p>
            <p className="text-[10px] text-gray-500">Reste</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {order.customer?.phone && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
              leftIcon={<MessageCircle className="h-3.5 w-3.5 fill-white" />}
              onClick={() => setWhatsappModalOpen(true)}
            >
              WhatsApp & Rappels
            </Button>
          )}
          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Kanban className="h-3.5 w-3.5" />}
              onClick={() => setStatusOpen(true)}
            >
              Changer statut
            </Button>
          )}
          {balance > 0 && order.status !== 'CANCELLED' && (
            <Button
              size="sm"
              leftIcon={<CreditCard className="h-3.5 w-3.5" />}
              onClick={() => setPaymentOpen(true)}
            >
              Encaisser
            </Button>
          )}
          {isFullyPaid && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Truck className="h-3.5 w-3.5" />}
              onClick={() => { changeOrderStatus(id, 'DELIVERED'); success('Commande livrée !'); }}
            >
              Marquer Livré
            </Button>
          )}
        </div>

        {/* Late warning */}
        {isLate && (
          <div className="mt-3 bg-red-50 rounded-lg p-2.5 text-xs text-red-700 font-medium">
            ⚠ Date de livraison dépassée — À traiter en priorité
          </div>
        )}

        {/* Due date info */}
        {order.due_date && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            Date de livraison prévue: <strong>{formatDate(order.due_date)}</strong>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs tabs={TABS} value={tab} onChange={setTab} variant="underline" />

      {/* Detail tab */}
      {tab === 'detail' && (
        <div className="space-y-3">
          {order.items?.map((item, i) => (
            <Card key={item.id} padding="sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                  ✂️
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {item.garment_type && <span className="text-xs text-gray-500">{item.garment_type.replace('_', ' ')}</span>}
                    {item.fabric && <span className="text-xs text-gray-500">Tissu: {item.fabric}</span>}
                    {item.color && <span className="text-xs text-gray-500">Couleur: {item.color}</span>}
                    <span className="text-xs text-gray-500">Qté: {item.quantity}</span>
                  </div>
                  {item.notes && <p className="text-xs text-gray-400 mt-1">{item.notes}</p>}
                </div>
                <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                  {formatCurrency(item.unit_price * item.quantity, ws?.currency_symbol)}
                </p>
              </div>
            </Card>
          ))}

          {order.notes && (
            <Card padding="sm">
              <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </Card>
          )}
        </div>
      )}

      {/* Payments tab */}
      {tab === 'payments' && (
        <div className="space-y-3">
          {balance > 0 && order.status !== 'CANCELLED' && (
            <Button fullWidth leftIcon={<Plus className="h-4 w-4" />} onClick={() => setPaymentOpen(true)}>
              Enregistrer un paiement
            </Button>
          )}
          {isFullyPaid && (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-green-800">Commande entièrement payée ✓</p>
            </div>
          )}
          {orderPayments.length === 0 ? (
            <EmptyState icon={<CreditCard className="h-5 w-5" />} title="Aucun paiement" description="Aucun paiement enregistré pour cette commande." />
          ) : (
            orderPayments.map((p) => (
              <Card key={p.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-4 w-4 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount, ws?.currency_symbol)}</p>
                    <p className="text-xs text-gray-500">{PAYMENT_METHOD_LABELS[p.method]} · {formatDate(p.payment_date)}</p>
                    {p.reference && <p className="text-xs text-gray-400">Réf: {p.reference}</p>}
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 flex-shrink-0">Confirmé</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <Card>
          {order.status_history?.length === 0 ? (
            <EmptyState icon={<Clock className="h-5 w-5" />} title="Aucun historique" />
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4 pl-10">
                {[...(order.status_history || [])].reverse().map((h) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-7 w-3 h-3 rounded-full bg-green-600 border-2 border-white mt-1" />
                    <p className="text-sm font-medium text-gray-900">
                      {h.old_status ? `${ORDER_STATUS_LABELS[h.old_status]} → ` : ''}
                      {ORDER_STATUS_LABELS[h.new_status]}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(h.changed_at)}</p>
                    {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Payment Modal */}
      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Enregistrer un paiement"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Annuler</Button>
            <Button fullWidth loading={paymentLoading} onClick={handlePayment as any}>
              Enregistrer le paiement
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-3 text-sm">
            <p className="text-orange-800">Reste à payer: <strong>{formatCurrency(balance, ws?.currency_symbol)}</strong></p>
          </div>
          <Input
            label={`Montant (${ws?.currency_symbol})`}
            type="number"
            min="0"
            step="500"
            max={balance}
            placeholder="0"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            error={paymentErrors.amount}
            required
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode de paiement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'WAVE',
                  label: 'Wave',
                  activeColor: 'bg-[#1DC4FF] text-white border-[#1DC4FF] shadow-sm ring-2 ring-offset-1 ring-[#1DC4FF]',
                },
                {
                  id: 'ORANGE_MONEY',
                  label: 'Orange Money',
                  activeColor: 'bg-black text-white border-black shadow-sm ring-2 ring-offset-1 ring-[#FF7900]',
                },
                {
                  id: 'CASH',
                  label: 'Espèces',
                  activeColor: 'bg-green-700 text-white border-green-700 shadow-sm ring-2 ring-offset-1 ring-green-700',
                },
                {
                  id: 'BANK',
                  label: 'Virement',
                  activeColor: 'bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-offset-1 ring-purple-700',
                },
                {
                  id: 'STRIPE',
                  label: 'Carte (Stripe)',
                  activeColor: 'bg-indigo-700 text-white border-indigo-700 shadow-sm ring-2 ring-offset-1 ring-indigo-700',
                },
                {
                  id: 'OTHER',
                  label: 'Autre',
                  activeColor: 'bg-gray-700 text-white border-gray-700 shadow-sm ring-2 ring-offset-1 ring-gray-700',
                },
              ].map((pm) => {
                const active = paymentForm.method === pm.id;
                return (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => setPaymentForm({ ...paymentForm, method: pm.id as PaymentMethod })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? `${pm.activeColor} shadow-md`
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs'
                    }`}
                  >
                    <PaymentMethodIcon method={pm.id} size="sm" />
                    <span className="truncate">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Input
            label="Date"
            type="date"
            value={paymentForm.payment_date}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
            error={paymentErrors.payment_date}
            required
          />
          <Input
            label="Référence (facultatif)"
            placeholder="N° de transaction Wave, etc."
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
          />
          <Textarea
            label="Notes (facultatif)"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            rows={2}
          />
        </form>
      </Modal>

      {/* Status change Modal */}
      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Changer le statut"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Annuler</Button>
            <Button fullWidth onClick={handleStatusChange} disabled={!selectedStatus}>
              Confirmer
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Statut actuel: <strong>{ORDER_STATUS_LABELS[order.status]}</strong></p>
          <div className="space-y-2">
            {availableTransitions.map((t) => (
              <button
                key={t.to}
                onClick={() => setSelectedStatus(t.to)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedStatus === t.to
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm font-medium text-gray-900">{t.label}</span>
              </button>
            ))}
          </div>
          {selectedStatus && (
            <Textarea
              label="Note (facultatif)"
              placeholder="Raison, observation…"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              rows={2}
            />
          )}
        </div>
      </Modal>

      {/* Delete / Archive Order Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Supprimer la commande"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer définitivement la commande{' '}
            <strong>« {order.order_number} »</strong> ?
          </p>
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            La commande sera archivée et retirée de la liste active et de la production.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                archiveOrder(order.id);
                setDeleteConfirmOpen(false);
                success('Commande supprimée avec succès');
                router.push('/orders');
              }}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* WhatsApp Modal */}
      {order.customer && (
        <WhatsAppSenderModal
          open={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
          customer={order.customer}
          order={order}
          workshop={ws}
          defaultTemplate={
            order.status === 'READY'
              ? 'order_ready'
              : balance > 0
              ? 'balance_reminder'
              : 'delivery_reminder'
          }
        />
      )}
    </div>
  );
}
