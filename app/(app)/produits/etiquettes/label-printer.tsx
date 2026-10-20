"use client";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Barcode } from "@/components/products/barcode";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFCFA } from "@/lib/format";

export interface LabelVariant {
  variant_id: string;
  product_name: string;
  variant_label: string;
  barcode: string;
  sale_price: number;
  stock_qty: number;
  brand: string | null;
}

const FORMATS = {
  roll: { label: "Rouleau 50 × 30 mm (imprimante d'étiquettes)", page: "@page { size: 50mm 30mm; margin: 0 }", cls: "w-[50mm] h-[30mm] break-after-page" },
  a4: { label: "Planche A4 (3 × 8, 70 × 37 mm)", page: "@page { size: A4; margin: 0 }", cls: "w-[70mm] h-[37mm]" },
} as const;

export function LabelPrinter({ variants, shopName, preselect }: { variants: LabelVariant[]; shopName: string; preselect: boolean }) {
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(variants.map((v) => [v.variant_id, preselect ? Math.max(v.stock_qty, 1) : 0])),
  );
  const [format, setFormat] = useState<keyof typeof FORMATS>("roll");
  const [filter, setFilter] = useState("");
  const [showPrice, setShowPrice] = useState(true);

  const labels = useMemo(() => variants.flatMap((v) => Array.from({ length: qty[v.variant_id] ?? 0 }, (_, i) => ({ ...v, key: `${v.variant_id}-${i}` }))), [variants, qty]);
  const visible = variants.filter((v) => `${v.product_name} ${v.variant_label} ${v.barcode}`.toLowerCase().includes(filter.toLowerCase()));
  const f = FORMATS[format];

  if (variants.length === 0) {
    return (
      <Panel>
        <EmptyState title="Aucun article avec code-barres" description="Attribuez un code-barres (existant ou interne) depuis la fiche produit." />
      </Panel>
    );
  }

  return (
    <>
      <style>{`@media print { ${f.page} body * { visibility: hidden } #labels, #labels * { visibility: visible } #labels { position: absolute; inset: 0 } }`}</style>
      <div className="no-print grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel>
          <PanelHeader title="Articles" actions={<Input aria-label="Filtrer" placeholder="Filtrer" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-48" />} />
          <Table>
            <thead>
              <tr>
                <Th>Article</Th>
                <Th>Code</Th>
                <Th align="right">Stock</Th>
                <Th align="right">Étiquettes</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((v) => (
                <Tr key={v.variant_id}>
                  <Td>
                    <span className="font-medium">{v.product_name}</span>
                    <span className="block text-xs text-muted">{v.variant_label}</span>
                  </Td>
                  <Td className="tabular text-muted">{v.barcode}</Td>
                  <Td align="right">{v.stock_qty}</Td>
                  <Td align="right">
                    <Input
                      aria-label={`Nombre d'étiquettes pour ${v.product_name} ${v.variant_label}`}
                      type="number"
                      min={0}
                      max={500}
                      value={qty[v.variant_id] ?? 0}
                      onChange={(e) => setQty((q) => ({ ...q, [v.variant_id]: Math.max(0, Math.min(500, Number(e.target.value) || 0)) }))}
                      className="ml-auto h-9 w-20 text-right"
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel className="h-fit">
          <PanelHeader title="Impression" />
          <div className="flex flex-col gap-4 p-5">
            <label className="text-sm font-medium" htmlFor="format">Format</label>
            <Select id="format" value={format} onChange={(e) => setFormat(e.target.value as keyof typeof FORMATS)}>
              {Object.entries(FORMATS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="accent-ink" /> Afficher le prix
            </label>
            <p className="text-sm text-muted">{labels.length} étiquette(s)</p>
            <Button onClick={() => window.print()} disabled={labels.length === 0}>
              <Printer aria-hidden /> Imprimer
            </Button>
            <p className="text-xs text-muted">Dans la fenêtre d&apos;impression : marges « Aucune », échelle 100 %. Voir docs/IMPRESSION.md.</p>
          </div>
        </Panel>
      </div>

      <div id="labels" className={format === "a4" ? "grid grid-cols-3 print:gap-0" : "flex flex-col"} aria-label="Aperçu des étiquettes">
        <p className="no-print mt-8 mb-3 text-sm font-medium">Aperçu</p>
        {format === "a4" ? <span className="no-print col-span-3" /> : null}
        {labels.map((l) => (
          <div key={l.key} className={`${f.cls} flex flex-col items-center justify-center overflow-hidden border border-dashed border-sand bg-white px-[2mm] text-center text-black print:border-0`}>
            <p className="w-full truncate text-[8pt] leading-tight font-semibold">{l.product_name}</p>
            <p className="w-full truncate text-[7pt] leading-tight">{[l.variant_label, shopName].join(" · ")}</p>
            <div className="my-[1mm] max-h-[14mm] [&_svg]:h-[14mm] [&_svg]:max-w-full">
              <Barcode value={l.barcode} height={36} width={1.4} fontSize={11} />
            </div>
            {showPrice ? <p className="text-[9pt] font-bold">{formatFCFA(l.sale_price)}</p> : null}
          </div>
        ))}
      </div>
    </>
  );
}
