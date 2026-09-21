'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingBag, Users, CreditCard, Banknote, AlertTriangle, ArrowRight, Plus, CalendarDays, Package, ChevronRight } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Nouvelle', MEASURED: 'Mesures', CUTTING: 'Coupe', SEWING: 'Couture', FINISHING: 'Finition', READY: 'Prêt', DELIVERED: 'Livré', ON_HOLD: 'En attente', CANCELLED: 'Annulée',
};
const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700', MEASURED: 'bg-violet-50 text-violet-700', CUTTING: 'bg-amber-50 text-amber-700', SEWING: 'bg-orange-50 text-orange-700', FINISHING: 'bg-cyan-50 text-cyan-700', READY: 'bg-emerald-50 text-emerald-700', DELIVERED: 'bg-slate-100 text-slate-600', ON_HOLD: 'bg-yellow-50 text-yellow-700', CANCELLED: 'bg-red-50 text-red-700',
};

function cleanName(name: string) {
  return !name || /^user\d+$/i.test(name.trim()) ? 'Utilisateur AtelierPro' : name.trim();
}

export default function DashboardPage() {
  const { getDashboardStats, orders, customers, currentWorkshop, currentUserName } = useAppStore();
  const stats = getDashboardStats();
  const activeOrders = orders.filter((order) => !order.deleted_at && !['DELIVERED', 'CANCELLED'].includes(order.status));
  const upcoming = [...activeOrders].sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity)).slice(0, 5);
  const recent = [...orders].filter((order) => !order.deleted_at).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  const totalRevenue = stats.paymentsThisMonth + stats.balanceToRecover;
  const recoveryRate = totalRevenue > 0 ? Math.round((stats.paymentsThisMonth / totalRevenue) * 100) : 0;
  const symbol = currentWorkshop?.currency_symbol;
  const firstName = cleanName(currentUserName).split(' ')[0];

  const kpis = [
    { label: 'Commandes en cours', value: String(activeOrders.length), href: '/orders', icon: ShoppingBag, tone: 'text-[var(--primary)] bg-[var(--primary-subtle)]' },
    { label: 'Clients actifs', value: String(customers.length || stats.totalCustomers), href: '/customers', icon: Users, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Encaissé ce mois', value: formatCurrency(stats.paymentsThisMonth, symbol), href: '/payments', icon: CreditCard, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Reste à percevoir', value: formatCurrency(stats.balanceToRecover, symbol), href: '/payments', icon: Banknote, tone: 'text-amber-700 bg-amber-50' },
  ];

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-dashed border-[#C8D1CC] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 text-sm font-medium text-[var(--primary)]">Bonjour {firstName}</p><h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[32px]">Vue d’ensemble de votre atelier</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Suivez vos commandes, clients, paiements et échéances.</p></div>
      <div className="flex gap-2"><Link href="/customers/new" className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#DCE3DF] bg-white px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"><Users className="h-4 w-4" /> Nouveau client</Link><Link href="/orders/new" className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"><Plus className="h-4 w-4" /> Nouvelle commande</Link></div>
    </header>

    <section className="flex flex-col gap-4 rounded-[14px] border border-[var(--border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-[var(--foreground)]">Plan Découverte</p><span className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">Actif</span></div><div className="mt-2 flex max-w-md items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8ECE9]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, (customers.length / 5) * 100)}%` }} /></div><span className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">{customers.length} client{customers.length > 1 ? 's' : ''} sur 5</span></div></div>
      <Link href="/pricing" className="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline">Voir les formules <ArrowRight className="h-4 w-4" /></Link>
    </section>

    {stats.ordersLate > 0 && <Link href="/orders?filter=late" className="flex items-center justify-between rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"><span className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4" /> {stats.ordersLate} commande{stats.ordersLate > 1 ? 's' : ''} en retard</span><ChevronRight className="h-4 w-4" /></Link>}

    <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => <Link key={kpi.label} href={kpi.href} className="rounded-[14px] border border-[var(--border)] bg-white p-5 transition-colors hover:border-[#C8D5CF] hover:bg-[#FDFEFD]"><div className="flex items-start justify-between gap-3"><p className="text-[13px] font-medium text-[var(--muted-foreground)]">{kpi.label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.tone}`}><kpi.icon className="h-4 w-4" /></span></div><p className="mt-5 break-words text-[clamp(1.45rem,2vw,2rem)] font-semibold tracking-[-0.035em] text-[var(--foreground)]">{kpi.value}</p></Link>)}
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><h2 className="text-base font-semibold">Commandes récentes</h2><p className="text-xs text-[var(--muted-foreground)]">Dernières commandes enregistrées</p></div><Link href="/orders" className="text-sm font-medium text-[var(--primary)] hover:underline">Voir tout</Link></div>
        {recent.length === 0 ? <div className="flex flex-col items-center px-5 py-12 text-center"><Package className="mb-3 h-8 w-8 text-[#AAB4AF]" /><p className="text-sm font-medium">Aucune commande en cours.</p><Link href="/orders/new" className="mt-3 text-sm font-medium text-[var(--primary)] hover:underline">Créer une commande</Link></div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#FAFBFA] text-xs text-[var(--muted-foreground)]"><tr><th className="px-5 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Commande</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium">Livraison</th><th className="px-4 py-3 text-right font-medium">Montant</th><th className="px-5 py-3 text-right font-medium">Solde</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{recent.map((order) => { const customer = customers.find((item) => item.id === order.customer_id); return <tr key={order.id} className="hover:bg-[#FAFBFA]"><td className="px-5 py-3.5 font-medium">{customer?.full_name || 'Client Atelier'}</td><td className="px-4 py-3.5"><Link href={`/orders/${order.id}`} className="text-[var(--primary)] hover:underline">{order.order_number || order.id.slice(0, 8)}</Link></td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLES[order.status]}`}>{STATUS_LABELS[order.status]}</span></td><td className="px-4 py-3.5 text-[#53615B]">{order.due_date ? formatDate(order.due_date) : 'Non planifiée'}</td><td className="px-4 py-3.5 text-right">{formatCurrency(order.total_amount || 0, symbol)}</td><td className="px-5 py-3.5 text-right font-medium">{formatCurrency(order.balance || 0, symbol)}</td></tr>; })}</tbody></table></div>}
      </div>

      <div className="rounded-[14px] border border-[var(--border)] bg-white p-5"><div className="flex items-start justify-between"><div><h2 className="text-base font-semibold">Recouvrement</h2><p className="text-xs text-[var(--muted-foreground)]">Part du chiffre d’affaires encaissée</p></div><CreditCard className="h-5 w-5 text-[var(--primary)]" /></div><p className="mt-7 text-[32px] font-semibold tracking-[-0.04em]">{recoveryRate}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8ECE9]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${recoveryRate}%` }} /></div><dl className="mt-6 space-y-3 border-t border-[var(--border)] pt-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-[var(--muted-foreground)]">CA total</dt><dd className="font-medium">{formatCurrency(totalRevenue, symbol)}</dd></div><div className="flex justify-between gap-4"><dt className="text-[var(--muted-foreground)]">Encaissé</dt><dd className="font-medium text-emerald-700">{formatCurrency(stats.paymentsThisMonth, symbol)}</dd></div><div className="flex justify-between gap-4"><dt className="text-[var(--muted-foreground)]">Reste à percevoir</dt><dd className="font-medium text-amber-700">{formatCurrency(stats.balanceToRecover, symbol)}</dd></div></dl></div>
    </section>

    <section className="rounded-[14px] border border-[var(--border)] bg-white"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><h2 className="text-base font-semibold">Prochaines livraisons</h2><p className="text-xs text-[var(--muted-foreground)]">Les échéances à traiter en priorité</p></div><CalendarDays className="h-5 w-5 text-[var(--primary)]" /></div>{upcoming.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">Aucune livraison planifiée.</p> : <div className="divide-y divide-[var(--border)]">{upcoming.map((order) => { const customer = customers.find((item) => item.id === order.customer_id); return <Link key={order.id} href={`/orders/${order.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-[#FAFBFA] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{customer?.full_name || 'Client Atelier'}</p><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{order.items?.[0]?.name || 'Tenue sur mesure'} · {order.order_number}</p></div><div className="flex items-center gap-5 text-xs"><span className="text-[#53615B]">{order.due_date ? formatDate(order.due_date) : 'Non planifiée'}</span><span className="font-medium text-amber-700">Solde {formatCurrency(order.balance || 0, symbol)}</span><ChevronRight className="h-4 w-4 text-[#8A9690]" /></div></Link>; })}</div>}</section>
  </div>;
}
