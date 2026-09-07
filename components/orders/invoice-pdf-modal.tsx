'use client';

import { useState } from 'react';
import {
  Printer,
  Download,
  Share2,
  Check,
  Scissors,
  QrCode,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  MessageCircle,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, Workshop, Customer, Payment } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InvoicePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  workshop: Workshop | null;
  customer?: Customer;
  payments: Payment[];
}

export function InvoicePDFModal({
  isOpen,
  onClose,
  order,
  workshop,
  customer,
  payments,
}: InvoicePDFModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalPaid = payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = Math.max(0, order.total_amount - totalPaid);

  function handlePrint() {
    window.print();
  }

  function handleWhatsAppShare() {
    const text = `Bonjour ${customer?.full_name || 'Client'},\nVoici votre reçu / devis officiel pour la commande *${order.order_number}* chez *${workshop?.name || 'AtelierPro'}*.\n\n` +
      `👗 Articles : ${order.items?.map(i => i.name).join(', ') || 'Confection sur-mesure'}\n` +
      `💰 Total : ${formatCurrency(order.total_amount, workshop?.currency_symbol)}\n` +
      `✅ Acompte versé : ${formatCurrency(totalPaid, workshop?.currency_symbol)}\n` +
      `⏳ Reste à payer : ${formatCurrency(balanceDue, workshop?.currency_symbol)}\n` +
      `📅 Date de livraison prévue : ${order.due_date ? formatDate(order.due_date) : 'À confirmer'}\n\n` +
      `Merci pour votre confiance ! ✨`;

    const cleanPhone = customer?.phone?.replace(/[^0-9]/g, '') || '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold font-serif">Facture / Devis Officiel Haute Confection</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-all text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 space-y-8 print:p-0 print:m-0" id="printable-invoice">
          {/* Header & Logo */}
          <div className="flex items-start justify-between border-b-2 border-[#0F3B32] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center text-white">
                  <Scissors className="w-4 h-4 -rotate-45" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-[#0F3B32]">
                  {workshop?.name || 'AtelierPro Couture'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Maison de Confection Sur-Mesure & Haute Couture</p>
              <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400" /> {workshop?.address || 'Rue 12, Médina'}, {workshop?.city || 'Dakar'}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" /> {workshop?.phone || '+221 77 303 31 96'}
                </p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-right">
              <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-[#0F3B32] text-white">
                FACTURE / REÇU
              </span>
              <p className="text-lg font-black font-mono text-slate-900 mt-2">{order.order_number}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date : <strong className="text-slate-800">{formatDate(order.created_at)}</strong>
              </p>
              {order.due_date && (
                <p className="text-xs text-amber-800 font-bold mt-0.5">
                  Livraison : {formatDate(order.due_date)}
                </p>
              )}
            </div>
          </div>

          {/* Client & Fitting Details */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Client / Destinataire
              </span>
              <p className="text-sm font-black text-slate-900 font-serif">
                {customer?.full_name || 'Client de Passage'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{customer?.phone || 'Téléphone non renseigné'}</p>
              {customer?.city && <p className="text-xs text-slate-500">{customer.city}</p>}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Statut Commande
              </span>
              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                {order.status === 'READY' ? 'Prêt à livrer' : order.status === 'DELIVERED' ? 'Livré' : 'En confection'}
              </span>
              {order.notes && (
                <p className="text-xs text-slate-600 mt-1">
                  Note : <strong>{order.notes}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#0F3B32]/30 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 font-bold">Désignation de la tenue</th>
                  <th className="py-2.5 font-bold text-center">Qté</th>
                  <th className="py-2.5 font-bold text-right">Prix Unitaire</th>
                  <th className="py-2.5 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-3 font-semibold text-slate-900">
                        {item.name}
                        {item.notes && <span className="block text-[10px] text-slate-400 font-normal">{item.notes}</span>}
                      </td>
                      <td className="py-3 text-center text-slate-600">{item.quantity || 1}</td>
                      <td className="py-3 text-right text-slate-600">{formatCurrency(item.unit_price, workshop?.currency_symbol)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(item.unit_price * (item.quantity || 1), workshop?.currency_symbol)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 font-semibold text-slate-900">Confection Sur-Mesure Artisanale</td>
                    <td className="py-3 text-center text-slate-600">1</td>
                    <td className="py-3 text-right text-slate-600">{formatCurrency(order.total_amount, workshop?.currency_symbol)}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(order.total_amount, workshop?.currency_symbol)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end pt-4 border-t-2 border-slate-200">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Montant Total :</span>
                <span className="font-bold text-slate-900">{formatCurrency(order.total_amount, workshop?.currency_symbol)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Acomptes Reçus :</span>
                <span className="font-bold">- {formatCurrency(totalPaid, workshop?.currency_symbol)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#0F3B32] pt-2 border-t border-slate-200">
                <span>Solde Restant :</span>
                <span>{formatCurrency(balanceDue, workshop?.currency_symbol)}</span>
              </div>
            </div>
          </div>

          {/* Footer & QR Verification */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <div className="max-w-xs space-y-0.5">
              <p className="font-bold text-slate-700">Conditions de l’atelier :</p>
              <p>Les tenues confectionnées sur-mesure doivent être retirées dans un délai de 30 jours après notification.</p>
            </div>

            <div className="flex items-center gap-2 p-2 bg-[#FBF9F5] rounded-xl border border-slate-200">
              <QrCode className="w-8 h-8 text-[#0F3B32]" />
              <div className="text-right">
                <span className="font-black text-slate-800 block text-[9px]">AUTHENTICITÉ VÉRIFIÉE</span>
                <span className="text-[8px] font-mono text-slate-400">AtelierPro SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
