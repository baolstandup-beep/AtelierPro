import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PurchaseBuilder } from "./purchase-builder";

export const metadata: Metadata = { title: "Nouvelle commande" };

export default async function NewPurchasePage({ searchParams }: PageProps<"/achats/nouveau">) {
  await requirePage("purchases.manage");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").eq("is_active", true).order("name");
  return (
    <>
      <PageHeader title="Nouvelle commande fournisseur" back={{ href: "/achats", label: "Achats" }} description="La commande n'affecte pas le stock : il est mis à jour à la réception." />
      {(suppliers ?? []).length === 0 ? (
        <Panel><EmptyState title="Aucun fournisseur" description="Créez d'abord un fournisseur." action={<LinkButton href="/fournisseurs">Fournisseurs</LinkButton>} /></Panel>
      ) : (
        <PurchaseBuilder suppliers={suppliers ?? []} defaultSupplier={typeof sp.fournisseur === "string" ? sp.fournisseur : undefined} />
      )}
    </>
  );
}
