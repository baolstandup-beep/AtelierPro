"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { createPurchase, searchVariantsForPurchase } from "@/lib/actions/purchases";
import { formatFCFA, parseAmount, todayInShop } from "@/lib/format";

type Found = Awaited<ReturnType<typeof searchVariantsForPurchase>>[number];
interface Line { variantId: string; name: string; quantity: string; unitCost: string }

export function PurchaseBuilder({ suppliers, defaultSupplier }: { suppliers: { id: string; name: string }[]; defaultSupplier?: string }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(defaultSupplier ?? suppliers[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [orderDate, setOrderDate] = useState(todayInShop());
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => setFound(await searchVariantsForPurchase(q)), 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (f: Found) => {
    setLines((ls) => (ls.some((l) => l.variantId === f.variant_id) ? ls : [...ls, { variantId: f.variant_id, name: `${f.product_name} — ${f.variant_label}`, quantity: "1", unitCost: String(f.purchase_price ?? 0) }]));
    setQ("");
    setFound([]);
  };
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (parseAmount(l.unitCost) ?? 0), 0);

  async function submit() {
    if (!supplierId || !lines.length || busy) return;
    setBusy(true);
    const res = await createPurchase({
      supplierId,
      supplierReference: reference || undefined,
      notes: notes || undefined,
      orderDate,
      items: lines.map((l) => ({ variantId: l.variantId, quantity: Number(l.quantity), unitCost: parseAmount(l.unitCost) ?? -1 })),
    });
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(res.message);
    router.push(`/achats/${res.data!.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Panel>
        <PanelHeader title="Articles commandés" />
        <div className="relative border-b border-sand p-4">
          <label htmlFor="pq" className="sr-only">Rechercher un article</label>
          <Input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un article (nom, référence, code-barres)" autoComplete="off" />
          {found.length && q.trim().length >= 2 ? (
            <ul className="absolute inset-x-4 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-sand bg-paper shadow-lg">
              {found.map((f) => (
                <li key={f.variant_id}>
                  <button type="button" onClick={() => add(f)} className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ivory">
                    <span>{f.product_name} <span className="text-muted">— {f.variant_label}</span></span>
                    <span className="text-xs text-muted">stock {f.stock_qty}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {lines.length === 0 ? <p className="p-8 text-center text-sm text-muted">Ajoutez les articles à commander.</p> : (
          <Table>
            <thead><tr><Th>Article</Th><Th align="right">Quantité</Th><Th align="right">Coût unitaire</Th><Th align="right">Total</Th><Th className="w-0"><span className="sr-only">Retirer</span></Th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <Tr key={l.variantId}>
                  <Td>{l.name}</Td>
                  <Td align="right"><Input aria-label={`Quantité ${l.name}`} type="number" min={1} value={l.quantity} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} className="ml-auto h-9 w-20 text-right" /></Td>
                  <Td align="right"><Input aria-label={`Coût ${l.name}`} inputMode="numeric" value={l.unitCost} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)))} className="ml-auto h-9 w-28 text-right" /></Td>
                  <Td align="right">{formatFCFA((Number(l.quantity) || 0) * (parseAmount(l.unitCost) ?? 0))}</Td>
                  <Td><Button variant="ghost" size="sm" aria-label={`Retirer ${l.name}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 aria-hidden /></Button></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <Panel className="h-fit">
        <PanelHeader title="Commande" />
        <div className="flex flex-col gap-4 p-5 text-sm">
          <div><label htmlFor="supplier" className="font-medium">Fournisseur</label>
            <Select id="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1.5">
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select></div>
          <div><label htmlFor="ref" className="font-medium">Référence fournisseur</label><Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° de facture ou de bon" className="mt-1.5" /></div>
          <div><label htmlFor="date" className="font-medium">Date de commande</label><Input id="date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="mt-1.5" /></div>
          <div><label htmlFor="notes" className="font-medium">Notes</label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" /></div>
          <p className="flex justify-between border-t border-sand pt-3 text-base"><span>Total</span><span className="font-semibold tabular">{formatFCFA(total)}</span></p>
          <Button size="lg" onClick={submit} disabled={!lines.length || !supplierId || busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : null}Créer la commande</Button>
        </div>
      </Panel>
    </div>
  );
}
