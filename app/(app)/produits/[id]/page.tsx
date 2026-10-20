import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Printer } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, STOCK_MOVEMENT_LABELS } from "@/lib/format";
import { photoUrl } from "@/lib/storage";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StockBadge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { AddVariantForm, AdjustStockButton, EditVariantButton, type VariantRow } from "@/components/products/variant-actions";
import { GenerateBarcodeButton } from "@/components/products/generate-barcode-button";
import { setProductStatus } from "@/lib/actions/products";

export const metadata: Metadata = { title: "Fiche produit" };

export default async function ProductPage({ params }: PageProps<"/produits/[id]">) {
  const user = await requirePage("products.view");
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*, categories(name), suppliers(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();
  const { data: variantsData } = await supabase
    .from("product_variants")
    .select("id, label, sku, barcode, barcode_is_internal, purchase_price, sale_price, min_stock, is_active, stock_qty, attributes")
    .eq("product_id", id)
    .order("created_at");
  const variants = (variantsData ?? []) as (VariantRow & { attributes: Record<string, string> })[];
  const canSeeMoves = can(user.permissions, "stock.manage", "stock.adjust", "products.manage", "reports.view");
  const { data: moves } = canSeeMoves
    ? await supabase
        .from("stock_movements")
        .select("id, type, quantity, balance_after, reason, created_at, variant_id, profiles:created_by(full_name)")
        .in("variant_id", variants.map((v) => v.id).length ? variants.map((v) => v.id) : ["00000000-0000-0000-0000-000000000000"])
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const manage = can(user.permissions, "products.manage");
  const adjust = can(user.permissions, "stock.adjust");
  const img = photoUrl(product.photo_path);
  const labelOf = new Map(variants.map((v) => [v.id, v.label]));
  const effective = (v: VariantRow) => ({
    price: v.sale_price ?? product.sale_price,
    cost: v.purchase_price ?? product.purchase_price,
    min: v.min_stock ?? product.min_stock,
  });

  return (
    <>
      <PageHeader
        title={product.name}
        back={{ href: "/produits", label: "Produits" }}
        description={[product.brand, product.categories?.name, product.reference && `Réf. ${product.reference}`].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <LinkButton href={`/produits/etiquettes?produit=${id}`} variant="secondary">
              <Printer aria-hidden /> Étiquettes
            </LinkButton>
            {manage ? (
              <>
                <ConfirmAction
                  action={setProductStatus}
                  hidden={{ id, status: product.status === "active" ? "archived" : "active" }}
                  trigger={product.status === "active" ? "Archiver" : "Réactiver"}
                  title={product.status === "active" ? "Archiver ce produit ?" : "Réactiver ce produit ?"}
                  description={
                    product.status === "active"
                      ? "Il ne sera plus proposé en caisse. Son historique de ventes et de stock est conservé."
                      : "Il sera de nouveau proposé en caisse."
                  }
                  confirmLabel={product.status === "active" ? "Archiver" : "Réactiver"}
                  variant={product.status === "active" ? "danger" : "primary"}
                />
                <LinkButton href={`/produits/${id}/modifier`}>
                  <Pencil aria-hidden /> Modifier
                </LinkButton>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Panel className="h-fit overflow-hidden">
          <div className="aspect-square bg-ivory">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center font-display text-6xl text-sand-strong">{product.name.charAt(0)}</div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
            <dt className="text-muted">Prix de vente</dt>
            <dd className="text-right font-medium"><Money value={product.sale_price} /></dd>
            {manage || can(user.permissions, "reports.view") ? (
              <>
                <dt className="text-muted">Prix d&apos;achat</dt>
                <dd className="text-right"><Money value={product.purchase_price} /></dd>
                <dt className="text-muted">Marge unitaire</dt>
                <dd className="text-right"><Money value={product.sale_price - product.purchase_price} /></dd>
              </>
            ) : null}
            <dt className="text-muted">Seuil minimum</dt>
            <dd className="text-right">{product.min_stock}</dd>
            <dt className="text-muted">Fournisseur</dt>
            <dd className="text-right">{product.suppliers?.name ?? "—"}</dd>
            <dt className="text-muted">Statut</dt>
            <dd className="text-right">{product.status === "active" ? <Badge tone="success">Actif</Badge> : <Badge>Archivé</Badge>}</dd>
          </dl>
          {product.description ? <p className="border-t border-sand p-5 text-sm whitespace-pre-line text-ink-soft">{product.description}</p> : null}
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <PanelHeader title="Variantes" description="Chaque variante a son propre stock et son propre code-barres." />
            <Table>
              <thead>
                <tr>
                  <Th>Variante</Th>
                  <Th>Code-barres</Th>
                  <Th align="right">Prix</Th>
                  <Th>Stock</Th>
                  <Th className="w-0"><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const e = effective(v);
                  const status = v.stock_qty <= 0 ? "out" : v.stock_qty <= e.min ? "low" : "ok";
                  return (
                    <Tr key={v.id} className={v.is_active ? undefined : "opacity-60"}>
                      <Td>
                        <span className="font-medium">{v.label}</span>
                        {!v.is_active ? <Badge className="ml-2">Hors vente</Badge> : null}
                        {v.sku ? <span className="block text-xs text-muted">SKU {v.sku}</span> : null}
                      </Td>
                      <Td>
                        {v.barcode ? (
                          <span className="tabular">
                            {v.barcode}
                            <span className="block text-xs text-muted">{v.barcode_is_internal ? "Code interne (Code 128)" : "Code fabricant"}</span>
                          </span>
                        ) : manage ? (
                          <GenerateBarcodeButton variantId={v.id} productId={id} />
                        ) : (
                          <span className="text-muted">Aucun</span>
                        )}
                      </Td>
                      <Td align="right"><Money value={e.price} /></Td>
                      <Td><StockBadge status={status} qty={v.stock_qty} /></Td>
                      <Td className="whitespace-nowrap">
                        {adjust ? <AdjustStockButton variant={v} label={`${product.name} — ${v.label}`} /> : null}
                        {manage ? <EditVariantButton productId={id} variant={v} /> : null}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            {manage ? (
              <details className="border-t border-sand">
                <summary className="cursor-pointer px-5 py-3 text-sm font-medium hover:bg-ivory/60">Ajouter une variante</summary>
                <AddVariantForm productId={id} />
              </details>
            ) : null}
          </Panel>

          {canSeeMoves ? (
            <Panel>
              <PanelHeader title="Derniers mouvements de stock" actions={<Link href={`/stock?produit=${id}`} className="text-sm text-muted hover:text-ink">Tout l&apos;historique</Link>} />
              {moves && moves.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Variante</Th>
                      <Th>Mouvement</Th>
                      <Th align="right">Qté</Th>
                      <Th align="right">Solde</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {moves.map((m) => (
                      <Tr key={m.id}>
                        <Td className="whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</Td>
                        <Td>{labelOf.get(m.variant_id)}</Td>
                        <Td>
                          {STOCK_MOVEMENT_LABELS[m.type] ?? m.type}
                          <span className="block text-xs text-muted">
                            {m.reason}
                            {(m.profiles as unknown as { full_name: string } | null)?.full_name ? ` — ${(m.profiles as unknown as { full_name: string }).full_name}` : ""}
                          </span>
                        </Td>
                        <Td align="right" className={m.quantity < 0 ? "text-danger" : "text-success"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td>
                        <Td align="right">{m.balance_after}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyState title="Aucun mouvement" description="Les entrées, ventes et corrections apparaîtront ici." />
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
