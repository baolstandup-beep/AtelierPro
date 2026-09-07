'use client';

import { useState } from 'react';
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Order, Workshop, Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MobileMoneyQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  workshop: Workshop | null;
  customer?: Customer;
  onPaymentConfirmed?: (amount: number, method: 'WAVE' | 'ORANGE_MONEY') => void;
}

export function MobileMoneyQRModal({
  isOpen,
  onClose,
  order,
  workshop,
  customer,
  onPaymentConfirmed,
}: MobileMoneyQRModalProps) {
  const [provider, setProvider] = useState<'WAVE' | 'ORANGE_MONEY'>('WAVE');
  const [amount, setAmount] = useState<number>(order.balance || order.total_amount);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const paymentLink = `https://pay.atelierpro.app/${provider.toLowerCase()}?ref=${order.order_number}&amt=${amount}`;
  const ussdCode = `*144#391*${amount}*${order.order_number.replace(/[^0-9]/g, '')}#`;

  function handleCopy() {
    navigator.clipboard.writeText(paymentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleSimulatePayment() {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setIsConfirmed(true);
      if (onPaymentConfirmed) {
        onPaymentConfirmed(amount, provider);
      }
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-serif">Paiement Mobile Money Immédiat</h3>
              <p className="text-xs text-slate-500">Générateur QR & Push sans contact</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {isConfirmed ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 font-serif">Paiement Reçu avec Succès !</h4>
              <p className="text-xs text-slate-600 mt-1">
                L'acompte de <strong>{formatCurrency(amount, workshop?.currency_symbol)}</strong> par{' '}
                <strong>{provider === 'WAVE' ? 'Wave Sénégal' : 'Orange Money'}</strong> a été validé et crédité.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs font-bold hover:bg-[#0B2B26]"
              >
                Retour à la commande
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-4">
            {/* Provider Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setProvider('WAVE')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all',
                  provider === 'WAVE'
                    ? 'bg-[#1BA8E9] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>🌊 Wave</span>
              </button>
              <button
                onClick={() => setProvider('ORANGE_MONEY')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all',
                  provider === 'ORANGE_MONEY'
                    ? 'bg-[#FF6600] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <span>🍊 Orange Money</span>
              </button>
            </div>

            {/* Amount input */}
            <div className="p-3 bg-[#FBF9F5] rounded-2xl border border-slate-200">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Montant à encaisser ({workshop?.currency_symbol || 'FCFA'})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full text-xl font-black text-slate-900 font-mono bg-transparent outline-none"
                />
                <span className="text-xs font-bold text-slate-400">
                  Total : {formatCurrency(order.total_amount, workshop?.currency_symbol)}
                </span>
              </div>
            </div>

            {/* Visual QR Code Display */}
            <div className="p-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
              <div className="w-40 h-40 bg-slate-900 text-white rounded-2xl mx-auto flex flex-col items-center justify-center p-3 shadow-inner relative group">
                <QrCode className="w-28 h-28 text-white" />
                <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate-300">
                  {provider} QR SECURE
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Faites scanner ce QR code avec l'application <strong>{provider === 'WAVE' ? 'Wave' : 'Orange Money'}</strong> du client.
              </p>
            </div>

            {/* Copy Payment Link or USSD */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={provider === 'WAVE' ? paymentLink : ussdCode}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Action Simulator */}
            <div className="pt-2">
              <button
                onClick={handleSimulatePayment}
                disabled={isSimulating || amount <= 0}
                className="w-full py-3 rounded-2xl bg-[#0F3B32] hover:bg-[#0B2B26] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#0F3B32]/15 transition-all"
              >
                {isSimulating ? (
                  <span>Validation du transfert Wave en cours...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Confirmer la réception de {formatCurrency(amount, workshop?.currency_symbol)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
