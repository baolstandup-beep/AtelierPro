'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Ruler, ShoppingBag, Kanban, CreditCard, Settings,
  Scissors, Menu, X, LogOut, Calendar, DollarSign, UserCheck,
  BarChart3, Layers, Sparkles, MoreHorizontal,
} from 'lucide-react';

const NAV_GROUPS = [
  { label: 'Principal', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { href: '/customers', icon: Users, label: 'Clients' },
    { href: '/measurements', icon: Ruler, label: 'Carnet de mesures' },
    { href: '/orders', icon: ShoppingBag, label: 'Commandes' },
  ]},
  { label: 'Atelier', items: [
    { href: '/catalogue', icon: Sparkles, label: 'Modèles & Coupes' },
    { href: '/tissus', icon: Layers, label: 'Tissus & Stocks' },
    { href: '/production', icon: Kanban, label: 'Production' },
    { href: '/calendar', icon: Calendar, label: 'Calendrier & Essayages' },
  ]},
  { label: 'Finances', items: [
    { href: '/payments', icon: CreditCard, label: 'Paiements & Acomptes' },
    { href: '/expenses', icon: DollarSign, label: 'Dépenses' },
  ]},
  { label: 'Gestion', items: [
    { href: '/team', icon: UserCheck, label: 'Équipe' },
    { href: '/reports', icon: BarChart3, label: 'Rapports' },
  ]},
  { label: 'Paramètres', items: [
    { href: '/settings', icon: Settings, label: 'Mon atelier & réglages' },
  ]},
];

function displayName(name: string) {
  if (!name || /^user\d+$/i.test(name.trim())) return 'Utilisateur AtelierPro';
  return name.trim();
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentWorkshop, currentUserName, currentUserRole, signOut } = useAppStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const name = displayName(currentUserName);
  const role = currentUserRole === 'OWNER' ? 'Propriétaire' : currentUserRole === 'MANAGER' ? 'Administrateur' : 'Membre';

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
    router.refresh();
  }

  return <>
    <div className="flex h-[72px] items-center gap-3 border-b border-[var(--border)] px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--primary)] text-white">
        <Scissors className="h-[18px] w-[18px] -rotate-45" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold tracking-tight text-[var(--foreground)]">AtelierPro</p>
        <p className="truncate text-xs text-[var(--muted-foreground)]">{currentWorkshop?.name || 'Mon atelier'}</p>
      </div>
    </div>

    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
      {NAV_GROUPS.map((group) => <div key={group.label} className="mb-5 last:mb-0">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8A9690]">{group.label}</p>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return <Link key={item.href} href={item.href} onClick={onNavigate} className={cn(
              'flex h-10 items-center gap-3 rounded-[9px] px-3 text-[13px] font-medium transition-colors duration-150',
              active ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'text-[#53615B] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            )}>
              <item.icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'text-[var(--primary)]' : 'text-[#7C8983]')} />
              <span className="truncate">{item.label}</span>
            </Link>;
          })}
        </div>
      </div>)}
    </nav>

    <div className="relative border-t border-[var(--border)] p-3">
      {userMenuOpen && <div className="absolute bottom-[76px] left-3 right-3 rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,32,27,.12)]">
        <Link href="/settings" onClick={onNavigate} className="flex h-9 items-center rounded-lg px-3 text-sm text-[#53615B] hover:bg-[var(--muted)]">Mon profil</Link>
        <Link href="/settings" onClick={onNavigate} className="flex h-9 items-center rounded-lg px-3 text-sm text-[#53615B] hover:bg-[var(--muted)]">Paramètres</Link>
        <button onClick={() => void handleSignOut()} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Se déconnecter</button>
      </div>}
      <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-expanded={userMenuOpen} className="flex w-full items-center gap-3 rounded-[10px] p-2 text-left hover:bg-[var(--muted)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-xs font-semibold text-[var(--primary)]">{name.charAt(0).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{name}</p><p className="text-[11px] text-[var(--muted-foreground)]">{role}</p></div>
        <MoreHorizontal className="h-4 w-4 text-[#8A9690]" />
      </button>
    </div>
  </>;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentWorkshop, currentUserName } = useAppStore();
  const name = displayName(currentUserName);

  return <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-white lg:flex"><SidebarContent /></aside>

    {sidebarOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Fermer le menu" className="absolute inset-0 bg-[#10201B]/35" onClick={() => setSidebarOpen(false)} />
      <aside className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-2xl">
        <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[#66736D] hover:bg-[var(--muted)]"><X className="h-5 w-5" /></button>
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </aside>
    </div>}

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-4 lg:hidden">
        <button aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-[#53615B] hover:bg-[var(--muted)]"><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 text-center"><p className="text-sm font-semibold">AtelierPro</p><p className="max-w-[180px] truncate text-[11px] text-[var(--muted-foreground)]">{currentWorkshop?.name || 'Mon atelier'}</p></div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-xs font-semibold text-[var(--primary)]">{name.charAt(0).toUpperCase()}</div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  </div>;
}
