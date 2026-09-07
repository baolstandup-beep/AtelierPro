'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, PageHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { PaymentMethodIcon } from '@/components/ui/payment-method-icon';
import type { PaymentMethod } from '@/lib/types';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'STRIPE', label: 'Carte bancaire (Stripe)' },
  { value: 'BANK', label: 'Virement bancaire' },
  { value: 'OTHER', label: 'Autre' },
];

export default function NewPaymentPage() {
  const router = useRouter();
  const { orders, customers, createPayment, payments, currentWorkshop } = useAppStore();
  const { success, error: showError } = useToast();
  const ws = currentWorkshop;

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [form, setForm] = useState({
    amount: '',
    method: 'CASH' as PaymentMethod,
    reference: '',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const unpaidOrders = orders
    .filter((o) => !o.deleted_at && o.status !== 'CANCELLED')
    .map((o) => {
      const paid = payments.filter(p => p.order_id === o.id && p.status === 'CONFIRMED').reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, o.total_amount - paid);
      return { ...o, balance };
    })
    .filter((o) => o.balance > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const selectedOrder = unpaidOrders.find(o => o.id === selectedOrderId);

  function validate() {
    const errs: Record<string, string> = {};
    if (!selectedOrderId) errs.order = 'Sélectionnez une commande';
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) errs.amount = 'Montant invalide';
    else if (selectedOrder && amount > selectedOrder.balance + 0.01) {
      errs.amount = `Maximum: ${formatCurrency(selectedOrder.balance, ws?.currency_symbol)}`;
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      await createPayment({
        order_id: selectedOrderId,
        customer_id: selectedOrder!.customer_id,
        amount: parseFloat(form.amount),
        method: form.method,
        reference: form.reference.trim() || undefined,
        payment_date: form.payment_date,
      });
      success('Paiement enregistré !');
      router.push(`/orders/${selectedOrderId}`);
    } catch (err: unknown) {
      showError('Erreur', err instanceof Error ? err.message : 'Impossible d\'enregistrer le paiement.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-md">
      <PageHeader
        title="Nouveau paiement"
        action={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
            Retour
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Commande <span className="text-red-500">*</span>
            </label>
            {unpaidOrders.length === 0 ? (
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
                ✓ Toutes les commandes sont soldées !
              </div>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => { setSelectedOrderId(e.target.value); setErrors({}); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '36px', appearance: 'none' }}
              >
                <option value="">Sélectionner une commande…</option>
                {unpaidOrders.map((o) => {
                  const c = customers.find(c => c.id === o.customer_id);
                  return (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {c?.full_name} — Reste: {formatCurrency(o.balance, ws?.currency_symbol)}
                    </option>
                  );
                })}
              </select>
            )}
            {errors.order && <p className="mt-1 text-xs text-red-600">{errors.order}</p>}
          </div>

          {selectedOrder && (
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-orange-700">
                Commande: <strong>{selectedOrder.order_number}</strong> — Total: <strong>{formatCurrency(selectedOrder.total_amount, ws?.currency_symbol)}</strong>
              </p>
              <p className="text-sm font-bold text-orange-800 mt-1">
                Reste à payer: {formatCurrency(selectedOrder.balance, ws?.currency_symbol)}
              </p>
            </div>
          )}

          <Input
            label={`Montant (${ws?.currency_symbol || 'FCFA'})`}
            type="number"
            min="0"
            step="500"
            max={selectedOrder?.balance}
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
            required
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
                const active = form.method === pm.id;
                return (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => setForm({ ...form, method: pm.id as PaymentMethod })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? `${pm.activeColor} shadow-md`
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-xs'
                    }`}
                  >
                    <PaymentMethodIcon method={pm.id} size="md" />
                    <span className="truncate">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Input
            label="Date"
            type="date"
            value={form.payment_date}
            onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
            required
          />
          <Input
            label="Référence (facultatif)"
            placeholder="N° transaction…"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>Annuler</Button>
            <Button type="submit" fullWidth loading={loading}>
              Enregistrer le paiement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
