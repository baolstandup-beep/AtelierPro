import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CASH_MOVEMENT_LABELS, formatDateTime, PAYMENT_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { PrintButton } from "@/components/print/print-button";
import { CashMovementForm, CloseSessionForm, CorrectionForm } from "./session-forms";

export const metadata: Metadata = { title: "Session de caisse" };

interface Totals {
  expected_cash: number;
  cash_by_type: Record<string, number>;
  payments_by_method: Record<string, number>;
  refunds_by_method: Record<string, number>;
  sales_count: number;
  sales_total: number;
  credit_granted: number;
}

export default async function CashSessionPage({ params }: PageProps<"/sessions-caisse/[id]">) {
  const user = await requirePage("cash.operate", "cash.close", "reports.view");
  const { id } = await params;
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("cash_sessions")
    .select("*, opener:profiles!cash_sessions_opened_by_fkey(full_name), closer:profiles!cash_sessions_closed_by_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();
  const [{ data: liveTotals }, { data: movements }, { data: shop }] = await Promise.all([
    supabase.rpc("cash_session_totals", { p_session_id: id }),
    supabase.from("cash_movements").select("id, type, amount, reason, created_at, profiles:created_by(full_name)").eq("cash_session_id", id).order("created_at"),
    supabase.from("shop_settings").select("shop_name").single(),
  ]);
  const totals = liveTotals as Totals;
  const open = session.status === "open";
  const electronic = Object.entries(totals.payments_by_method ?? {}).filter(([m]) => m !== "cash" && m !== "store_credit");
  type Move = { id: string; type: string; amount: number; reason: string | null; created_at: string; profiles: { full_name: string } | null };

  return (
    <>
      <PageHeader
        title={`${session.register_name}`}
        back={{ href: "/sessions-caisse", label: "Sessions de caisse" }}
        description={`${shop?.shop_name ?? ""} · Ouverte le ${formatDateTime(session.opened_at)} par ${session.opener?.full_name ?? "—"}${session.closed_at ? ` · Clôturée le ${formatDateTime(session.closed_at)} par ${session.closer?.full_name ?? "—"}` : ""}`}
        actions={<><Badge tone={open ? "gold" : "neutral"}>{open ? "Ouverte" : "Clôturée"}</Badge><PrintButton label="Imprimer le rapport" /></>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventes" value={<Money value={totals.sales_total} />} hint={`${totals.sales_count} vente(s)`} />
        <Stat label="Espèces théoriques" value={<Money value={totals.expected_cash} />} hint="Fond + entrées − sorties" />
        <Stat label="Crédit accordé" value={<Money value={totals.credit_granted} />} hint="Non encaissé" />
        {open ? (
          <Stat label="Fond initial" value={<Money value={session.opening_float} />} />
        ) : (
          <Stat label="Écart de caisse" value={<Money value={session.difference} signed />} tone={session.difference ? "danger" : undefined} hint={session.difference_reason ?? undefined} />
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title="Espèces" description="Seules les espèces passent par le tiroir-caisse." />
            <Table>
              <thead><tr><Th>Heure</Th><Th>Mouvement</Th><Th align="right">Montant</Th></tr></thead>
              <tbody>
                {((movements ?? []) as unknown as Move[]).map((m) => (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</Td>
                    <Td>{CASH_MOVEMENT_LABELS[m.type]}<span className="block text-xs text-muted">{m.reason}{m.profiles ? ` — ${m.profiles.full_name}` : ""}</span></Td>
                    <Td align="right"><Money value={m.amount} signed /></Td>
                  </Tr>
                ))}
                <Tr>
                  <Td colSpan={2} className="font-medium">Solde théorique</Td>
                  <Td align="right" className="font-semibold"><Money value={totals.expected_cash} /></Td>
                </Tr>
                {!open ? (
                  <>
                    <Tr><Td colSpan={2}>Comptage réel</Td><Td align="right"><Money value={session.counted_cash} /></Td></Tr>
                    <Tr><Td colSpan={2}>Écart{session.difference_reason ? ` — ${session.difference_reason}` : ""}</Td><Td align="right" className={session.difference ? "text-danger" : undefined}><Money value={session.difference} signed /></Td></Tr>
                  </>
                ) : null}
              </tbody>
            </Table>
          </Panel>
          <Panel>
            <PanelHeader title="Paiements électroniques et remboursements" description="Suivis séparément des espèces : à rapprocher des relevés Wave / Orange Money." />
            <Table>
              <thead><tr><Th>Moyen</Th><Th align="right">Reçu</Th><Th align="right">Remboursé</Th></tr></thead>
              <tbody>
                {electronic.length === 0 && Object.keys(totals.refunds_by_method ?? {}).length === 0 ? (
                  <Tr><Td colSpan={3} className="text-muted">Aucun paiement électronique.</Td></Tr>
                ) : null}
                {[...new Set([...electronic.map(([m]) => m), ...Object.keys(totals.refunds_by_method ?? {}).filter((m) => m !== "cash")])].map((m) => (
                  <Tr key={m}><Td>{PAYMENT_LABELS[m]}</Td><Td align="right"><Money value={totals.payments_by_method?.[m] ?? 0} /></Td><Td align="right"><Money value={totals.refunds_by_method?.[m] ?? 0} /></Td></Tr>
                ))}
              </tbody>
            </Table>
          </Panel>
          {session.closing_notes ? <Panel className="p-5 text-sm">Notes de clôture : {session.closing_notes}</Panel> : null}
        </div>
        <div className="no-print flex flex-col gap-6">
          {open && can(user.permissions, "cash.operate") ? (
            <Panel>
              <PanelHeader title="Apport ou retrait" />
              <CashMovementForm sessionId={id} />
            </Panel>
          ) : null}
          {open && can(user.permissions, "cash.close") ? (
            <Panel>
              <PanelHeader title="Clôturer la caisse" description="Comptez les espèces du tiroir. Tout écart doit être expliqué." />
              <CloseSessionForm sessionId={id} expected={totals.expected_cash} />
            </Panel>
          ) : null}
          {!open && can(user.permissions, "cash.correct") ? (
            <Panel>
              <PanelHeader title="Correction exceptionnelle" description="Session verrouillée : toute correction est motivée et inscrite au journal." />
              <CorrectionForm sessionId={id} />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
