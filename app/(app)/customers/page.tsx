'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, Avatar, EmptyState, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { UserPlus, Users, Phone, ShoppingBag, Banknote, MessageCircle } from 'lucide-react';
import { WhatsAppSenderModal } from '@/components/whatsapp/whatsapp-sender-modal';
import type { Customer, Order } from '@/lib/types';

type EnrichedCustomer = Customer & {
  totalOrders: number;
  totalSpent: number;
  balance: number;
  lastOrder?: Order;
};

export default function CustomersPage() {
  const router = useRouter();
  const { customers, orders, payments, currentWorkshop } = useAppStore();
  const [search, setSearch] = useState('');
  const [whatsappCustomer, setWhatsappCustomer] = useState<EnrichedCustomer | null>(null);

  const ws = currentWorkshop;

  // Enrich customers with stats
  const enriched = useMemo(() => {
    return customers
      .filter((c) => !c.deleted_at)
      .map((c) => {
        const cOrders = orders.filter((o) => o.customer_id === c.id && !o.deleted_at);
        const totalSpent = cOrders.reduce((s, o) => s + o.total_amount, 0);
        const totalPaid = cOrders.reduce((s, o) => {
          const paid = payments.filter(p => p.order_id === o.id && p.status === 'CONFIRMED')
            .reduce((a, p) => a + p.amount, 0);
          return s + paid;
        }, 0);
        const balance = totalSpent - totalPaid;
        return { ...c, totalOrders: cOrders.length, totalSpent, balance, lastOrder: cOrders[0] };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [customers, orders, payments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return enriched;
    return enriched.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, [enriched, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        subtitle={`${enriched.length} client${enriched.length !== 1 ? 's' : ''}`}
        action={
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => router.push('/customers/new')}
            size="sm"
          >
            <span className="hidden sm:inline">Nouveau client</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par nom ou téléphone…"
      />

      {filtered.length === 0 && enriched.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Aucun client encore"
          description="Ajoutez votre premier client pour commencer à gérer vos commandes."
          action={
            <Button
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => router.push('/customers/new')}
            >
              Ajouter un client
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Aucun résultat"
          description={`Aucun client ne correspond à "${search}".`}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="w-full flex items-center gap-2 group"
            >
              <button
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="flex-1 text-left min-w-0"
              >
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <Avatar name={customer.full_name} src={customer.photo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{customer.full_name}</p>
                        {customer.balance > 0 && (
                          <span className="flex-shrink-0 text-xs bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 font-medium">
                            Dette
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="h-3 w-3" />
                          {formatPhone(customer.phone)}
                        </span>
                        {customer.totalOrders > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ShoppingBag className="h-3 w-3" />
                            {customer.totalOrders}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {customer.balance > 0 ? (
                        <>
                          <p className="text-xs text-orange-600 font-semibold">
                            {formatCurrency(customer.balance, ws?.currency_symbol)}
                          </p>
                          <p className="text-[10px] text-gray-400">à récupérer</p>
                        </>
                      ) : customer.totalSpent > 0 ? (
                        <>
                          <p className="text-xs text-gray-700 font-medium">
                            {formatCurrency(customer.totalSpent, ws?.currency_symbol)}
                          </p>
                          <p className="text-[10px] text-green-600">✓ Soldé</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Nouveau</p>
                      )}
                    </div>
                  </div>
                </Card>
              </button>

              {/* Quick WhatsApp Reminder Button */}
              {customer.phone && (
                <button
                  type="button"
                  onClick={() => setWhatsappCustomer(customer)}
                  className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all shadow-sm flex-shrink-0"
                  title="Envoyer un rappel ou notification WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsappCustomer && (
        <WhatsAppSenderModal
          open={!!whatsappCustomer}
          onClose={() => setWhatsappCustomer(null)}
          customer={whatsappCustomer}
          order={whatsappCustomer.lastOrder}
          workshop={ws}
          defaultTemplate={whatsappCustomer.balance > 0 ? 'balance_reminder' : 'delivery_reminder'}
        />
      )}
    </div>
  );
}
