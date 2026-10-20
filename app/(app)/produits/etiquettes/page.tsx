import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { LabelPrinter, type LabelVariant } from "./label-printer";

export const metadata: Metadata = { title: "Étiquettes" };

export default async function LabelsPage({ searchParams }: PageProps<"/produits/etiquettes">) {
  await requirePage("products.view");
  const sp = await searchParams;
  const productId = typeof sp.produit === "string" ? sp.produit : undefined;
  const supabase = await createClient();
  let query = supabase
    .from("v_variant_stock")
    .select("variant_id, product_name, variant_label, barcode, sale_price, stock_qty, brand")
    .eq("is_sellable", true)
    .not("barcode", "is", null)
    .order("product_name")
    .limit(500);
  if (productId) query = query.eq("product_id", productId);
  const { data: shop } = await supabase.from("shop_settings").select("shop_name").single();
  const { data } = await query;
  return (
    <>
      <PageHeader
        title="Étiquettes code-barres"
        back={{ href: productId ? `/produits/${productId}` : "/produits", label: productId ? "Fiche produit" : "Produits" }}
        description="Choisissez les quantités puis imprimez. Les codes internes sont encodés en Code 128 : ce ne sont pas des codes GS1 officiels."
      />
      <LabelPrinter variants={(data ?? []) as LabelVariant[]} shopName={shop?.shop_name ?? "Élégance by Aicha"} preselect={!!productId} />
    </>
  );
}
