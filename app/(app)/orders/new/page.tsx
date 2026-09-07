'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, PageHeader, Avatar } from '@/components/ui/card';
import { SearchBar } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, UserPlus, ChevronRight, Check, Calendar } from 'lucide-react';
import { PaymentMethodIcon } from '@/components/ui/payment-method-icon';
import type { GarmentType, PriorityLevel, PaymentMethod, CreateOrderItemInput } from '@/lib/types';

const GARMENT_OPTIONS = [
  { value: '', label: 'Choisir un type' },
  { value: 'BOUBOU', label: 'Grand Boubou' },
  { value: 'KAFTAN', label: 'Kaftan' },
  { value: 'CHEMISE', label: 'Chemise' },
  { value: 'PANTALON', label: 'Pantalon' },
  { value: 'ROBE', label: 'Robe' },
  { value: 'JUPE', label: 'Jupe' },
  { value: 'VESTE', label: 'Veste' },
  { value: 'COSTUME', label: 'Costume' },
  { value: 'ENSEMBLE', label: 'Ensemble' },
  { value: 'AUTRE', label: 'Autre' },
];

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: 'Normale' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'URGENT', label: '🚨 Urgent' },
  { value: 'LOW', label: 'Basse' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'BANK', label: 'Virement bancaire' },
  { value: 'OTHER', label: 'Autre' },
];

interface ItemForm {
  name: string;
  garment_type: GarmentType | '';
  fabric: string;
  color: string;
  quantity: number;
  unit_price: number;
  notes: string;
}

