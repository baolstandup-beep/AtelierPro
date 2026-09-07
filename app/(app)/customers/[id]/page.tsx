'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, Avatar, SectionHeader, EmptyState } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, OrderStatusBadge } from '@/components/ui/tabs';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency, formatDate, formatPhone, formatTimeAgo } from '@/lib/utils';
import {
  ArrowLeft, Phone, MapPin, Edit, Archive, ShoppingBag, CreditCard,
  Ruler, StickyNote, Plus, ChevronRight, MessageCircle, Send, Trash2
} from 'lucide-react';
import type { GenderType, MeasurementProfile } from '@/lib/types';
import { WhatsAppSenderModal } from '@/components/whatsapp/whatsapp-sender-modal';

const GENDER_OPTIONS = [
  { value: '', label: 'Non précisé' },
  { value: 'MALE', label: 'Homme' },
  { value: 'FEMALE', label: 'Femme' },
  { value: 'OTHER', label: 'Autre' },
];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getCustomer, updateCustomer, archiveCustomer, orders, payments, getMeasurementProfiles, deleteMeasurementProfile, currentWorkshop } = useAppStore();
  const { success, error: showError } = useToast();

  const customer = getCustomer(id);
  const ws = currentWorkshop;

  const [tab, setTab] = useState('orders');
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [measurementToDelete, setMeasurementToDelete] = useState<MeasurementProfile | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    city: customer?.city || '',
    gender: (customer?.gender || '') as GenderType | '',
    notes: customer?.notes || '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const customerOrders = useMemo(() =>
    orders.filter((o) => o.customer_id === id && !o.deleted_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders, id]
  );

  const customerPayments = useMemo(() =>
    payments.filter((p) => p.customer_id === id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [payments, id]
  );

  const measurementProfiles = getMeasurementProfiles(id);

  const totalSpent = customerOrders.reduce((s, o) => s + o.total_amount, 0);
  const totalPaid = customerOrders.reduce((s, o) => {
    const paid = payments.filter(p => p.order_id === o.id && p.status === 'CONFIRMED')
      .reduce((a, p) => a + p.amount, 0);
    return s + paid;
  }, 0);
  const balance = totalSpent - totalPaid;

  if (!customer || customer.deleted_at) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
          Retour
        </Button>
        <EmptyState title="Client introuvable" description="Ce client n'existe pas ou a été archivé." />
      </div>
    );
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.full_name.trim() || !editForm.phone.trim()) return;
    setEditLoading(true);
    try {
      updateCustomer(id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        city: editForm.city.trim() || undefined,
        gender: editForm.gender as GenderType || undefined,
        notes: editForm.notes.trim() || undefined,
      });
      success('Client mis à jour !');
      setEditOpen(false);
    } catch {
      showError('Erreur', 'Impossible de modifier le client.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleArchive() {
    setArchiveLoading(true);
    try {
      archiveCustomer(id);
      success('Client archivé');
      router.push('/customers');
    } catch {
      showError('Erreur', "Impossible d'archiver le client.");
    } finally {
      setArchiveLoading(false);
    }
  }

  const TABS = [
    { value: 'orders', label: 'Commandes', count: customerOrders.length },
    { value: 'measurements', label: 'Mesures', count: measurementProfiles.length },
    { value: 'payments', label: 'Paiements', count: customerPayments.length },
    { value: 'notes', label: 'Notes' },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back */}
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.back()}>
        Clients
      </Button>

      {/* Header card */}
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={customer.full_name} src={customer.photo_url} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{customer.full_name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(customer.phone)}
            </div>
            {(customer.address || customer.city) && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {[customer.address, customer.city].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" leftIcon={<Edit className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>
              Modifier
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{customerOrders.length}</p>
            <p className="text-xs text-gray-500">Commandes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpent, ws?.currency_symbol)}</p>
            <p className="text-xs text-gray-500">Total dépensé</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-700'}`}>
              {formatCurrency(balance, ws?.currency_symbol)}
            </p>
            <p className="text-xs text-gray-500">{balance > 0 ? 'Dette' : 'Soldé'}</p>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button
          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
          leftIcon={<MessageCircle className="h-4 w-4 fill-white" />}
          onClick={() => setWhatsappModalOpen(true)}
          fullWidth
        >
          WhatsApp & Rappels
        </Button>
        <Button
          variant="secondary"
          leftIcon={<ShoppingBag className="h-4 w-4" />}
          onClick={() => router.push(`/orders/new?customer=${id}`)}
          fullWidth
        >
          Nouvelle commande
        </Button>
        <Button
          variant="outline"
          leftIcon={<Ruler className="h-4 w-4" />}
          onClick={() => router.push(`/measurements/new?customerId=${id}`)}
          fullWidth
        >
          Prendre mesures
        </Button>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} value={tab} onChange={setTab} variant="underline" />

      {/* Tab content */}
      {tab === 'orders' && (
        <div className="space-y-2">
          {customerOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Aucune commande"
              description="Ce client n'a pas encore de commande."
              action={
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => router.push(`/orders/new?customer=${id}`)}>
                  Créer une commande
                </Button>
              }
            />
          ) : (
            customerOrders.map((order) => {
              const isLate = order.due_date && new Date(order.due_date) < new Date() &&
                order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
              const orderBalance = order.total_amount - payments
                .filter(p => p.order_id === order.id && p.status === 'CONFIRMED')
                .reduce((s, p) => s + p.amount, 0);
              return (
                <button key={order.id} onClick={() => router.push(`/orders/${order.id}`)} className="w-full text-left">
                  <Card hover padding="sm">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                          <OrderStatusBadge status={order.status} isLate={!!isLate} size="sm" />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.items?.map(i => i.name).join(', ')} · Livraison: {formatDate(order.due_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount, ws?.currency_symbol)}</p>
                        {orderBalance > 0 && (
                          <p className="text-xs text-orange-600">Reste: {formatCurrency(orderBalance, ws?.currency_symbol)}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </Card>
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === 'measurements' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => router.push(`/customers/${id}/measurements/new`)}>
              Nouvelle prise de mesures
            </Button>
          </div>
          {measurementProfiles.length === 0 ? (
            <EmptyState
              icon={<Ruler className="h-5 w-5" />}
              title="Aucune mesure"
              description="Enregistrez les mesures de ce client pour les utiliser dans les commandes."
            />
          ) : (
            measurementProfiles.map((profile) => (
              <Card key={profile.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.label || 'Mesures'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(profile.taken_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeasurementToDelete(profile)}
                    title="Supprimer cette mesure"
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {profile.values?.slice(0, 8).map((v) => (
                    <div key={v.id} className="flex justify-between text-xs">
                      <span className="text-gray-500">{v.measurement_type?.name}:</span>
                      <span className="font-medium text-gray-900">{v.value} {v.unit}</span>
                    </div>
                  ))}
                  {profile.values && profile.values.length > 8 && (
                    <p className="text-xs text-gray-400 col-span-2">+{profile.values.length - 8} autres mesures</p>
                  )}
                </div>
                {profile.notes && (
                  <p className="text-xs text-gray-500 mt-2 border-t border-gray-50 pt-2">{profile.notes}</p>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {customerPayments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-5 w-5" />}
              title="Aucun paiement"
              description="Aucun paiement enregistré pour ce client."
            />
          ) : (
            customerPayments.map((payment) => (
              <Card key={payment.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount, ws?.currency_symbol)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.method.replace('_', ' ')} · {formatDate(payment.payment_date)}
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                    {payment.status === 'CONFIRMED' ? 'Confirmé' : payment.status}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'notes' && (
        <Card>
          {customer.notes ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Notes internes</p>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          ) : (
            <EmptyState
              icon={<StickyNote className="h-5 w-5" />}
              title="Aucune note"
              description="Modifiez le client pour ajouter des notes."
              action={
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  Ajouter une note
                </Button>
              }
            />
          )}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Archive className="h-3.5 w-3.5" />}
              onClick={() => setArchiveOpen(true)}
            >
              Archiver ce client
            </Button>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le client"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button fullWidth loading={editLoading} onClick={handleEdit as any}>Enregistrer</Button>
          </div>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Nom complet" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
          <Input label="Téléphone" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ville" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
            <Select label="Genre" options={GENDER_OPTIONS} value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as GenderType })} />
          </div>
          <Input label="Adresse" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          <Textarea label="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
        </form>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        title="Archiver ce client ?"
        description="Le client et ses données seront archivés. Vous pourrez les restaurer plus tard."
        confirmLabel="Archiver"
        loading={archiveLoading}
      />

      {/* Delete Measurement Confirm */}
      <Modal
        open={!!measurementToDelete}
        onClose={() => setMeasurementToDelete(null)}
        title="Supprimer la mesure"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer définitivement cette fiche de mesure{' '}
            {measurementToDelete?.label ? <strong>« {measurementToDelete.label} »</strong> : ''} ?
          </p>
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            Cette action est irréversible.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMeasurementToDelete(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                if (measurementToDelete) {
                  deleteMeasurementProfile(measurementToDelete.id);
                  setMeasurementToDelete(null);
                  success('Mesure supprimée', 'La fiche de mesure a été supprimée avec succès.');
                }
              }}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* WhatsApp Modal */}
      {customer && (
        <WhatsAppSenderModal
          open={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
          customer={customer}
          order={customerOrders[0]}
          workshop={ws}
          defaultTemplate={balance > 0 ? 'balance_reminder' : 'delivery_reminder'}
        />
      )}
    </div>
  );
}
