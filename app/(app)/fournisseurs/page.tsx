import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SupplierDialog } from "@/components/forms/entity-forms";

export const metadata: Metadata = { title: "Fournisseurs" };

export default async function SuppliersPage() {
  const user = await requirePage("suppliers.manage", "purchases.manage");
  const supabase = await createClient();
  const [{ data: suppliers }, { data: balances }] = await Promise.all([
    supabase.from("suppliers").select("id, name, contact_name, phone, is_active").order("name"),
    can(user.permissions, "suppliers.manage", "reports.view") ? supabase.rpc("report_supplier_balances") : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map(((balances ?? []) as { supplier_id: string; received: number; paid: number; balance: number }[]).map((b) => [b.supplier_id, b]));
  const totalDebt = [...byId.values()].reduce((s, b) => s + Math.max(0, Number(b.balance)), 0);
  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description={<>Dettes fournisseurs (reçu − réglé) : <Money value={totalDebt} className="font-medium text-ink" /></>}
        actions={can(user.permissions, "suppliers.manage") ? <SupplierDialog /> : null}
      />
      <Panel>
        {(suppliers ?? []).length === 0 ? (
          <EmptyState title="Aucun fournisseur" description="Ajoutez vos fournisseurs pour passer des commandes et suivre vos dettes." />
        ) : (
          <Table>
            <thead><tr><Th>Fournisseur</Th><Th className="hidden sm:table-cell">Contact</Th><Th align="right">Reçu</Th><Th align="right">Réglé</Th><Th align="right">Solde dû</Th></tr></thead>
            <tbody>
              {(suppliers ?? []).map((s) => {
                const b = byId.get(s.id);
                return (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/fournisseurs/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                      {!s.is_active ? <Badge className="ml-2">Inactif</Badge> : null}
                    </Td>
                    <Td className="hidden text-muted sm:table-cell">{[s.contact_name, s.phone].filter(Boolean).join(" · ") || "—"}</Td>
                    <Td align="right"><Money value={b?.received ?? 0} /></Td>
                    <Td align="right"><Money value={b?.paid ?? 0} /></Td>
                    <Td align="right" className={(b?.balance ?? 0) > 0 ? "font-medium text-warning" : undefined}><Money value={b?.balance ?? 0} /></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
