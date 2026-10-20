import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { LinkButton } from "@/components/ui/button";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { OpenSessionForm } from "@/components/pos/open-session-form";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Caisse" };

export default async function PosPage({ searchParams }: PageProps<"/caisse">) {
  const user = await requirePage("sales.create");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: sessions }, { data: settings }] = await Promise.all([
    supabase.from("cash_sessions").select("id, register_name, opened_at, opened_by, profiles:opened_by(full_name)").eq("status", "open").order("opened_at"),
    supabase.from("shop_settings").select("shop_name, max_discount_percent").single(),
  ]);
  const open = (sessions ?? []) as unknown as { id: string; register_name: string; opened_at: string; opened_by: string; profiles: { full_name: string } | null }[];
  const requested = typeof sp.session === "string" ? open.find((s) => s.id === sp.session) : undefined;
  const session = requested ?? open.find((s) => s.opened_by === user.id) ?? (open.length === 1 ? open[0] : undefined);

  if (!session) {
    return (
      <>
        <PageHeader title="Caisse" description="Ouvrez une session de caisse pour commencer à encaisser." />
        <div className="grid gap-6 lg:grid-cols-2">
          {open.length > 1 ? (
            <Panel>
              <PanelHeader title="Sessions ouvertes" description="Choisissez la caisse sur laquelle vous travaillez." />
              <ul className="divide-y divide-sand">
                {open.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span>
                      <span className="block font-medium">{s.register_name}</span>
                      <span className="text-xs text-muted">Ouverte par {s.profiles?.full_name ?? "—"} le {formatDateTime(s.opened_at)}</span>
                    </span>
                    <LinkButton href={`/caisse?session=${s.id}`} size="sm">Utiliser</LinkButton>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {can(user.permissions, "cash.operate") ? (
            <Panel>
              <PanelHeader title="Ouvrir une caisse" description="Comptez le fond de caisse (espèces présentes dans le tiroir) avant d'ouvrir." />
              <OpenSessionForm />
            </Panel>
          ) : (
            <Panel className="p-5 text-sm text-muted">Aucune caisse n&apos;est ouverte. Demandez à un responsable d&apos;ouvrir la caisse.</Panel>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Caisse</h1>
      <PosTerminal
        session={{ id: session.id, register_name: session.register_name }}
        cashierName={user.fullName}
        shopName={settings?.shop_name ?? "Élégance by Aicha"}
        canDiscount={can(user.permissions, "sales.discount")}
        maxDiscountPercent={settings?.max_discount_percent ?? 0}
        isAdmin={user.role === "admin"}
        canCredit={can(user.permissions, "credit.sell")}
        canCustomers={can(user.permissions, "customers.view")}
        canCreateCustomer={can(user.permissions, "customers.manage")}
      />
    </>
  );
}
