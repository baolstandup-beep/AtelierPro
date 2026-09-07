'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Scissors,
  Bot,
  ExternalLink,
  CheckCheck,
  Phone,
} from 'lucide-react';

let messageCounter = 0;
function generateMessageId(prefix: string) {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

function getFormattedTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  isQuickAction?: boolean;
}

const AI_SUGGESTIONS = [
  {
    id: 'mesures',
    icon: '📐',
    label: 'Gabarits & Mesures',
    prompt: 'Comment fonctionne la saisie des mesures et gabarits africains dans AtelierPro ?',
    response:
      '✨ **Gabarits & Mesures Africaines :** AtelierPro inclut des gabarits préconfigurés pour toutes les coupes traditionnelles et modernes (Grand Boubou 3 pièces, Marinière, Robe Sirène, Ensemble Bazin, etc.). Vous saisissez les mensurations en quelques secondes depuis votre smartphone avec validation automatique des proportions pour éviter toute erreur de coupe.',
  },
  {
    id: 'paiements',
    icon: '💳',
    label: 'Paiements Wave & OM',
    prompt: 'Comment fonctionnent les paiements et acomptes avec Wave et Orange Money ?',
    response:
      '💰 **Paiements & Acomptes Sécurisés :** Pour chaque commande, AtelierPro génère un QR code dynamique et un lien direct Wave / Orange Money. Vos clients peuvent verser un acompte à la commande (ex: 50%) et régler le solde lors de l\'essayage final. Les reçus et factures PDF sont transmis en un clic sur WhatsApp.',
  },
  {
    id: 'tissus',
    icon: '🧵',
    label: 'Gestion des Tissus',
    prompt: 'Puis-je suivre mes stocks de rouleaux de tissus (Bazin, Wax, Soie) ?',
    response:
      '🧵 **Gestion des Stocks de Tissus :** Oui ! Le module `/tissus` permet d\'enregistrer vos rouleaux (Bazin Riche, Wax Woodin, Soie, Lin, Dentelle), d\'associer les métrages nécessaires aux modèles du catalogue et de recevoir des alertes de stock bas avant rupture.',
  },
  {
    id: 'planning',
    icon: '📅',
    label: 'Agenda des Essayages',
    prompt: 'Comment planifier les séances d\'essayage et livraisons avec mes tailleurs ?',
    response:
      '📅 **Agenda & Planning Tailleurs :** Vous disposez d\'un calendrier interactif pour caler les rendez-vous d\'essayages, assigner chaque tâche à vos ouvriers et envoyer des rappels automatiques WhatsApp aux clients pour qu\'ils viennent récupérer leurs tenues à temps.',
  },
];

