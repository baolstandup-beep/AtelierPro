"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Checkbox, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { receivePurchase } from "@/lib/actions/purchases";

interface Item { id: string; name: string; ordered: number; received: number; unitCost: number }

export function ReceiveForm({ purchaseId, items }: { purchaseId: string; items: Item[] }) {
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  return (
    <ActionForm action={receivePurchase} onSuccess={() => setOperationId(crypto.randomUUID())}>
      <input type="hidden" name="purchase_id" value={purchaseId} />
      <input type="hidden" name="operation_id" value={operationId} />
      <Table>
        <thead><tr><Th>Article</Th><Th align="right">Commandé</Th><Th align="right">Déjà reçu</Th><Th align="right">Reçu maintenant</Th><Th align="right">Coût unitaire</Th></tr></thead>
        <tbody>
          {items.map((i) => {
            const left = i.ordered - i.received;
            return (
              <Tr key={i.id}>
                <Td>{i.name}</Td>
                <Td align="right">{i.ordered}</Td>
                <Td align="right">{i.received}</Td>
                <Td align="right"><Input aria-label={`Quantité reçue ${i.name}`} name={`qty:${i.id}`} type="number" min={0} max={left} defaultValue={left} disabled={left === 0} className="ml-auto h-9 w-20 text-right" /></Td>
                <Td align="right"><Input aria-label={`Coût ${i.name}`} name={`cost:${i.id}`} inputMode="numeric" defaultValue={i.unitCost} disabled={left === 0} className="ml-auto h-9 w-28 text-right" /></Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <Checkbox name="update_costs" defaultChecked label="Mettre à jour le prix d'achat des articles" />
        <SubmitButton pendingLabel="Réception…">Valider la réception</SubmitButton>
      </div>
    </ActionForm>
  );
}
