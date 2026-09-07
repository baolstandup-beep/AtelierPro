'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Ruler,
  ShoppingBag,
  Kanban,
  CreditCard,
  Settings,
  Scissors,
  Menu,
  X,
  Plus,
  UserPlus,
  LogOut,
  Calendar,
  DollarSign,
  UserCheck,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/customers', icon: Users, label: 'Clients' },
  { href: '/measurements', icon: Ruler, label: 'Carnet de mesures' },
  { href: '/orders', icon: ShoppingBag, label: 'Commandes' },
  { href: '/production', icon: Kanban, label: 'Production' },
  { href: '/calendar', icon: Calendar, label: 'Calendrier' },
  { href: '/payments', icon: CreditCard, label: 'Paiements & Acomptes' },
  { href: '/expenses', icon: DollarSign, label: 'Dépenses' },
  { href: '/team', icon: UserCheck, label: 'Équipe' },
  { href: '/reports', icon: BarChart3, label: 'Rapports' },
  { href: '/settings', icon: Settings, label: 'Mon Atelier & Réglages' },
];

const MOBILE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/measurements', icon: Ruler, label: 'Mesures' },
  { href: '/orders', icon: ShoppingBag, label: 'Commandes' },
  { href: '/customers', icon: Users, label: 'Clients' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentWorkshop, currentUserName, signOut } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); setFabOpen(false); }, [pathname]);

  function handleSignOut() {
    signOut();
    router.push('/auth/login');
  }

  const fabActions = [
    { label: 'Nouvelle commande', href: '/orders/new', icon: ShoppingBag, color: 'bg-[#0F3B32]' },
    { label: 'Nouvelle mesure', href: '/measurements/new', icon: Ruler, color: 'bg-amber-600' },
    { label: 'Nouveau client', href: '/customers/new', icon: UserPlus, color: 'bg-blue-600' },
    { label: 'Nouveau paiement', href: '/payments/new', icon: CreditCard, color: 'bg-purple-600' },
    { label: 'Nouvelle dépense', href: '/expenses', icon: DollarSign, color: 'bg-red-600' },
  ];

  return (
    <div className="flex h-screen bg-[#FBF9F5] text-slate-900 overflow-hidden font-sans">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-white border-r border-[#EBE7DF] flex-shrink-0 shadow-sm">
        {/* Logo & Workshop Brand */}
        <div className="h-20 flex items-center gap-3 px-5 border-b border-[#EBE7DF]">
          <div className="w-10 h-10 rounded-2xl bg-[#0F3B32] flex items-center justify-center flex-shrink-0 shadow-md">
            <Scissors className="text-white w-5 h-5 -rotate-45" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 truncate font-serif">AtelierPro</p>
            <p className="text-xs text-[#0F3B32] font-semibold truncate">{currentWorkshop?.name || 'Mon Atelier'}</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all',
                  active
                    ? 'bg-[#0F3B32] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#F4EFE6] hover:text-slate-900'
                )}
              >
                <item.icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-emerald-300' : 'text-slate-400')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Workshop Profile & User Footer */}
        <div className="p-3 border-t border-[#EBE7DF] bg-[#FBF9F5]/60">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-[#EBE7DF] transition-all group">
            <div className="w-8 h-8 rounded-full bg-[#0F3B32] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
              {currentUserName?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUserName || 'Maître Tailleur'}</p>
              <p className="text-[10px] text-slate-500 truncate">{currentWorkshop?.city || 'Dakar'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-red-600 transition-colors p-1"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#FBF9F5] shadow-2xl flex flex-col border-r border-[#EBE7DF]">
            <div className="h-18 flex items-center justify-between px-5 border-b border-[#EBE7DF] bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F3B32] flex items-center justify-center">
                  <Scissors className="text-white w-4 h-4" />
                </div>
                <p className="text-base font-bold text-slate-900 font-serif">AtelierPro</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {currentWorkshop && (
              <div className="px-5 py-3.5 bg-[#E5EFEA] border-b border-[#0F3B32]/10">
                <p className="text-[10px] uppercase tracking-wider text-[#0F3B32] font-bold">Atelier actif</p>
                <p className="text-sm font-black text-[#0B2B26] font-serif">{currentWorkshop.name}</p>
              </div>
            )}

            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all',
                      active ? 'bg-[#0F3B32] text-white shadow-sm' : 'text-slate-700 hover:bg-[#F3EFE8]'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', active ? 'text-emerald-300' : 'text-slate-400')} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#EBE7DF] bg-white">
              <button
                onClick={() => { handleSignOut(); setSidebarOpen(false); }}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 w-full px-3 py-2 rounded-xl hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Workspace Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FBF9F5]">
        {/* Mobile header */}
        <header className="md:hidden h-16 bg-white border-b border-[#EBE7DF] flex items-center justify-between px-4 flex-shrink-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-700 hover:text-slate-900 p-2 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0F3B32] flex items-center justify-center">
              <Scissors className="text-white w-3.5 h-3.5" />
            </div>
            <p className="text-sm font-bold text-slate-900 font-serif truncate max-w-[180px]">
              {currentWorkshop?.name || 'AtelierPro'}
            </p>
          </div>
          <div className="w-8" />
        </header>

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-30">
        {/* FAB Quick Actions Popup */}
        {fabOpen && (
          <div className="absolute bottom-20 right-4 flex flex-col items-end gap-2.5 z-40">
            {fabActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2.5 bg-white border border-[#EBE7DF] rounded-2xl px-4 py-2.5 shadow-2xl animate-in slide-in-from-bottom-2"
              >
                <span className="text-xs font-bold text-slate-800">{action.label}</span>
                <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0', action.color)}>
                  <action.icon className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Backdrop */}
        {fabOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs" onClick={() => setFabOpen(false)} />
        )}

        {/* Bottom bar */}
        <nav className="relative bg-white border-t border-[#EBE7DF] flex items-center h-16 px-2 z-40 shadow-lg">
          {MOBILE_NAV.slice(0, 2).map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center gap-1 py-1.5"
              >
                <item.icon className={cn('h-5 w-5', active ? 'text-[#0F3B32]' : 'text-slate-400')} />
                <span className={cn('text-[10px] font-bold', active ? 'text-[#0F3B32]' : 'text-slate-400')}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Center FAB Button */}
          <div className="flex-shrink-0 -mt-5 mx-3">
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className={cn(
                'w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200',
                fabOpen ? 'bg-slate-800 rotate-45' : 'bg-[#0F3B32] hover:scale-105 text-white'
              )}
            >
              <Plus className="text-white w-6 h-6" />
            </button>
          </div>

          {MOBILE_NAV.slice(2).map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center gap-1 py-1.5"
              >
                <item.icon className={cn('h-5 w-5', active ? 'text-[#0F3B32]' : 'text-slate-400')} />
                <span className={cn('text-[10px] font-bold', active ? 'text-[#0F3B32]' : 'text-slate-400')}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-1.5"
          >
            <Menu className="h-5 w-5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
