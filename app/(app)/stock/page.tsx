import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, STOCK_MOVEMENT_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StockBadge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/filters";

export const metadata: Metadata = { title: "Stock" };
const PAGE_SIZE = 50;

export default async function StockPage({ searchParams }: PageProps<"/stock">) {
  await requirePage("stock.manage", "stock.adjust", "products.manage");
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const productId = typeof sp.produit === "string" ? sp.produit : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  const [{ data: alerts }, { data: valuation }] = await Promise.all([
    supabase.from("v_variant_stock").select("variant_id, product_id, product_name, variant_label, stock_qty, min_stock, stock_status").eq("is_sellable", true).neq("stock_status", "ok").order("stock_qty").limit(100),
    supabase.rpc("report_stock_valuation"),
  ]);
  const totals = ((valuation ?? []) as { units: number; cost_value: number; retail_value: number }[]).reduce(
    (s, r) => ({ units: s.units + Number(r.units), cost: s.cost + Number(r.cost_value), retail: s.retail + Number(r.retail_value) }),
    { units: 0, cost: 0, retail: 0 },
  );

  let movesQuery = supabase
    .from("stock_movements")
    .select("id, type, quantity, balance_after, reason, created_at, unit_cost, variant:product_variants(id, label, product_id, products(name)), profiles:created_by(full_name)")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (type) movesQuery = movesQuery.eq("type", type);
  if (productId) {
    const { data: vs } = await supabase.from("product_variants").select("id").eq("product_id", productId);
    movesQuery = movesQuery.in("variant_id", (vs ?? []).map((v) => v.id).concat("00000000-0000-0000-0000-000000000000"));
  }
  const { data: movesData } = await movesQuery;
  type Move = { id: string; type: string; quantity: number; balance_after: number; reason: string | null; created_at: string; variant: { id: string; label: string; product_id: string; products: { name: string } }; profiles: { full_name: string } | null };
  let moves = (movesData ?? []) as unknown as Move[];
  const hasNext = moves.length > PAGE_SIZE;
  moves = moves.slice(0, PAGE_SIZE);
  const out = (alerts ?? []).filter((a) => a.stock_status === "out").length;

  return (
    <>
      <PageHeader title="Stock" description="Alertes, valorisation et historique complet des mouvements." actions={<LinkButton href="/stock/inventaires" variant="secondary"><ClipboardList aria-hidden /> Inventaires</LinkButton>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Valeur au coût d'achat" value={<Money value={totals.cost} />} />
        <Stat label="Valeur au prix de vente" value={<Money value={totals.retail} />} />
        <Stat label="Articles en stock" value={totals.units.toLocaleString("fr-FR")} />
        <Stat label="Alertes" value={(alerts ?? []).length} hint={`${out} en rupture`} tone={(alerts ?? []).length ? "warning" : undefined} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel className="h-fit">
          <PanelHeader title="Stock faible et ruptures" />
          {(alerts ?? []).length === 0 ? <EmptyState title="Aucune alerte" description="Tous les articles sont au-dessus de leur seuil." /> : (
            <ul className="max-h-[32rem] divide-y divide-sand overflow-y-auto">
              {(alerts ?? []).map((a) => (
                <li key={a.variant_id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <Link href={`/produits/${a.product_id}`} className="min-w-0 hover:underline">
                    <span className="block truncate font-medium">{a.product_name}</span>
                    <span className="block truncate text-xs text-muted">{a.variant_label} · seuil {a.min_stock}</span>
                  </Link>
                  <StockBadge status={a.stock_status} qty={a.stock_qty} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader
            title="Mouvements"
            actions={
              <form action="/stock" className="flex gap-2">
                {productId ? <input type="hidden" name="produit" value={productId} /> : null}
                <label htmlFor="type" className="sr-only">Type</label>
                <Select id="type" name="type" defaultValue={type} className="h-9 w-48">
                  <option value="">Tous les types</option>
                  {Object.entries(STOCK_MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <button className={buttonClass("secondary", "sm", "h-9")}>Filtrer</button>
              </form>
            }
          />
          {moves.length === 0 ? <EmptyState title="Aucun mouvement" /> : (
            <Table>
              <thead><tr><Th>Date</Th><Th>Article</Th><Th>Mouvement</Th><Th align="right">Qté</Th><Th align="right">Solde</Th></tr></thead>
              <tbody>
                {moves.map((m) => (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</Td>
                    <Td><Link href={`/produits/${m.variant.product_id}`} className="hover:underline">{m.variant.products.name}</Link><span className="block text-xs text-muted">{m.variant.label}</span></Td>
                    <Td>{STOCK_MOVEMENT_LABELS[m.type]}<span className="block text-xs text-muted">{m.reason}{m.profiles ? ` — ${m.profiles.full_name}` : ""}</span></Td>
                    <Td align="right" className={m.quantity < 0 ? "text-danger" : "text-success"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td>
                    <Td align="right">{m.balance_after}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination basePath="/stock" page={page} hasNext={hasNext} params={{ type, produit: productId }} />
        </Panel>
      </div>
    </>
  );
}
