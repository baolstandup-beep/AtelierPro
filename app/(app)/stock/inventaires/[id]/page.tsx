import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { CountSheet } from "./count-sheet";
import { cancelInventory, validateInventory } from "@/lib/actions/stock";

export const metadata: Metadata = { title: "Inventaire" };

export default async function InventoryPage({ params }: PageProps<"/stock/inventaires/[id]">) {
  await requirePage("stock.manage");
  const { id } = await params;
  const supabase = await createClient();
  const { data: inv } = await supabase.from("inventories").select("id, name, status, started_at, validated_at").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const { data: lines } = await supabase
    .from("inventory_lines")
    .select("id, expected_qty, counted_qty, variant:product_variants(label, barcode, products(name))")
    .eq("inventory_id", id)
    .order("id");
  const rows = ((lines ?? []) as unknown as { id: string; expected_qty: number; counted_qty: number | null; variant: { label: string; barcode: string | null; products: { name: string } } }[])
    .map((l) => ({ id: l.id, expected: l.expected_qty, counted: l.counted_qty, name: l.variant.products.name, label: l.variant.label, barcode: l.variant.barcode }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr") || a.label.localeCompare(b.label, "fr"));
  const counted = rows.filter((r) => r.counted !== null);
  const diffs = counted.filter((r) => r.counted !== r.expected);
  const editable = inv.status === "in_progress";
  return (
    <>
      <PageHeader
        title={inv.name}
        back={{ href: "/stock/inventaires", label: "Inventaires" }}
        description={`Démarré le ${formatDateTime(inv.started_at)} · ${counted.length}/${rows.length} article(s) compté(s) · ${diffs.length} écart(s)`}
        actions={
          editable ? (
            <>
              <ConfirmAction action={cancelInventory} hidden={{ id }} trigger="Abandonner" title="Abandonner l'inventaire ?" description="Aucun stock ne sera modifié." confirmLabel="Abandonner" />
              <ConfirmAction
                action={validateInventory}
                hidden={{ id }}
                trigger="Valider l'inventaire"
                triggerVariant="primary"
                variant="primary"
                title="Valider l'inventaire ?"
                description={`${diffs.length} article(s) seront corrigés par un mouvement « Inventaire ». Les articles non comptés restent inchangés. Enregistrez vos derniers comptages avant de valider.`}
                confirmLabel="Valider"
              />
            </>
          ) : <Badge tone={inv.status === "validated" ? "success" : "neutral"}>{inv.status === "validated" ? `Validé le ${formatDateTime(inv.validated_at)}` : "Abandonné"}</Badge>
        }
      />
      <Panel>
        <CountSheet inventoryId={id} rows={rows} editable={editable} />
      </Panel>
    </>
  );
}
