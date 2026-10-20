"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProduct, updateProduct } from "@/lib/actions/products";

interface Option {
  id: string;
  name: string;
}

export interface ProductDefaults {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  supplier_id: string | null;
  reference: string | null;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  photo_url: string | null;
}

interface VariantDraft {
  key: number;
  label: string;
  taille: string;
  couleur: string;
  contenance: string;
  barcode: string;
  sale_price: string;
  initial_stock: string;
}

const emptyVariant = (key: number): VariantDraft => ({ key, label: "", taille: "", couleur: "", contenance: "", barcode: "", sale_price: "", initial_stock: "0" });

export function ProductForm({
  categories,
  suppliers,
  product,
  defaultMinStock,
}: {
  categories: Option[];
  suppliers: Option[];
  product?: ProductDefaults;
  defaultMinStock: number;
}) {
  const editing = !!product;
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...emptyVariant(1), label: "Standard" }]);
  const update = (key: number, patch: Partial<VariantDraft>) => setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const serialized = JSON.stringify(
    variants.map((v) => {
      const attributes = Object.fromEntries(
        (["taille", "couleur", "contenance"] as const).filter((k) => v[k].trim()).map((k) => [k, v[k].trim()]),
      );
      return {
        label: v.label.trim() || Object.values(attributes).join(" / ") || "Standard",
        attributes,
        barcode: v.barcode.trim() || undefined,
        sale_price: v.sale_price.trim() || undefined,
        initial_stock: v.initial_stock.trim() || "0",
      };
    }),
  );

  return (
    <ActionForm
      action={editing ? updateProduct : createProduct}
      redirectTo={(data) => `/produits/${(data as { id: string }).id}`}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      {editing ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="flex flex-col gap-6">
        <Panel>
          <PanelHeader title="Informations" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <FormField label="Nom du produit" htmlFor="name" name="name" required className="sm:col-span-2">
              <Input id="name" name="name" defaultValue={product?.name} required maxLength={200} autoFocus={!editing} />
            </FormField>
            <FormField label="Catégorie" htmlFor="category_id" name="category_id">
              <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Marque" htmlFor="brand" name="brand">
              <Input id="brand" name="brand" defaultValue={product?.brand ?? ""} maxLength={120} />
            </FormField>
            <FormField label="Fournisseur" htmlFor="supplier_id" name="supplier_id">
              <Select id="supplier_id" name="supplier_id" defaultValue={product?.supplier_id ?? ""}>
                <option value="">Aucun</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Référence interne" htmlFor="reference" name="reference" hint="Unique. Facultative.">
              <Input id="reference" name="reference" defaultValue={product?.reference ?? ""} maxLength={60} />
            </FormField>
            <FormField label="Description" htmlFor="description" name="description" className="sm:col-span-2">
              <Textarea id="description" name="description" defaultValue={product?.description ?? ""} maxLength={2000} />
            </FormField>
          </div>
        </Panel>

        {!editing ? (
          <Panel>
            <PanelHeader
              title="Variantes"
              description="Une ligne par taille, couleur ou contenance. Chaque variante a son stock et son code-barres."
              actions={
                <Button variant="secondary" size="sm" onClick={() => setVariants((vs) => [...vs, emptyVariant(Date.now())])}>
                  <Plus aria-hidden /> Ajouter une variante
                </Button>
              }
            />
            <input type="hidden" name="variants" value={serialized} />
            <div className="flex flex-col divide-y divide-sand">
              {variants.map((v, i) => (
                <fieldset key={v.key} className="grid gap-3 p-5 sm:grid-cols-6">
                  <legend className="sr-only">Variante {i + 1}</legend>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted" htmlFor={`v-label-${v.key}`}>Nom affiché</label>
                    <Input id={`v-label-${v.key}`} value={v.label} placeholder="ex. M / Noir" onChange={(e) => update(v.key, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted" htmlFor={`v-taille-${v.key}`}>Taille</label>
                    <Input id={`v-taille-${v.key}`} value={v.taille} onChange={(e) => update(v.key, { taille: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted" htmlFor={`v-couleur-${v.key}`}>Couleur</label>
                    <Input id={`v-couleur-${v.key}`} value={v.couleur} onChange={(e) => update(v.key, { couleur: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted" htmlFor={`v-contenance-${v.key}`}>Contenance / format</label>
                    <Input id={`v-contenance-${v.key}`} value={v.contenance} placeholder="ex. 100 ml" onChange={(e) => update(v.key, { contenance: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted" htmlFor={`v-barcode-${v.key}`}>Code-barres existant</label>
                    <Input
                      id={`v-barcode-${v.key}`}
                      value={v.barcode}
                      placeholder="Vide = code interne généré"
                      onChange={(e) => update(v.key, { barcode: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted" htmlFor={`v-price-${v.key}`}>Prix spécifique (FCFA)</label>
                    <Input id={`v-price-${v.key}`} inputMode="numeric" value={v.sale_price} placeholder="Prix du produit" onChange={(e) => update(v.key, { sale_price: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted" htmlFor={`v-stock-${v.key}`}>Stock initial</label>
                      <Input id={`v-stock-${v.key}`} type="number" min={0} inputMode="numeric" value={v.initial_stock} onChange={(e) => update(v.key, { initial_stock: e.target.value })} />
                    </div>
                    {variants.length > 1 ? (
                      <Button variant="ghost" size="md" aria-label={`Retirer la variante ${i + 1}`} onClick={() => setVariants((vs) => vs.filter((x) => x.key !== v.key))}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </fieldset>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <Panel>
          <PanelHeader title="Prix et stock" />
          <div className="flex flex-col gap-4 p-5">
            <FormField label="Prix de vente (FCFA)" htmlFor="sale_price" name="sale_price" required>
              <Input id="sale_price" name="sale_price" inputMode="numeric" defaultValue={product?.sale_price} required />
            </FormField>
            <FormField label="Prix d'achat (FCFA)" htmlFor="purchase_price" name="purchase_price" hint="Sert au calcul des marges et de la valeur du stock.">
              <Input id="purchase_price" name="purchase_price" inputMode="numeric" defaultValue={product?.purchase_price ?? ""} placeholder="0" />
            </FormField>
            <FormField label="Seuil de stock minimum" htmlFor="min_stock" name="min_stock" hint="Alerte « stock faible » à ce niveau.">
              <Input id="min_stock" name="min_stock" type="number" min={0} defaultValue={product?.min_stock ?? defaultMinStock} />
            </FormField>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Photo" />
          <div className="flex flex-col gap-3 p-5">
            {product?.photo_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.photo_url} alt="" className="aspect-square w-full rounded-md border border-sand object-cover" />
                <Checkbox name="remove_photo" label="Retirer la photo" />
              </>
            ) : null}
            <label htmlFor="photo" className="text-sm font-medium">
              {product?.photo_url ? "Remplacer la photo" : "Ajouter une photo"}
            </label>
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm file:mr-3 file:rounded file:border file:border-sand-strong file:bg-paper file:px-3 file:py-1.5" />
            <p className="text-xs text-muted">JPEG, PNG ou WebP, 3 Mo maximum.</p>
          </div>
        </Panel>
        <SubmitButton size="lg" className="w-full">
          {editing ? "Enregistrer la fiche" : "Créer le produit"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
