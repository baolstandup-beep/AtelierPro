import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/filters";

export const metadata: Metadata = { title: "Journal d'activité" };
const PAGE_SIZE = 50;

const ACTIONS: Record<string, string> = {
  "sale.discount": "Remise accordée", "sale.credit": "Vente à crédit", "sale.cancel": "Vente annulée", "return.create": "Retour",
  "cash_session.open": "Ouverture de caisse", "cash_session.close": "Clôture de caisse", "cash_session.correct": "Correction de caisse",
  "cash.cash_in": "Apport en caisse", "cash.cash_out": "Retrait de caisse", "expense.create": "Dépense", "expense.void": "Dépense annulée",
  "stock.entry": "Entrée de stock", "stock.exit": "Sortie de stock", "stock.adjustment": "Correction de stock", "stock.initial": "Stock initial",
  "inventory.start": "Inventaire démarré", "inventory.validate": "Inventaire validé", "inventory.cancel": "Inventaire abandonné",
  "purchase.create": "Commande fournisseur", "purchase.receive": "Réception", "purchase.cancel": "Commande annulée", "supplier.payment": "Règlement fournisseur",
  "customer.credit_payment": "Règlement de créance", "product.create": "Produit créé", "product.import": "Import de produits", "variant.create": "Variante ajoutée",
  "user.create": "Compte créé", "user.update": "Compte modifié", "user.password_reset": "Mot de passe réinitialisé", "settings.update": "Réglages modifiés",
};

export default async function AuditPage({ searchParams }: PageProps<"/journal">) {
  await requirePage("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, details, created_at, profiles:actor_id(full_name)")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  let rows = (data ?? []) as unknown as { id: number; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string; profiles: { full_name: string } | null }[];
  const hasNext = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);
  return (
    <>
      <PageHeader title="Journal d'activité" description="Opérations sensibles enregistrées automatiquement. Ce journal ne peut être ni modifié ni supprimé." />
      <Panel>
        {rows.length === 0 ? <EmptyState title="Journal vide" /> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Utilisateur</Th><Th>Action</Th><Th>Détails</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</Td>
                  <Td>{r.profiles?.full_name ?? "Système"}</Td>
                  <Td>{ACTIONS[r.action] ?? r.action}</Td>
                  <Td className="max-w-md text-xs break-words text-muted">
                    {Object.entries(r.details ?? {})
                      .filter(([k]) => !["before", "after"].includes(k))
                      .map(([k, v]) => `${k} : ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                      .join(" · ") || (r.action === "settings.update" ? "Voir l'historique des réglages" : "—")}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination basePath="/journal" page={page} hasNext={hasNext} params={{}} />
      </Panel>
    </>
  );
}
