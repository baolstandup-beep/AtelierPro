"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { returnValue } from "@/lib/calc";
import { formatFCFA, PAYMENT_LABELS } from "@/lib/format";
import { processReturn } from "@/lib/actions/sales";

interface Item { id: string; name: string; label: string; quantity: number; returnedQty: number; lineTotal: number; refundedAmount: number }

export function ReturnForm({ sale, items, sessionId }: { sale: { id: string; balanceDue: number; hasCustomer: boolean }; items: Item[]; sessionId: string | null }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>(Object.fromEntries(items.map((i) => [i.id, true])));
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<"cash" | "wave" | "orange_money" | "bank_transfer" | "store_credit">(sessionId ? "cash" : "wave");
  const [operationId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);

  const value = useMemo(
    () => items.reduce((s, i) => (qty[i.id] ? s + returnValue(i, qty[i.id]) : s), 0),
    [items, qty],
  );
  const reduction = Math.min(sale.balanceDue, value);
  const refund = value - reduction;
  const selected = items.filter((i) => (qty[i.id] ?? 0) > 0);
  const error =
    !selected.length ? "Sélectionnez au moins un article." :
    !reason.trim() ? "Indiquez le motif du retour." :
    refund > 0 && method === "cash" && !sessionId ? "Aucune caisse ouverte : choisissez un autre mode ou ouvrez la caisse." :
    refund > 0 && method === "store_credit" && !sale.hasCustomer ? "Un avoir nécessite une vente rattachée à un client." : null;

  async function submit() {
    if (error || busy) return;
    setBusy(true);
    try {
      const res = await processReturn({
        operationId,
        saleId: sale.id,
        reason,
        refundMethod: method,
        sessionId,
        items: selected.map((i) => ({ saleItemId: i.id, quantity: qty[i.id], restock: restock[i.id] ?? true })),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      window.open(`/tickets/retour/${res.data!.id}`, "_blank", "noopener");
      router.push(`/ventes/${sale.id}`);
    } catch {
      toast.error("Connexion interrompue. Réessayez : le retour ne sera pas enregistré deux fois.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel>
        <PanelHeader title="Articles retournés" />
        <Table>
          <thead>
            <tr>
              <Th>Article</Th>
              <Th align="right">Restant</Th>
              <Th align="right">Qté retournée</Th>
              <Th>Remise en stock</Th>
              <Th align="right">Valeur</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const left = i.quantity - i.returnedQty;
              const q = qty[i.id] ?? 0;
              return (
                <Tr key={i.id} className={left === 0 ? "opacity-50" : undefined}>
                  <Td><span className="font-medium">{i.name}</span><span className="block text-xs text-muted">{i.label}</span></Td>
                  <Td align="right">{left}</Td>
                  <Td align="right">
                    <Input
                      aria-label={`Quantité retournée ${i.name}`}
                      type="number"
                      min={0}
                      max={left}
                      disabled={left === 0}
                      value={q}
                      onChange={(e) => setQty((s) => ({ ...s, [i.id]: Math.max(0, Math.min(left, Number(e.target.value) || 0)) }))}
                      className="ml-auto h-9 w-20 text-right"
                    />
                  </Td>
                  <Td>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" className="accent-ink" checked={restock[i.id] ?? true} disabled={left === 0} onChange={(e) => setRestock((s) => ({ ...s, [i.id]: e.target.checked }))} />
                      {restock[i.id] ?? true ? "Revendable" : "Défectueux"}
                    </label>
                  </Td>
                  <Td align="right">{q ? <Money value={returnValue(i, q)} /> : "—"}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
      <Panel className="h-fit">
        <PanelHeader title="Remboursement" />
        <div className="flex flex-col gap-4 p-5 text-sm">
          <div>
            <label htmlFor="reason" className="font-medium">Motif <span className="text-gold-deep">*</span></label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="mt-1.5" placeholder="Taille, défaut, changement d'avis…" />
          </div>
          <dl className="grid grid-cols-2 gap-y-1.5">
            <dt className="text-muted">Valeur retournée</dt><dd className="text-right font-medium tabular">{formatFCFA(value)}</dd>
            {reduction > 0 ? (<><dt className="text-muted">Crédit annulé</dt><dd className="text-right tabular">{formatFCFA(reduction)}</dd></>) : null}
            <dt className="font-medium">À rembourser</dt><dd className="text-right text-lg font-semibold tabular">{formatFCFA(refund)}</dd>
          </dl>
          {refund > 0 ? (
            <div>
              <label htmlFor="method" className="font-medium">Mode de remboursement</label>
              <Select id="method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="mt-1.5">
                {(["cash", "wave", "orange_money", "bank_transfer", "store_credit"] as const).map((m) => (
                  <option key={m} value={m} disabled={(m === "cash" && !sessionId) || (m === "store_credit" && !sale.hasCustomer)}>
                    {m === "store_credit" ? "Avoir client" : PAYMENT_LABELS[m]}
                  </option>
                ))}
              </Select>
              {method !== "cash" && method !== "store_credit" ? <p className="mt-1.5 text-xs text-muted">Effectuez le transfert {PAYMENT_LABELS[method]} au client ; il est enregistré ici pour la traçabilité.</p> : null}
            </div>
          ) : null}
          {error ? <p className="text-xs text-danger" role="status">{error}</p> : null}
          <Button size="lg" onClick={submit} disabled={!!error || busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Valider le retour
          </Button>
        </div>
      </Panel>
    </div>
  );
}
