import type { Metadata } from "next";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await requirePage("products.manage");
  const supabase = await createClient();
  const [{ data: categories }, { data: suppliers }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("shop_settings").select("default_min_stock").single(),
  ]);
  return (
    <>
      <PageHeader title="Nouveau produit" back={{ href: "/produits", label: "Produits" }} />
      <ProductForm categories={categories ?? []} suppliers={suppliers ?? []} defaultMinStock={settings?.default_min_stock ?? 2} />
    </>
  );
}
