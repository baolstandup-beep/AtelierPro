'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Filter,
  Plus,
  User,
  Phone,
  MessageCircle,
  Scissors,
  Sparkles,
  MapPin
} from 'lucide-react';
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  parseISO,
  isBefore,
  startOfToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface FittingAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  orderNumber?: string;
  type: 'PREMIER_ESSAYAGE' | 'RETOUCHE' | 'ESSAYAGE_FINAL' | 'PRISE_DE_MESURES';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  tailorName: string;
  notes?: string;
  status: 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

const INITIAL_APPOINTMENTS: FittingAppointment[] = [
  {
    id: 'apt-01',
    customerName: 'Fatou Sow',
    customerPhone: '+221 77 450 12 34',
    orderNumber: 'CMD-2024-002',
    type: 'PREMIER_ESSAYAGE',
    date: new Date().toISOString().split('T')[0],
    time: '14:30',
    tailorName: 'Mamadou Diallo (Maître Tailleur)',
    notes: 'Vérifier la carrure d’épaule et l’aisance taille du Kaftan.',
    status: 'CONFIRMED',
  },
  {
    id: 'apt-02',
    customerName: 'Amadou Diallo',
    customerPhone: '+221 77 320 88 99',
    orderNumber: 'CMD-2024-001',
    type: 'ESSAYAGE_FINAL',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    tailorName: 'Ibrahima Cissé',
    notes: 'Grand Boubou 3 pièces - Ajustement longueur pantalon.',
    status: 'CONFIRMED',
  },
  {
    id: 'apt-03',
    customerName: 'Mariama Kouyaté',
    customerPhone: '+221 78 611 00 22',
    orderNumber: 'CMD-2024-007',
    type: 'RETOUCHE',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '11:00',
    tailorName: 'Awa Diop',
    notes: 'Resserrer la taille de 1.5 cm sur la robe cocktail.',
    status: 'PENDING',
  },
  {
    id: 'apt-04',
    customerName: 'Cheikh Tidiane Ndiaye',
    customerPhone: '+221 70 899 44 11',
    type: 'PRISE_DE_MESURES',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '15:00',
    tailorName: 'Mamadou Diallo',
    notes: 'Nouveau client pour tenue de mariage complet.',
    status: 'CONFIRMED',
  },
];

type CalendarSection = 'DELIVERIES' | 'FITTINGS';
type CalendarView = 'today' | 'week' | 'month' | 'all';