export function WhatsAppAiAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: '👋 Bonjour ! Je suis **l\'Agent IA AtelierPro**, votre conseiller virtuel 24/7 spécialisé dans la gestion d\'ateliers de couture et de haute confection.',
      timestamp: 'À l\'instant',
    },
    {
      id: 'welcome-2',
      sender: 'bot',
      text: 'Comment puis-je vous aider aujourd\'hui ? Vous pouvez choisir une question rapide ou taper votre message.',
      timestamp: 'À l\'instant',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendPrompt = (promptText: string, customResponse?: string) => {
    if (!promptText.trim()) return;

    const userMsg: Message = {
      id: generateMessageId('user'),
      sender: 'user',
      text: promptText,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let botAnswer = customResponse;

      if (!botAnswer) {
        // Find if matches suggestion or generate contextual response
        const lower = promptText.toLowerCase();
        if (lower.includes('tarif') || lower.includes('prix') || lower.includes('payer') || lower.includes('coût')) {
          botAnswer =
            '💎 **Tarifs AtelierPro :** Vous avez le choix entre le forfait mensuel flexible à 2 900 FCFA/mois ou le forfait annuel à 29 000 FCFA/an (2 mois offerts). Les paiements sont sécurisés par Wave, Orange Money et Carte Bancaire.';
        } else if (lower.includes('contact') || lower.includes('numéro') || lower.includes('téléphone') || lower.includes('whatsapp') || lower.includes('aide')) {
          botAnswer =
            '📞 **Assistance Directe :** Vous pouvez contacter l\'équipe AtelierPro directement au **+221 77 303 31 96** par appel ou sur WhatsApp pour une démonstration personnalisée ou une assistance technique.';
        } else if (lower.includes('mesure') || lower.includes('gabarit') || lower.includes('carnet')) {
          botAnswer =
            '📏 **Mesures & Gabarits :** Le carnet numérique AtelierPro stocke toutes les mensurations de vos clients avec gabarits africains complets et historique de confections. Fini les pertes de carnets !';
        } else {
          botAnswer =
            '✂️ **Conseil Agent IA AtelierPro :** AtelierPro est spécialement conçu pour les ateliers de couture en Afrique. Vous digitalisez les mesures, commandes, livraisons et paiements Wave/OM depuis votre smartphone.';
        }
      }

      const botMsg: Message = {
        id: generateMessageId('bot'),
        sender: 'bot',
        text: botAnswer,
        timestamp: getFormattedTime(),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  // WhatsApp Hand-off URL
  const getWhatsAppUrl = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user')?.text;
    const defaultText = lastUserMessage
      ? `Bonjour Agent IA AtelierPro, suite à notre échange : "${lastUserMessage}", j'aimerais avoir plus de précisions.`
      : "Bonjour Agent IA AtelierPro, j'aimerais avoir une démonstration et des conseils pour mon atelier de couture.";
    return `https://wa.me/221773033196?text=${encodeURIComponent(defaultText)}`;
  };

  return (
    <>
      {/* ─── 1. FLOATING AGENT IA WHATSAPP TRIGGER BUTTON ─── */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-3 px-4 py-3 rounded-full bg-[#0F3B32] hover:bg-[#14532D] text-white shadow-[0_12px_35px_rgba(15,59,50,0.35),0_0_20px_rgba(37,211,102,0.25)] border-2 border-[#25D366]/60 transition-all cursor-pointer"
          aria-label="Ouvrir l'Agent IA AtelierPro WhatsApp"
        >
          {/* Animated WhatsApp / AI Glow */}
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md">
              <MessageCircle className="w-5 h-5 fill-white text-white" />
            </div>
            {/* Pulsating green online dot */}
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0F3B32] rounded-full animate-pulse" />
          </div>

          <div className="flex flex-col text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight text-white font-serif-luxury">
                Agent IA Atelier<span className="text-[#D97706]">Pro</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#25D366]/20 text-[#25D366] font-bold border border-[#25D366]/40">
                24/7
              </span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              WhatsApp Assistance IA
            </span>
          </div>
        </motion.button>
      </div>

      {/* ─── 2. INTERACTIVE AGENT IA CHAT DRAWER / MODAL ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[94vw] max-w-[400px] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-[#E7E2D8] flex flex-col overflow-hidden text-slate-800"
          >
            {/* Top Brand Header */}
            <div className="bg-gradient-to-r from-[#0F3B32] via-[#14532D] to-[#0F3B32] p-4 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-inner">
                    <Scissors className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-[#0F3B32] rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm leading-tight text-white font-serif-luxury">
                      Agent IA AtelierPro
                    </h3>
                    <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  </div>
                  <p className="text-[11px] text-emerald-200/90 leading-tight">
                    Assistant Virtuel & Support WhatsApp
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Fermer le chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct WhatsApp Hand-off Banner */}
            <div className="bg-[#25D366]/10 border-b border-[#25D366]/20 px-3.5 py-2 flex items-center justify-between text-xs text-[#0F3B32] shrink-0">
              <div className="flex items-center gap-1.5 font-medium text-[11px]">
                <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                <span>WhatsApp officiel : <strong>+221 77 303 31 96</strong></span>
              </div>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[10px] shadow-sm transition-all"
              >
                <span>Ouvrir WhatsApp</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FBF9F5]/70">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#0F3B32] text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-[#E7E2D8] rounded-bl-none'
                    }`}
                  >
                    {/* Bot name tag if bot */}
                    {msg.sender === 'bot' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#0F3B32] mb-1">
                        <Bot className="w-3 h-3 text-[#D97706]" />
                        <span>Agent IA AtelierPro</span>
                      </div>
                    )}
                    <div className="whitespace-pre-line">{msg.text}</div>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 flex items-center gap-1">
                    {msg.timestamp}
                    {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-[#0F3B32]" />}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-[#E7E2D8] rounded-2xl p-3 max-w-[70%] shadow-sm">
                  <Bot className="w-3.5 h-3.5 text-[#0F3B32] animate-spin" />
                  <span>L&apos;Agent IA réfléchit...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Chips Carousel */}
            <div className="p-2.5 bg-white border-t border-[#EBE7DF] shrink-0">
              <p className="text-[10px] font-semibold text-slate-400 mb-1.5 px-1">
                Suggestions de questions rapides :
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {AI_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug.id}
                    onClick={() => handleSendPrompt(sug.prompt, sug.response)}
                    className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-[#F7F4ED] hover:bg-[#EBE7DF] text-[#0F3B32] border border-[#E7E2D8] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{sug.icon}</span>
                    <span>{sug.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputValue);
              }}
              className="p-3 bg-white border-t border-[#EBE7DF] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Posez votre question à l'Agent IA..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-[#F7F4ED] border border-[#E7E2D8] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F3B32] transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 rounded-xl bg-[#0F3B32] hover:bg-[#14532D] disabled:opacity-50 text-white shadow-sm transition-all cursor-pointer"
                aria-label="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