const EMPTY_ITEM: ItemForm = {
  name: '',
  garment_type: '',
  fabric: '',
  color: '',
  quantity: 1,
  unit_price: 0,
  notes: '',
};

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers, createOrder, currentWorkshop } = useAppStore();
  const { success, error: showError } = useToast();

  const preSelectedCustomerId = searchParams.get('customer') || '';
  const ws = currentWorkshop;

  // Step: 1=customer, 2=items, 3=summary
  const [step, setStep] = useState(preSelectedCustomerId ? 2 : 1);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preSelectedCustomerId);
  const [customerSearch, setCustomerSearch] = useState('');
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [notes, setNotes] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId && !c.deleted_at);
  const activeCustomers = customers.filter((c) => !c.deleted_at);
  const filteredCustomers = activeCustomers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return !q || c.full_name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const totalAmount = items.reduce((s, i) => s + (Number(i.unit_price) * Number(i.quantity) || 0), 0);

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemForm, value: string | number) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function validateStep2() {
    const errs: Record<string, string> = {};
    items.forEach((item, i) => {
      if (!item.name.trim()) errs[`item_${i}_name`] = 'Nom requis';
      if (!item.unit_price || Number(item.unit_price) <= 0) errs[`item_${i}_price`] = 'Prix requis';
    });
    return errs;
  }

  async function handleSubmit() {
    if (!selectedCustomerId) return showError('Client manquant', 'Sélectionnez un client.');
    const errs = validateStep2();
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      const initialAmt = parseFloat(initialPayment) || 0;
      if (initialAmt < 0) throw new Error('Le paiement ne peut pas être négatif');
      if (initialAmt > totalAmount) throw new Error(`L'avance (${initialAmt}) dépasse le total (${totalAmount})`);

      const order = createOrder({
        customer_id: selectedCustomerId,
        due_date: dueDate || undefined,
        priority,
        notes: notes.trim() || undefined,
        items: items.filter(i => i.name.trim()).map((item) => ({
          name: item.name.trim(),
          garment_type: item.garment_type as GarmentType || undefined,
          fabric: item.fabric.trim() || undefined,
          color: item.color.trim() || undefined,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price),
          notes: item.notes.trim() || undefined,
        })),
        initial_payment: initialAmt > 0 ? initialAmt : undefined,
        initial_payment_method: initialAmt > 0 ? paymentMethod : undefined,
      });

      success('Commande créée !', order.order_number);
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      showError('Erreur', err instanceof Error ? err.message : 'Impossible de créer la commande.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <PageHeader
        title="Nouvelle commande"
        action={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
            Retour
          </Button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {[
          { n: 1, label: 'Client' },
          { n: 2, label: 'Articles' },
          { n: 3, label: 'Résumé' },
        ].map((s, idx) => (
          <div key={s.n} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
              step === s.n ? 'bg-green-800 text-white' :
              step > s.n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {step > s.n ? <Check className="h-3 w-3" /> : <span>{s.n}</span>}
              {s.label}
            </div>
            {idx < 2 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Customer selection */}
      {step === 1 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sélectionner un client</h3>
          <SearchBar value={customerSearch} onChange={setCustomerSearch} placeholder="Nom ou téléphone…" className="mb-3" />

          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-3">Aucun client trouvé</p>
                <Button size="sm" variant="secondary" leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => router.push('/customers/new')}>
                  Créer un client
                </Button>
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomerId(c.id); setStep(2); }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                    selectedCustomerId === c.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <Avatar name={c.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  {selectedCustomerId === c.id && <Check className="h-4 w-4 text-green-700 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <Button size="sm" variant="secondary" leftIcon={<UserPlus className="h-4 w-4" />} fullWidth
              onClick={() => router.push('/customers/new')}>
              Créer un nouveau client
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Items */}
      {step === 2 && (
        <div className="space-y-4">
          {selectedCustomer && (
            <button onClick={() => setStep(1)} className="w-full bg-green-50 rounded-xl p-3 flex items-center gap-3 text-left border border-green-100">
              <Avatar name={selectedCustomer.full_name} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">{selectedCustomer.full_name}</p>
                <p className="text-xs text-green-600">{selectedCustomer.phone}</p>
              </div>
              <span className="text-xs text-green-600">Changer →</span>
            </button>
          )}

          {items.map((item, idx) => (
            <Card key={idx}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Article {idx + 1}</p>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <Input
                  label="Nom du vêtement"
                  placeholder="Ex: Grand Boubou brodé"
                  value={item.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  error={errors[`item_${idx}_name`]}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Type"
                    options={GARMENT_OPTIONS}
                    value={item.garment_type}
                    onChange={(e) => updateItem(idx, 'garment_type', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Qté"
                      type="number"
                      min="1"
                      value={String(item.quantity)}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Prix <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          placeholder="0"
                          value={item.unit_price || ''}
                          onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 ${errors[`item_${idx}_price`] ? 'border-red-400' : 'border-gray-300'}`}
                        />
                      </div>
                      {errors[`item_${idx}_price`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${idx}_price`]}</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Tissu" placeholder="Bazin, Kente…" value={item.fabric} onChange={(e) => updateItem(idx, 'fabric', e.target.value)} />
                  <Input label="Couleur" placeholder="Bleu, Beige…" value={item.color} onChange={(e) => updateItem(idx, 'color', e.target.value)} />
                </div>
                {item.unit_price > 0 && item.quantity > 1 && (
                  <p className="text-xs text-green-700 font-medium">
                    Sous-total: {formatCurrency(item.unit_price * item.quantity, ws?.currency_symbol)}
                  </p>
                )}
              </div>
            </Card>
          ))}

          <Button variant="secondary" fullWidth leftIcon={<Plus className="h-4 w-4" />} onClick={addItem}>
            Ajouter un article
          </Button>

          {totalAmount > 0 && (
            <Card>
              <p className="text-base font-bold text-gray-900 text-right">
                Total: {formatCurrency(totalAmount, ws?.currency_symbol)}
              </p>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
            <Button fullWidth onClick={() => { const errs = validateStep2(); if (Object.keys(errs).length) setErrors(errs); else { setErrors({}); setStep(3); } }}>
              Continuer →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Summary */}
      {step === 3 && (
        <div className="space-y-4">
          {/* STEP 3: Details, Delivery & Payment */}
          <Card>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-700" />
              1. Date de livraison & Priorité
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Date de livraison prévue"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 3);
                        setDueDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                    >
                      +3 jours
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setDueDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 font-medium"
                    >
                      +1 semaine (7j)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 14);
                        setDueDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                    >
                      +2 semaines (14j)
                    </button>
                  </div>
                </div>

                <Select
                  label="Niveau de Priorité"
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                />
              </div>

              <Textarea
                label="Instructions spéciales & notes"
                placeholder="Instructions pour les couturiers, doublures, fentes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </Card>

          {/* Payment & Advance Card */}
          <Card className="border-2 border-green-700/30 bg-gradient-to-b from-white to-green-50/20 shadow-md">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">💵</span>
              2. Mode de Paiement & Avance (Acompte)
            </h3>

            <div className="space-y-4">
              {/* Payment Methods Grid */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Mode de règlement
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    {
                      id: 'WAVE',
                      label: 'Wave',
                      activeColor: 'bg-[#1DC4FF] text-white border-[#1DC4FF] shadow-md ring-2 ring-offset-1 ring-[#1DC4FF]',
                    },
                    {
                      id: 'ORANGE_MONEY',
                      label: 'Orange Money',
                      activeColor: 'bg-black text-white border-black shadow-md ring-2 ring-offset-1 ring-[#FF7900]',
                    },
                    {
                      id: 'CASH',
                      label: 'Espèces',
                      activeColor: 'bg-green-700 text-white border-green-700 shadow-md ring-2 ring-offset-1 ring-green-700',
                    },
                    {
                      id: 'BANK',
                      label: 'Virement',
                      activeColor: 'bg-purple-700 text-white border-purple-700 shadow-md ring-2 ring-offset-1 ring-purple-700',
                    },
                    {
                      id: 'OTHER',
                      label: 'Autre',
                      activeColor: 'bg-gray-700 text-white border-gray-700 shadow-md ring-2 ring-offset-1 ring-gray-700',
                    },
                  ].map((pm) => {
                    const active = paymentMethod === pm.id;
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                          active
                            ? `${pm.activeColor}`
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

              {/* Advance input & Quick Percentages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-green-900">
                      Avance versée ({ws?.currency_symbol || 'FCFA'})
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setInitialPayment('0')}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        0%
                      </button>
                      <button
                        type="button"
                        onClick={() => setInitialPayment(String(Math.round(totalAmount * 0.5)))}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 hover:bg-green-200 text-green-800"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setInitialPayment(String(totalAmount))}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 hover:bg-green-200 text-green-800"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    max={totalAmount}
                    placeholder="0"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border-2 border-green-600 bg-green-50/50 text-base font-mono font-bold text-green-950 focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                {/* Restant Dû Live Box */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Restant à payer
                  </span>
                  <p className="text-2xl font-black font-mono text-amber-700">
                    {formatCurrency(Math.max(0, totalAmount - (parseFloat(initialPayment) || 0)), ws?.currency_symbol)}
                  </p>
                  <span className="text-[10px] text-amber-800">
                    Solde exigible à la livraison
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary recap */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Récapitulatif Financier</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Client</span>
                <span className="font-medium">{selectedCustomer?.full_name}</span>
              </div>
              {items.filter(i => i.name).map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-500">{item.name} ×{item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.unit_price * item.quantity, ws?.currency_symbol)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
                <span>Total Commande</span>
                <span className="text-green-800 font-bold">{formatCurrency(totalAmount, ws?.currency_symbol)}</span>
              </div>
              {parseFloat(initialPayment) > 0 && (
                <>
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Avance ({paymentMethod})</span>
                    <span>- {formatCurrency(parseFloat(initialPayment), ws?.currency_symbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-700 pt-1 border-t border-dashed border-amber-200">
                    <span>Restant à payer</span>
                    <span>{formatCurrency(Math.max(0, totalAmount - parseFloat(initialPayment)), ws?.currency_symbol)}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
            <Button fullWidth loading={loading} onClick={handleSubmit}>
              Créer la commande ✓
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
