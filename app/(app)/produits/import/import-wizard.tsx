"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ActionForm } from "@/components/ui/action-form";
import { confirmImport, previewImport } from "@/lib/actions/products";
import { IMPORT_COLUMNS, type ImportPreview } from "@/lib/product-import";
import type { ActionResult } from "@/lib/action-types";

type PreviewState = ActionResult<{ preview: ImportPreview; csv: string }>;

const TEMPLATE = `${IMPORT_COLUMNS.join(";")}\nRobe wax Awa;Prêt-à-porter;Élégance;RW-001;M;M;Bleu;;;12000;25000;3;2;Robe longue en wax\nRobe wax Awa;Prêt-à-porter;Élégance;RW-001;L;L;Bleu;;;12000;25000;2;2;\nOud Royal;Parfums;Maison Diop;OR-50;50 ml;;;50 ml;6111234567890;5000;8000;10;3;\n`;

export function ImportWizard() {
  const [state, action] = useActionState<PreviewState, FormData>(previewImport, { ok: true });
  const router = useRouter();
  const shown = useRef(state);
  useEffect(() => {
    if (state !== shown.current && !state.ok) toast.error(state.error);
    shown.current = state;
  }, [state]);
  const preview = state.ok ? state.data?.preview : undefined;
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + TEMPLATE)}`;

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader
          title="1. Choisir le fichier"
          description={`Colonnes reconnues : ${IMPORT_COLUMNS.join(", ")}. Seules « nom » et « prix_vente » sont obligatoires.`}
          actions={
            <a href={templateHref} download="modele-produits.csv" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <Download className="size-4" aria-hidden /> Modèle CSV
            </a>
          }
        />
        <form action={action} className="flex flex-wrap items-center gap-3 p-5">
          <label htmlFor="file" className="sr-only">Fichier CSV</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required className="text-sm file:mr-3 file:rounded file:border file:border-sand-strong file:bg-paper file:px-3 file:py-1.5" />
          <SubmitButton variant="secondary" pendingLabel="Analyse…">Analyser le fichier</SubmitButton>
        </form>
      </Panel>

      {preview ? (
        <Panel>
          <PanelHeader
            title="2. Vérifier l'aperçu"
            description={`${preview.rowCount} ligne(s) lue(s) · ${preview.products.length} produit(s) · ${preview.products.reduce((s, p) => s + p.variants.length, 0)} variante(s)`}
          />
          {preview.errors.length ? (
            <div className="border-b border-sand bg-danger-soft/60 p-5" role="alert">
              <p className="font-medium text-danger">{preview.errors.length} erreur(s) à corriger dans le fichier avant l&apos;import :</p>
              <ul className="mt-2 list-inside list-disc text-sm text-danger">
                {preview.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>Ligne {e.row} : {e.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {preview.warnings.length ? (
            <div className="border-b border-sand bg-warning-soft/60 p-5">
              <p className="font-medium text-warning">{preview.warnings.length} avertissement(s) :</p>
              <ul className="mt-2 list-inside list-disc text-sm text-warning">
                {preview.warnings.slice(0, 20).map((e, i) => (
                  <li key={i}>Ligne {e.row} : {e.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Table>
            <thead>
              <tr>
                <Th>Produit</Th>
                <Th>Variante</Th>
                <Th>Code-barres</Th>
                <Th align="right">Achat</Th>
                <Th align="right">Vente</Th>
                <Th align="right">Stock</Th>
              </tr>
            </thead>
            <tbody>
              {preview.products.slice(0, 200).flatMap((p) =>
                p.variants.map((v, i) => (
                  <Tr key={`${p.key}-${v.label}`}>
                    <Td>{i === 0 ? <><span className="font-medium">{p.name}</span><span className="block text-xs text-muted">{[p.category, p.brand].filter(Boolean).join(" · ")}</span></> : null}</Td>
                    <Td>{v.label}</Td>
                    <Td>{v.barcode ?? <Badge tone="gold">Code interne</Badge>}</Td>
                    <Td align="right"><Money value={v.purchasePrice} /></Td>
                    <Td align="right"><Money value={v.salePrice} /></Td>
                    <Td align="right">{v.initialStock}</Td>
                  </Tr>
                )),
              )}
            </tbody>
          </Table>
          <ActionForm action={confirmImport} redirectTo="/produits" className="flex justify-end border-t border-sand p-5">
            <input type="hidden" name="csv" value={state.ok ? state.data?.csv ?? "" : ""} />
            <SubmitButton disabled={preview.errors.length > 0 || preview.products.length === 0} pendingLabel="Import en cours…" onClick={() => router.prefetch("/produits")}>
              Importer {preview.products.length} produit(s)
            </SubmitButton>
          </ActionForm>
        </Panel>
      ) : null}
    </div>
  );
}
