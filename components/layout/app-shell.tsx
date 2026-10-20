"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { NavItem } from "@/lib/permissions";
import { NAV_ICONS } from "./nav-icons";
import { NetworkStatus } from "./network-status";
import { signOut } from "@/lib/actions/auth";

interface ShellProps {
  items: NavItem[];
  user: { fullName: string; roleLabel: string };
  children: React.ReactNode;
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="block leading-none" aria-label="Élégance by Aicha, accueil">
      <span className={cn("font-display font-medium tracking-tight text-ivory", compact ? "text-xl" : "text-2xl")}>Élégance</span>
      <span className="mt-1 block text-xs text-gold">by Aicha</span>
    </Link>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-1.5 px-3 text-xs text-ivory/45">{group}</p>
          <ul className="flex flex-col gap-0.5">
            {items
              .filter((i) => i.group === group)
              .map((item) => {
                const Icon = NAV_ICONS[item.icon];
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active ? "bg-ivory/10 text-ivory" : "text-ivory/70 hover:bg-ivory/5 hover:text-ivory",
                      )}
                    >
                      {active ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" aria-hidden /> : null}
                      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ user }: { user: ShellProps["user"] }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-ivory/10 pt-4">
      <Link href="/compte" className="min-w-0 rounded px-1 hover:bg-ivory/5">
        <p className="truncate text-sm text-ivory">{user.fullName}</p>
        <p className="truncate text-xs text-ivory/50">{user.roleLabel}</p>
      </Link>
      <form action={signOut}>
        <button className="rounded p-2 text-ivory/60 hover:bg-ivory/10 hover:text-ivory" aria-label="Se déconnecter" title="Se déconnecter">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function AppShell({ items, user, children }: ShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const mobileItems = items.filter((i) => i.mobile).slice(0, 4);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 bg-ink px-3 py-6 lg:flex">
        <div className="px-3">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks items={items} />
        </div>
        <div className="px-1">
          <UserBlock user={user} />
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        <Brand compact />
        <button onClick={() => setOpen(true)} className="rounded p-2 text-ivory" aria-label="Ouvrir le menu" aria-expanded={open}>
          <Menu className="size-5" />
        </button>
      </header>

      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col gap-6 bg-ink px-3 py-5">
            <div className="flex items-center justify-between px-3">
              <Brand compact />
              <button onClick={() => setOpen(false)} className="rounded p-2 text-ivory" aria-label="Fermer le menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </div>
            <UserBlock user={user} />
          </div>
        </div>
      ) : null}

      <NetworkStatus />
      <main className="mx-auto w-full max-w-7xl px-4 pt-5 pb-24 md:px-8 md:pt-8 lg:pb-10">{children}</main>

      {mobileItems.length > 0 ? (
        <nav
          aria-label="Navigation rapide"
          className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-sand bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
          style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
        >
          {mobileItems.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-ink" : "text-muted")}
              >
                {Icon ? <Icon className={cn("size-5", active && "text-gold-deep")} aria-hidden /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
