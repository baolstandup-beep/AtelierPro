"use client";
import { useState } from "react";
import { Pencil, PackagePlus } from "lucide-react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addVariant, updateVariant } from "@/lib/actions/products";
import { adjustStock } from "@/lib/actions/stock";

export interface VariantRow {
  id: string;
  label: string;
  sku: string | null;
  barcode: string | null;
  barcode_is_internal: boolean;
  purchase_price: number | null;
  sale_price: number | null;
  min_stock: number | null;
  is_active: boolean;
  stock_qty: number;
}

export function EditVariantButton({ productId, variant }: { productId: string; variant: VariantRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Modifier ${variant.label}`}>
        <Pencil aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Variante « ${variant.label} »`} description="Laissez un prix vide pour reprendre celui du produit.">
        <ActionForm action={updateVariant} onSuccess={() => setOpen(false)} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={variant.id} />
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="barcode_is_internal" value={String(variant.barcode_is_internal)} />
          <FormField label="Nom affiché" htmlFor="ev-label" name="label" required className="sm:col-span-2">
            <Input id="ev-label" name="label" defaultValue={variant.label} required />
          </FormField>
          <FormField label="Code-barres" htmlFor="ev-barcode" name="barcode">
            <Input id="ev-barcode" name="barcode" defaultValue={variant.barcode ?? ""} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} />
          </FormField>
          <FormField label="SKU" htmlFor="ev-sku" name="sku">
            <Input id="ev-sku" name="sku" defaultValue={variant.sku ?? ""} />
          </FormField>
          <FormField label="Prix de vente" htmlFor="ev-sale" name="sale_price">
            <Input id="ev-sale" name="sale_price" inputMode="numeric" defaultValue={variant.sale_price ?? ""} />
          </FormField>
          <FormField label="Prix d'achat" htmlFor="ev-purchase" name="purchase_price">
            <Input id="ev-purchase" name="purchase_price" inputMode="numeric" defaultValue={variant.purchase_price ?? ""} />
          </FormField>
          <FormField label="Seuil minimum" htmlFor="ev-min" name="min_stock">
            <Input id="ev-min" name="min_stock" type="number" min={0} defaultValue={variant.min_stock ?? ""} />
          </FormField>
          <div className="flex items-end">
            <Checkbox name="is_active" defaultChecked={variant.is_active} label="Variante en vente" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function AdjustStockButton({ variant, label }: { variant: VariantRow; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Corriger le stock de ${label}`}>
        <PackagePlus aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Mouvement de stock" description={`${label} — stock actuel : ${variant.stock_qty}`}>
        <ActionForm action={adjustStock} onSuccess={() => setOpen(false)} className="flex flex-col gap-4">
          <input type="hidden" name="variant_id" value={variant.id} />
          <FormField label="Type" htmlFor="as-type" name="type" required>
            <Select id="as-type" name="type" defaultValue="entry">
              <option value="entry">Entrée (ajout)</option>
              <option value="exit">Sortie (casse, perte, usage interne)</option>
              <option value="adjustment">Correction (+ ou −)</option>
            </Select>
          </FormField>
          <FormField label="Quantité" htmlFor="as-qty" name="quantity" required hint="Pour une correction, saisissez par exemple −2 ou 3.">
            <Input id="as-qty" name="quantity" type="number" required />
          </FormField>
          <FormField label="Motif" htmlFor="as-reason" name="reason" required>
            <Textarea id="as-reason" name="reason" required maxLength={300} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <SubmitButton>Enregistrer le mouvement</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function AddVariantForm({ productId }: { productId: string }) {
  return (
    <ActionForm action={addVariant} resetOnSuccess className="grid gap-3 p-5 sm:grid-cols-4">
      <input type="hidden" name="product_id" value={productId} />
      <FormField label="Taille" htmlFor="nv-taille" name="taille">
        <Input id="nv-taille" name="taille" />
      </FormField>
      <FormField label="Couleur" htmlFor="nv-couleur" name="couleur">
        <Input id="nv-couleur" name="couleur" />
      </FormField>
      <FormField label="Contenance" htmlFor="nv-contenance" name="contenance">
        <Input id="nv-contenance" name="contenance" />
      </FormField>
      <FormField label="Nom affiché" htmlFor="nv-label" name="label" hint="Déduit des attributs si vide.">
        <Input id="nv-label" name="label" />
      </FormField>
      <FormField label="Code-barres existant" htmlFor="nv-barcode" name="barcode" hint="Vide = code interne.">
        <Input id="nv-barcode" name="barcode" onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} />
      </FormField>
      <FormField label="Prix spécifique" htmlFor="nv-price" name="sale_price">
        <Input id="nv-price" name="sale_price" inputMode="numeric" />
      </FormField>
      <FormField label="Stock initial" htmlFor="nv-stock" name="initial_stock">
        <Input id="nv-stock" name="initial_stock" type="number" min={0} defaultValue={0} />
      </FormField>
      <div className="flex items-end">
        <SubmitButton variant="secondary" className="w-full">Ajouter la variante</SubmitButton>
      </div>
    </ActionForm>
  );
}
