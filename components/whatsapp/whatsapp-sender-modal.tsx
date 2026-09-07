'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  MessageCircle,
  Send,
  Copy,
  Calendar,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Receipt,
  Clock,
  Check,
} from 'lucide-react';
import type { Customer, Order, Workshop } from '@/lib/types';

export type WhatsAppTemplateType = 'balance_reminder' | 'delivery_reminder' | 'order_ready' | 'receipt';

interface WhatsAppSenderModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer;
  order?: Order;
  workshop?: Workshop | null;
  defaultTemplate?: WhatsAppTemplateType;
}

export function WhatsAppSenderModal({
  open,
  onClose,
  customer,
  order,
  workshop,
  defaultTemplate = 'balance_reminder',
}: WhatsAppSenderModalProps) {
  const { success } = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateType>(defaultTemplate);
  const [copied, setCopied] = useState(false);

  // Financial values
  const totalAmount = order?.total_amount || customer.total_spent || 0;
  const balance = order ? Math.max(0, order.total_amount - order.paid_amount) : (customer.total_balance || 0);
  const paidAmount = Math.max(0, totalAmount - balance);
  const currencySymbol = workshop?.currency_symbol || 'FCFA';

  const workshopName = workshop?.name || 'Notre Atelier de Couture';
  const workshopAddress = workshop?.address ? `${workshop.address} (${workshop.city || ''})` : 'notre atelier';
  const clientName = customer.full_name || 'Cher(e) Client(e)';
  const orderRef = order?.order_number || 'Confection';
  const orderItems = order?.items && order.items.length > 0
    ? order.items.map((i) => i.name).join(', ')
    : 'Tenue sur-mesure';
  const dueDateStr = order?.due_date ? formatDate(order.due_date) : 'très prochainement';

  // Template generators
  const templates: Record<WhatsAppTemplateType, { title: string; icon: string; text: string }> = {
    balance_reminder: {
      title: 'Rappel de Restant Dû',
      icon: '💵',
      text: `Bonjour ${clientName} ! ✂️\n\nVotre atelier *${workshopName}* vous rappelle qu'un solde restant de *${formatCurrency(balance, currencySymbol)}* est dû sur votre commande (${orderRef} - ${orderItems}).\n\n💰 Vous pouvez effectuer le règlement par Wave ou Orange Money, ou directement à l'atelier lors du retrait.\n\nMerci pour votre confiance ! ✨`,
    },
    delivery_reminder: {
      title: 'Rappel Date de Livraison',
      icon: '📅',
      text: `Bonjour ${clientName} ! 🪡\n\nVotre atelier *${workshopName}* vous informe que votre tenue (*${orderItems}*) sera prête pour votre séance d'essayage le *${dueDateStr}*.\n\n📍 Adresse : ${workshopAddress}\nN'hésitez pas à nous prévenir en cas d'indisponibilité. À très bientôt ! ✨`,
    },
    order_ready: {
      title: 'Tenue Prête au Retrait',
      icon: '🎉',
      text: `🎉 Bonne nouvelle ${clientName} !\n\nVotre commande (*${orderRef}* - ${orderItems}) est terminée et prête à être récupérée à l'atelier *${workshopName}*.\n\n💵 Solde restant à régler au retrait : *${formatCurrency(balance, currencySymbol)}*.\n📍 Nous vous attendons avec plaisir ! ✨`,
    },
    receipt: {
      title: 'Reçu d\'Acompte / Facture',
      icon: '🧾',
      text: `🧾 *REÇU DE COMMANDE — ${workshopName}*\n\nClient : ${clientName}\nCommande : *${orderRef}*\nArticle(s) : ${orderItems}\n-------------------------------\nTotal de la commande : ${formatCurrency(totalAmount, currencySymbol)}\nAvance reçue : ${formatCurrency(paidAmount, currencySymbol)}\n*Solde restant à payer : ${formatCurrency(balance, currencySymbol)}*\nDate de livraison prévue : ${dueDateStr}\n-------------------------------\nMerci d'avoir choisi *${workshopName}* ! ✂️`,
    },
  };

  const [customMessage, setCustomMessage] = useState(templates[defaultTemplate]?.text || '');

  // Keep message in sync if customer, order or defaultTemplate changes
  React.useEffect(() => {
    if (open) {
      setCustomMessage(templates[selectedTemplate]?.text || '');
    }
  }, [open, customer.id, order?.id, selectedTemplate]);

  function handleSelectTemplate(tmpl: WhatsAppTemplateType) {
    setSelectedTemplate(tmpl);
    setCustomMessage(templates[tmpl].text);
  }

  // Format Phone Number (Remove spaces, dashes, prepend Senegal/Ivory Coast if needed)
  const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(customMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  function handleCopy() {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    success('Message copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2500);
  }

  function handleOpenWhatsApp() {
    window.open(whatsappUrl, '_blank');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notifications & Relances WhatsApp"
      description={`Envoyer un message automatisé à ${customer.full_name} (${customer.phone})`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Template Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            1. Choisissez le modèle de notification
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(templates) as WhatsAppTemplateType[]).map((key) => {
              const tmpl = templates[key];
              const active = selectedTemplate === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleSelectTemplate(key)}
                  className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all flex flex-col justify-between gap-1.5 ${
                    active
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm ring-2 ring-emerald-600/30'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{tmpl.icon}</span>
                  <span className="leading-tight">{tmpl.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Editor & Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Message WhatsApp pré-rempli (Modifiable)
            </label>
            <span className="text-[11px] text-gray-400 font-medium">
              Personnalisé avec les données du client
            </span>
          </div>

          <div className="relative">
            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 bg-emerald-50/20 text-xs sm:text-sm text-gray-900 font-sans focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Summary Info Strip */}
        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span>
              Solde restant : <strong className="text-amber-700 font-mono">{formatCurrency(balance, currencySymbol)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>
              Date livraison : <strong className="text-gray-900">{dueDateStr}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Destinataire : {customer.phone}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copié !' : 'Copier le texte'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fermer
            </Button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Envoyer sur WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
