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
import { ClientLimitModal } from '@/components/billing/client-limit-modal';
import { PlanQuotaWidget } from '@/components/billing/plan-quota-widget';
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
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

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

  function handleNewCustomerClick() {
    if (enriched.length >= 5) {
      setIsLimitModalOpen(true);
    } else {
      router.push('/customers/new');
    }
  }

  return (
    <div className="space-y-5">
      <ClientLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        currentCount={enriched.length}
      />

      <PlanQuotaWidget
        currentCount={enriched.length}
        onUpgradeClick={() => setIsLimitModalOpen(true)}
      />

      <PageHeader
        title="Clients"
        subtitle={`${enriched.length} client${enriched.length !== 1 ? 's' : ''}`}
        action={
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={handleNewCustomerClick}
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
                <div className="bg-white dark:bg-[#121A16] p-4 rounded-2xl border border-[#EBE7DF] dark:border-white/10 shadow-[0_4px_20px_rgba(15,59,50,0.02)] hover:shadow-[0_8px_24px_rgba(15,59,50,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <Avatar name={customer.full_name} src={customer.photo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-[#111827] dark:text-white truncate">{customer.full_name}</p>
                        {customer.balance > 0 && (
                          <span className="flex-shrink-0 text-[10px] uppercase tracking-wider bg-amber-50 text-[#D97706] border border-amber-200/50 rounded-full px-2 py-0.5 font-bold">
                            Dette
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-[#8A7A65]">
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhone(customer.phone)}
                        </span>
                        {customer.totalOrders > 0 && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-[#8A7A65]">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {customer.totalOrders} {customer.totalOrders > 1 ? 'commandes' : 'commande'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 border-l border-slate-100 dark:border-white/5 pl-4 ml-2">
                      {customer.balance > 0 ? (
                        <>
                          <p className="text-sm text-[#D97706] font-bold font-mono">
                            {formatCurrency(customer.balance, ws?.currency_symbol)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">À RÉCUPÉRER</p>
                        </>
                      ) : customer.totalSpent > 0 ? (
                        <>
                          <p className="text-sm text-[#0F3B32] dark:text-white font-bold font-mono">
                            {formatCurrency(customer.totalSpent, ws?.currency_symbol)}
                          </p>
                          <p className="text-[10px] text-[#2E9D74] font-medium flex items-center justify-end gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2E9D74]" />
                            SOLDÉ
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium">Nouveau client</p>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Quick WhatsApp Reminder Button */}
              {customer.phone && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setWhatsappCustomer(customer); }}
                  className="p-3 rounded-2xl bg-[#EBF7F1] dark:bg-[#0F3B32] hover:bg-[#2E9D74] text-[#2E9D74] dark:text-[#A3E635] hover:text-white transition-all shadow-sm flex-shrink-0 opacity-70 hover:opacity-100 group-hover:scale-105"
                  title="Envoyer un rappel ou notification WhatsApp"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
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
