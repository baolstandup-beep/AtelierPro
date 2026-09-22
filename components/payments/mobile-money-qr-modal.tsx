'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import type { Order, Workshop, Customer } from '@/lib/types';

interface MobileMoneyQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  workshop: Workshop | null;
  customer?: Customer;
}

export function MobileMoneyQRModal({
  isOpen,
  onClose,
  order,
  workshop,
  customer,
}: MobileMoneyQRModalProps) {
  const [provider, setProvider] = useState<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  const [amount, setAmount] = useState<number>(order.balance || order.total_amount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function startPayment() {
    if (!Number.isInteger(amount) || amount < 100 || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/payments/bictorys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount, provider }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkout_url) {
        throw new Error(data.error || 'Impossible de démarrer le paiement.');
      }
      window.location.assign(data.checkout_url);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Erreur réseau. Réessayez.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center text-white">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Paiement Mobile Money</h3>
              <p className="text-xs text-slate-500">Paiement sécurisé par Bictorys</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1">✕</button>
        </div>

        <div className="space-y-5 pt-5">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setProvider('WAVE')}
              className={cn(
                'py-2.5 rounded-xl text-xs font-bold transition-all',
                provider === 'WAVE' ? 'bg-[#1BA8E9] text-white shadow-md' : 'text-slate-600'
              )}
            >
              Wave
            </button>
            <button
              type="button"
              onClick={() => setProvider('ORANGE_MONEY')}
              className={cn(
                'py-2.5 rounded-xl text-xs font-bold transition-all',
                provider === 'ORANGE_MONEY' ? 'bg-[#FF6600] text-white shadow-md' : 'text-slate-600'
              )}
            >
              Orange Money
            </button>
          </div>

          <div className="p-4 bg-[#FBF9F5] rounded-2xl border border-slate-200">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Montant à encaisser ({workshop?.currency_symbol || 'FCFA'})
            </label>
            <input
              type="number"
              min={100}
              max={order.balance || order.total_amount}
              step={100}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="w-full text-2xl font-bold text-slate-900 bg-transparent outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Solde : {formatCurrency(order.balance || order.total_amount, workshop?.currency_symbol)}
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            <Smartphone className="w-5 h-5 text-emerald-700 mt-0.5" />
            <p className="text-xs text-emerald-900 leading-relaxed">
              {customer?.full_name ? `${customer.full_name} sera ` : 'Le client sera '}
              redirigé vers le parcours sécurisé {provider === 'WAVE' ? 'Wave' : 'Orange Money'} de Bictorys.
              La commande sera créditée uniquement après confirmation du webhook.
            </p>
          </div>

          {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}

          <button
            type="button"
            onClick={startPayment}
            disabled={loading || !Number.isInteger(amount) || amount < 100}
            className="w-full py-3 rounded-2xl bg-[#0F3B32] hover:bg-[#0B2B26] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-300" />}
            {loading ? 'Connexion à Bictorys…' : `Payer ${formatCurrency(amount, workshop?.currency_symbol)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
