import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Printer, Tags, Upload } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, SearchForm } from "@/components/ui/filters";
import { Select } from "@/components/ui/field";
import { photoUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Produits" };
const PAGE_SIZE = 30;

type Row = {
  id: string;
  name: string;
  brand: string | null;
  reference: string | null;
  sale_price: number;
  min_stock: number;
  status: string;
  photo_path: string | null;
  categories: { name: string } | null;
  product_variants: { id: string; stock_qty: number; min_stock: number | null; sale_price: number | null; is_active: boolean }[];
};

export default async function ProductsPage({ searchParams }: PageProps<"/produits">) {
  const user = await requirePage("products.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.filtre === "string" ? sp.filtre : "actifs";
  const category = typeof sp.categorie === "string" ? sp.categorie : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  let query = supabase
    .from("products")
    .select("id, name, brand, reference, sale_price, min_stock, status, photo_path, categories(name), product_variants(id, stock_qty, min_stock, sale_price, is_active)")
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  query = query.eq("status", filter === "archives" ? "archived" : "active");
  if (category) query = query.eq("category_id", category);
  if (filter === "faible" || filter === "rupture") {
    const { data: alerts } = await supabase
      .from("v_variant_stock")
      .select("product_id")
      .eq("is_sellable", true)
      .eq("stock_status", filter === "faible" ? "low" : "out");
    const ids = [...new Set((alerts ?? []).map((a) => a.product_id as string))];
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (q) {
    // Recherche par code-barres exact, sinon par nom / référence / marque.
    const { data: byBarcode } = await supabase.from("product_variants").select("product_id").or(`barcode.eq.${q.replace(/[,()]/g, "")},sku.ilike.${q.replace(/[,()%]/g, "")}`);
    const ids = (byBarcode ?? []).map((r) => r.product_id);
    const term = q.replace(/[,()%]/g, " ");
    query = ids.length
      ? query.or(`id.in.(${ids.join(",")}),name.ilike.%${term}%,reference.ilike.%${term}%,brand.ilike.%${term}%`)
      : query.or(`name.ilike.%${term}%,reference.ilike.%${term}%,brand.ilike.%${term}%`);
  }
  const { data, error } = await query;
  let rows = (data ?? []) as unknown as Row[];
  const hasNext = rows.length > PAGE_SIZE;
  rows = rows.slice(0, PAGE_SIZE);

  const withStock = rows.map((p) => {
    const variants = p.product_variants.filter((v) => v.is_active);
    const stock = variants.reduce((s, v) => s + v.stock_qty, 0);
    const low = variants.some((v) => v.stock_qty > 0 && v.stock_qty <= (v.min_stock ?? p.min_stock));
    const out = variants.some((v) => v.stock_qty <= 0);
    const prices = variants.map((v) => v.sale_price ?? p.sale_price);
    return { ...p, variants, stock, low, out, minPrice: Math.min(...prices, p.sale_price), maxPrice: Math.max(...prices, p.sale_price) };
  });
  const visible =
    filter === "faible" ? withStock.filter((p) => p.low) : filter === "rupture" ? withStock.filter((p) => p.out) : withStock;
  const manage = can(user.permissions, "products.manage");

  return (
    <>
      <PageHeader
        title="Produits"
        description="Catalogue, variantes, codes-barres et niveaux de stock."
        actions={
          <>
            <LinkButton href="/produits/etiquettes" variant="secondary">
              <Printer aria-hidden /> Étiquettes
            </LinkButton>
            {manage ? (
              <>
                <LinkButton href="/produits/categories" variant="secondary">
                  <Tags aria-hidden /> Catégories
                </LinkButton>
                <LinkButton href="/produits/import" variant="secondary">
                  <Upload aria-hidden /> Importer
                </LinkButton>
                <LinkButton href="/produits/nouveau">
                  <Plus aria-hidden /> Nouveau produit
                </LinkButton>
              </>
            ) : null}
          </>
        }
      />
      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-sand p-4">
          <SearchForm action="/produits" defaultValue={q} placeholder="Nom, référence, marque ou code-barres">
            <label htmlFor="filtre" className="sr-only">Filtre</label>
            <Select id="filtre" name="filtre" defaultValue={filter} className="w-auto">
              <option value="actifs">Produits actifs</option>
              <option value="faible">Stock faible</option>
              <option value="rupture">En rupture</option>
              <option value="archives">Archivés</option>
            </Select>
            <label htmlFor="categorie" className="sr-only">Catégorie</label>
            <Select id="categorie" name="categorie" defaultValue={category} className="w-auto">
              <option value="">Toutes catégories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </SearchForm>
        </div>
        {error ? (
          <EmptyState title="Chargement impossible" description="Vérifiez la connexion puis rechargez la page." />
        ) : visible.length === 0 ? (
          <EmptyState
            title={q || filter !== "actifs" ? "Aucun produit trouvé" : "Aucun produit pour l'instant"}
            description={q ? "Essayez un autre terme ou scannez le code-barres." : "Créez votre premier article ou importez votre catalogue depuis un fichier CSV."}
            action={manage && !q ? <LinkButton href="/produits/nouveau">Créer un produit</LinkButton> : undefined}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Produit</Th>
                <Th className="hidden md:table-cell">Catégorie</Th>
                <Th align="right">Prix</Th>
                <Th align="right">Stock</Th>
                <Th className="hidden sm:table-cell">État</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const img = photoUrl(p.photo_path);
                return (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/produits/${p.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="size-10 shrink-0 overflow-hidden rounded-md border border-sand bg-ivory">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">{p.name}</span>
                          <span className="block text-xs text-muted">
                            {[p.brand, p.reference, `${p.variants.length} variante${p.variants.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="hidden text-muted md:table-cell">{p.categories?.name ?? "—"}</Td>
                    <Td align="right">
                      {p.minPrice === p.maxPrice ? <Money value={p.minPrice} /> : (
                        <span><Money value={p.minPrice} /> – <Money value={p.maxPrice} /></span>
                      )}
                    </Td>
                    <Td align="right" className="font-medium">{p.stock}</Td>
                    <Td className="hidden sm:table-cell">
                      {p.status === "archived" ? <Badge>Archivé</Badge> : p.out ? <Badge tone="danger">Rupture</Badge> : p.low ? <Badge tone="warning">Stock faible</Badge> : <Badge tone="success">Disponible</Badge>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination basePath="/produits" page={page} hasNext={hasNext} params={{ q, filtre: filter, categorie: category }} />
      </Panel>
    </>
  );
}
