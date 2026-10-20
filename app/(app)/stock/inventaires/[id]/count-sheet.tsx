"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveInventoryCounts } from "@/lib/actions/stock";

interface Row { id: string; expected: number; counted: number | null; name: string; label: string; barcode: string | null }

export function CountSheet({ inventoryId, rows, editable }: { inventoryId: string; rows: Row[]; editable: boolean }) {
  const [filter, setFilter] = useState("");
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.id, r.counted === null ? "" : String(r.counted)])));
  const f = filter.trim().toLowerCase();
  const visible = rows.filter((r) => !f || `${r.name} ${r.label} ${r.barcode ?? ""}`.toLowerCase().includes(f));
  return (
    <ActionForm action={saveInventoryCounts}>
      <input type="hidden" name="inventory_id" value={inventoryId} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand p-4">
        <Input
          aria-label="Filtrer ou scanner"
          placeholder="Filtrer ou scanner un code-barres"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const hit = rows.find((r) => r.barcode === filter.trim());
            if (hit) {
              setValues((v) => ({ ...v, [hit.id]: String((Number(v[hit.id]) || 0) + 1) }));
              setFilter("");
            }
          }}
          className="w-full sm:w-80"
        />
        {editable ? <SubmitButton>Enregistrer les comptages</SubmitButton> : null}
      </div>
      <Table>
        <thead><tr><Th>Article</Th><Th align="right">Théorique</Th><Th align="right">Compté</Th><Th align="right">Écart</Th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const v = values[r.id];
            const diff = v === "" ? null : Number(v) - r.expected;
            const hidden = !visible.includes(r);
            return (
              <Tr key={r.id} className={hidden ? "hidden" : undefined}>
                <Td><span className="font-medium">{r.name}</span><span className="block text-xs text-muted">{r.label}{r.barcode ? ` · ${r.barcode}` : ""}</span></Td>
                <Td align="right">{r.expected}</Td>
                <Td align="right">
                  <input type="hidden" name={`orig:${r.id}`} value={r.counted === null ? "" : String(r.counted)} />
                  <Input aria-label={`Quantité comptée ${r.name} ${r.label}`} name={`count:${r.id}`} type="number" min={0} disabled={!editable} value={v} onChange={(e) => setValues((s) => ({ ...s, [r.id]: e.target.value }))} className="ml-auto h-9 w-24 text-right" />
                </Td>
                <Td align="right" className={diff ? (diff < 0 ? "text-danger" : "text-success") : "text-muted"}>{diff === null ? "—" : diff > 0 ? `+${diff}` : diff}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </ActionForm>
  );
}