export default function CalendarPage() {
  const router = useRouter();
  const { orders, currentWorkshop, customers } = useAppStore();
  const [section, setSection] = useState<CalendarSection>('FITTINGS');
  const [view, setView] = useState<CalendarView>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready' | 'late' | 'delivered'>('all');
  const [appointments, setAppointments] = useState<FittingAppointment[]>(INITIAL_APPOINTMENTS);
  const [isNewApptOpen, setIsNewApptOpen] = useState(false);

  // Form State for new appointment
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    orderNumber: '',
    type: 'PREMIER_ESSAYAGE' as FittingAppointment['type'],
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    tailorName: 'Mamadou Diallo',
    notes: '',
  });

  const today = startOfToday();

  // Orders processing
  const validOrders = orders.filter((o) => !o.deleted_at && o.due_date);

  const ordersWithStatus = validOrders.map((order) => {
    const dueDate = parseISO(order.due_date!);
    const isLate = isBefore(dueDate, today) && order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
    const isDueToday = isToday(dueDate);
    const isDueSoon = isTomorrow(dueDate) || (isThisWeek(dueDate, { weekStartsOn: 1 }) && !isBefore(dueDate, today));
    const isReady = order.status === 'READY';
    const isDelivered = order.status === 'DELIVERED';

    let colorBadge = 'bg-blue-50 text-blue-700 border-blue-200';
    let statusLabel = 'Planifié';

    if (isDelivered) {
      colorBadge = 'bg-gray-100 text-gray-700 border-gray-300';
      statusLabel = 'Livrée';
    } else if (isLate) {
      colorBadge = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
      statusLabel = 'En retard';
    } else if (isReady) {
      colorBadge = 'bg-green-100 text-green-800 border-green-300';
      statusLabel = 'Prête à livrer';
    } else if (isDueToday) {
      colorBadge = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      statusLabel = "Aujourd'hui !";
    } else if (isDueSoon) {
      colorBadge = 'bg-yellow-50 text-yellow-800 border-yellow-200';
      statusLabel = 'Cette semaine';
    }

    return {
      ...order,
      dueDate,
      isLate,
      isDueToday,
      isDueSoon,
      isReady,
      isDelivered,
      colorBadge,
      statusLabel,
    };
  });

  const filteredOrders = ordersWithStatus
    .filter((order) => {
      if (view === 'today') return isToday(order.dueDate);
      if (view === 'week') return isThisWeek(order.dueDate, { weekStartsOn: 1 });
      if (view === 'month') return isThisMonth(order.dueDate);
      return true;
    })
    .filter((order) => {
      if (statusFilter === 'pending') return !order.isDelivered && !order.isReady && !order.isLate;
      if (statusFilter === 'ready') return order.isReady;
      if (statusFilter === 'late') return order.isLate;
      if (statusFilter === 'delivered') return order.isDelivered;
      return true;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const countToday = ordersWithStatus.filter((o) => o.isDueToday && !o.isDelivered).length;
  const countLate = ordersWithStatus.filter((o) => o.isLate).length;
  const countReady = ordersWithStatus.filter((o) => o.isReady).length;
  const apptsToday = appointments.filter((a) => a.date === new Date().toISOString().split('T')[0]).length;

  function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.customerName) return;

    const newApt: FittingAppointment = {
      id: `apt-${Date.now()}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      orderNumber: formData.orderNumber || undefined,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      tailorName: formData.tailorName,
      notes: formData.notes,
      status: 'CONFIRMED',
    };

    setAppointments([newApt, ...appointments]);
    setIsNewApptOpen(false);
  }

  function handleSendWhatsAppReminder(apt: FittingAppointment) {
    const text = `Bonjour ${apt.customerName},\nNous vous confirmons votre rendez-vous pour : *${
      apt.type === 'PREMIER_ESSAYAGE' ? 'Premier Essayage' :
      apt.type === 'ESSAYAGE_FINAL' ? 'Essayage Final & Ajustement' :
      apt.type === 'RETOUCHE' ? 'Séance de Retouches' : 'Prise de mesures'
    }* le *${formatDate(apt.date)}* à *${apt.time}* à l'atelier *${currentWorkshop?.name || 'AtelierPro'}*.\n\n` +
    `Au plaisir de vous accueillir ! ✨`;

    const cleanPhone = apt.customerPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0F3B32]/10 text-[#0F3B32]">
              Planning & Agenda Atelier
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{currentWorkshop?.name || 'Atelier'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif tracking-tight mt-1">
            Agenda des Essayages & Livraisons
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Gérez les séances d'essayages sur-mesure, les prises de mesures et les dates de livraison des commandes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewApptOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#0F3B32]/15 hover:bg-[#0B2B26] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Planifier un Essayage</span>
          </button>
        </div>
      </div>

      {/* ── Section Switcher Tabs ── */}
      <div className="flex items-center gap-2 p-1 bg-[#F4EFE6] rounded-2xl w-fit border border-[#EBE7DF]">
        <button
          onClick={() => setSection('FITTINGS')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all',
            section === 'FITTINGS'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Scissors className="w-4 h-4 text-[#0F3B32]" />
          <span>Rendez-vous & Essayages ({appointments.length})</span>
        </button>

        <button
          onClick={() => setSection('DELIVERIES')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all',
            section === 'DELIVERIES'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Package className="w-4 h-4 text-emerald-700" />
          <span>Échéances & Livraisons ({ordersWithStatus.length})</span>
        </button>
      </div>

      {/* ── KPI Stats Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Essayages Aujourd'hui</span>
            <Scissors className="w-4 h-4 text-[#0F3B32]" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-serif">{apptsToday}</p>
          <p className="text-[11px] text-slate-500 mt-1">Séances programmées au salon</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Livraisons du Jour</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 font-serif">{countToday}</p>
          <p className="text-[11px] text-amber-600 mt-1">Commandes attendues</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prêtes à l'Atelier</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-serif">{countReady}</p>
          <p className="text-[11px] text-emerald-600 mt-1">En attente de retrait</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alertes de Retard</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700 font-serif">{countLate}</p>
          <p className="text-[11px] text-red-600 mt-1">{countLate > 0 ? 'Traitement urgent requis' : 'Aucun retard'}</p>
        </div>
      </div>

      {/* ── Content: FITTINGS VIEW ── */}
      {section === 'FITTINGS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0F3B32] text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-[10px] uppercase font-bold tracking-tight">HEURE</span>
                        <span className="text-xs font-black font-mono">{apt.time}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F3B32]">
                          {apt.type === 'PREMIER_ESSAYAGE' ? '1er Essayage' :
                           apt.type === 'ESSAYAGE_FINAL' ? 'Essayage Final' :
                           apt.type === 'RETOUCHE' ? 'Retouche & Finition' : 'Prise de mesures'}
                        </span>
                        <h3 className="text-base font-black text-slate-900 font-serif">
                          {apt.customerName}
                        </h3>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {formatDate(apt.date)}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-[#FBF9F5] rounded-2xl border border-[#EBE7DF] text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Tailleur en charge :
                      </span>
                      <span className="font-bold text-slate-800">{apt.tailorName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact :
                      </span>
                      <span className="font-semibold text-slate-800">{apt.customerPhone}</span>
                    </div>

                    {apt.notes && (
                      <p className="pt-1.5 border-t border-[#EBE7DF] text-[11px] text-slate-500 italic">
                        « {apt.notes} »
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EBE7DF] flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    {apt.orderNumber ? `Réf: ${apt.orderNumber}` : 'Visite libre'}
                  </span>

                  <button
                    onClick={() => handleSendWhatsAppReminder(apt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Rappel WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content: DELIVERIES VIEW ── */}
      {section === 'DELIVERIES' && (
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#EBE7DF] flex flex-wrap items-center justify-between gap-3 bg-[#FBF9F5]">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-[#EBE7DF] rounded-xl">
              {(['week', 'today', 'month', 'all'] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all',
                    view === v ? 'bg-[#0F3B32] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {v === 'week' ? 'Cette semaine' : v === 'today' ? "Aujourd'hui" : v === 'month' ? 'Ce mois' : 'Toutes'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {filteredOrders.length} commande(s) planifiée(s)
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                Aucune commande à livrer sur cette période sélectionnée.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="p-4 sm:p-5 hover:bg-[#FBF9F5] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0F3B32]/10 text-[#0F3B32] flex items-center justify-center flex-shrink-0 font-bold font-serif text-sm">
                      {order.customer?.full_name?.[0] || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800">{order.order_number}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', order.colorBadge)}>
                          {order.statusLabel}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-900 font-serif mt-0.5">
                        {order.customer?.full_name || 'Client'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.items?.map((i) => i.name).join(', ') || 'Confection sur-mesure'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Échéance</span>
                      <span className="text-xs font-bold text-slate-900">
                        {order.due_date ? formatDate(order.due_date) : 'Non définie'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Montant</span>
                      <span className="text-sm font-black text-[#0F3B32] font-serif">
                        {formatCurrency(order.total_amount, currentWorkshop?.currency_symbol)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Planifier un Essayage ── */}
      {isNewApptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EBE7DF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE7DF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center text-white">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-serif">Planifier un Essayage</h3>
                  <p className="text-xs text-slate-500">Séance d'ajustement en salon d'atelier</p>
                </div>
              </div>
              <button onClick={() => setIsNewApptOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du client *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fatou Sow..."
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+221 77 000 00 00"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type de séance</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as FittingAppointment['type'] })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                  >
                    <option value="PREMIER_ESSAYAGE">1er Essayage (Bâtis)</option>
                    <option value="RETOUCHE">Séance Retouches</option>
                    <option value="ESSAYAGE_FINAL">Essayage Final</option>
                    <option value="PRISE_DE_MESURES">Prise de Mesures</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Heure de RDV *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tailleur en charge</label>
                <input
                  type="text"
                  placeholder="Ex: Mamadou Diallo"
                  value={formData.tailorName}
                  onChange={(e) => setFormData({ ...formData, tailorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-semibold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes ou points d'ajustement</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Vérifier carrure et aisance hanche..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-[#EBE7DF] rounded-xl text-xs font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EBE7DF]">
                <button
                  type="button"
                  onClick={() => setIsNewApptOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#EBE7DF] text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0F3B32] text-white text-xs font-bold hover:bg-[#0B2B26] shadow-md shadow-[#0F3B32]/10"
                >
                  Confirmer le rendez-vous
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
