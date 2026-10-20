import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/components/products/product-form";
import { photoUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Modifier le produit" };

export default async function EditProductPage({ params }: PageProps<"/produits/[id]/modifier">) {
  await requirePage("products.manage");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Modifier « ${product.name} »`} back={{ href: `/produits/${id}`, label: "Fiche produit" }} />
      <ProductForm
        categories={categories ?? []}
        suppliers={suppliers ?? []}
        defaultMinStock={product.min_stock}
        product={{ ...product, photo_url: photoUrl(product.photo_path) }}
      />
    </>
  );
}
