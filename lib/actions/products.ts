"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-types";
import { fail, fromError, fromZod } from "@/lib/action-result";
import { amount, formToObject, optionalAmount, optionalInteger, optionalText, optionalUuid, requiredText, uuid } from "@/lib/validation";
import { isCode128Compatible } from "@/lib/barcode";
import { analyzeProductCsv } from "@/lib/product-import";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO = 3 * 1024 * 1024;

const productSchema = z.object({
  name: requiredText("Le nom"),
  description: optionalText(2000),
  category_id: optionalUuid(),
  brand: optionalText(120),
  supplier_id: optionalUuid(),
  reference: optionalText(60),
  purchase_price: amount("Le prix d'achat"),
  sale_price: amount("Le prix de vente"),
  min_stock: optionalInteger("Le seuil minimum"),
});

const variantSchema = z.object({
  label: z.string().trim().min(1, "Nom de variante obligatoire.").max(80),
  attributes: z.record(z.string(), z.string().trim().max(60)).default({}),
  sku: z.string().trim().max(60).optional().transform((v) => v || undefined),
  barcode: z
    .string()
    .trim()
    .max(48)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || isCode128Compatible(v), "Code-barres invalide."),
  purchase_price: optionalAmount("Le prix d'achat"),
  sale_price: optionalAmount("Le prix de vente"),
  min_stock: optionalInteger("Le seuil"),
  initial_stock: optionalInteger("Le stock initial"),
});

async function uploadPhoto(supabase: Awaited<ReturnType<typeof createClient>>, file: FormDataEntryValue | null): Promise<string | null | ActionResult<never>> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!PHOTO_TYPES.includes(file.type)) return fail("Photo : formats acceptés JPEG, PNG ou WebP.");
  if (file.size > MAX_PHOTO) return fail("Photo : 3 Mo maximum.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `produits/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return fail("Envoi de la photo impossible.");
  return path;
}

export async function createProduct(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("products.manage");
    const parsed = productSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    let variantsRaw: unknown;
    try {
      variantsRaw = JSON.parse(String(formData.get("variants") ?? "[]"));
    } catch {
      return fail("Variantes illisibles.");
    }
    const variants = z.array(variantSchema).min(1, "Ajoutez au moins une variante.").max(100).safeParse(variantsRaw);
    if (!variants.success) return fail(variants.error.issues[0]?.message ?? "Variantes invalides.");
    const barcodes = variants.data.map((v) => v.barcode).filter(Boolean);
    if (new Set(barcodes).size !== barcodes.length) return fail("Deux variantes ont le même code-barres.");

    const supabase = await createClient();
    const photo = await uploadPhoto(supabase, formData.get("photo"));
    if (photo && typeof photo === "object") return photo;

    const { data, error } = await supabase.rpc("create_product", {
      p_product: { ...parsed.data, photo_path: photo },
      p_variants: variants.data.map((v) => ({ ...v, generate_barcode: !v.barcode })),
    });
    if (error) {
      if (photo) await supabase.storage.from("product-photos").remove([photo as string]);
      return fromError(error);
    }
    revalidatePath("/produits");
    return { ok: true, message: "Produit créé.", data: { id: data as string } };
  } catch (e) {
    return fromError(e);
  }
}

export async function updateProduct(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAction("products.manage");
    const id = uuid().safeParse(formData.get("id"));
    if (!id.success) return fail("Produit introuvable.");
    const parsed = productSchema.safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const photo = await uploadPhoto(supabase, formData.get("photo"));
    if (photo && typeof photo === "object") return photo;
    const patch: Record<string, unknown> = {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category_id: parsed.data.category_id ?? null,
      brand: parsed.data.brand ?? null,
      supplier_id: parsed.data.supplier_id ?? null,
      reference: parsed.data.reference ?? null,
      purchase_price: parsed.data.purchase_price,
      sale_price: parsed.data.sale_price,
      min_stock: parsed.data.min_stock ?? 0,
    };
    if (photo) patch.photo_path = photo;
    if (formData.get("remove_photo") === "on" && !photo) patch.photo_path = null;
    const { data: before } = await supabase.from("products").select("photo_path").eq("id", id.data).single();
    const { error } = await supabase.from("products").update(patch).eq("id", id.data);
    if (error) return fromError(error);
    if (before?.photo_path && "photo_path" in patch) await supabase.storage.from("product-photos").remove([before.photo_path]);
    revalidatePath("/produits");
    revalidatePath(`/produits/${id.data}`);
    return { ok: true, message: "Fiche produit enregistrée.", data: { id: id.data } };
  } catch (e) {
    return fromError(e);
  }
}

export async function setProductStatus(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("products.manage");
    const id = uuid().parse(formData.get("id"));
    const status = z.enum(["active", "archived"]).parse(formData.get("status"));
    const supabase = await createClient();
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) return fromError(error);
    revalidatePath(`/produits/${id}`);
    revalidatePath("/produits");
    return { ok: true, message: status === "archived" ? "Produit archivé." : "Produit réactivé." };
  } catch (e) {
    return fromError(e);
  }
}

export async function addVariant(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("products.manage");
    const productId = uuid().parse(formData.get("product_id"));
    const obj = formToObject(formData);
    const attributes: Record<string, string> = {};
    for (const key of ["taille", "couleur", "contenance", "format"]) if (obj[key]?.trim()) attributes[key] = obj[key].trim();
    const parsed = variantSchema.safeParse({ ...obj, attributes, label: obj.label || Object.values(attributes).join(" / ") });
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("add_variant", {
      p_product_id: productId,
      p_variant: { ...parsed.data, generate_barcode: !parsed.data.barcode },
    });
    if (error) return fromError(error);
    revalidatePath(`/produits/${productId}`);
    return { ok: true, message: "Variante ajoutée." };
  } catch (e) {
    return fromError(e);
  }
}

export async function updateVariant(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("products.manage");
    const id = uuid().parse(formData.get("id"));
    const productId = uuid().parse(formData.get("product_id"));
    const parsed = variantSchema.omit({ initial_stock: true, attributes: true }).safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase
      .from("product_variants")
      .update({
        label: parsed.data.label,
        sku: parsed.data.sku ?? null,
        barcode: parsed.data.barcode ?? null,
        barcode_is_internal: formData.get("barcode_is_internal") === "true" && !!parsed.data.barcode,
        purchase_price: parsed.data.purchase_price ?? null,
        sale_price: parsed.data.sale_price ?? null,
        min_stock: parsed.data.min_stock ?? null,
        is_active: formData.get("is_active") === "on",
      })
      .eq("id", id);
    if (error) return fromError(error);
    revalidatePath(`/produits/${productId}`);
    return { ok: true, message: "Variante enregistrée." };
  } catch (e) {
    return fromError(e);
  }
}

export async function generateBarcodeForVariant(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("products.manage");
    const id = uuid().parse(formData.get("id"));
    const productId = uuid().parse(formData.get("product_id"));
    const supabase = await createClient();
    const { data: code, error } = await supabase.rpc("generate_internal_barcode");
    if (error) return fromError(error);
    const { error: e2 } = await supabase.from("product_variants").update({ barcode: code, barcode_is_internal: true }).eq("id", id).is("barcode", null);
    if (e2) return fromError(e2);
    revalidatePath(`/produits/${productId}`);
    return { ok: true, message: `Code interne ${code} attribué.` };
  } catch (e) {
    return fromError(e);
  }
}

// --- Catégories -------------------------------------------------------------

export async function saveCategory(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("products.manage");
    const parsed = z
      .object({ id: optionalUuid(), name: requiredText("Le nom", 80), description: optionalText(300) })
      .safeParse(formToObject(formData));
    if (!parsed.success) return fromZod(parsed.error);
    const supabase = await createClient();
    const row = { name: parsed.data.name, description: parsed.data.description ?? null };
    const { error } = parsed.data.id
      ? await supabase.from("categories").update(row).eq("id", parsed.data.id)
      : await supabase.from("categories").insert(row);
    if (error) return fromError(error);
    revalidatePath("/produits/categories");
    return { ok: true, message: parsed.data.id ? "Catégorie modifiée." : "Catégorie créée." };
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteCategory(_prev: unknown, formData: FormData): Promise<ActionResult<never>> {
  try {
    await requireAction("products.manage");
    const id = uuid().parse(formData.get("id"));
    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return fromError(error);
    revalidatePath("/produits/categories");
    return { ok: true, message: "Catégorie supprimée. Ses produits sont désormais sans catégorie." };
  } catch (e) {
    return fromError(e);
  }
}

// --- Import CSV --------------------------------------------------------------

async function existingBarcodes(supabase: Awaited<ReturnType<typeof createClient>>, codes: string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();
  const found = new Set<string>();
  for (let i = 0; i < codes.length; i += 200) {
    const { data } = await supabase.from("product_variants").select("barcode").in("barcode", codes.slice(i, i + 200));
    data?.forEach((r) => r.barcode && found.add(r.barcode));
  }
  return found;
}

export async function previewImport(_prev: unknown, formData: FormData): Promise<ActionResult<{ preview: ReturnType<typeof analyzeProductCsv>; csv: string }>> {
  try {
    await requireAction("products.manage");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choisissez un fichier CSV.");
    if (file.size > 2 * 1024 * 1024) return fail("Fichier trop volumineux (2 Mo maximum).");
    const text = await file.text();
    const supabase = await createClient();
    const first = analyzeProductCsv(text);
    const codes = first.products.flatMap((p) => p.variants.map((v) => v.barcode).filter((b): b is string => !!b));
    const preview = analyzeProductCsv(text, await existingBarcodes(supabase, codes));
    return { ok: true, data: { preview, csv: text } };
  } catch (e) {
    return fromError(e);
  }
}

export async function confirmImport(_prev: unknown, formData: FormData): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAction("products.manage");
    const text = String(formData.get("csv") ?? "");
    const supabase = await createClient();
    // Le fichier est revalidé côté serveur : l'aperçu du navigateur n'est pas une garantie.
    const first = analyzeProductCsv(text);
    const codes = first.products.flatMap((p) => p.variants.map((v) => v.barcode).filter((b): b is string => !!b));
    const preview = analyzeProductCsv(text, await existingBarcodes(supabase, codes));
    if (preview.errors.length) return fail(`Le fichier contient ${preview.errors.length} erreur(s) : corrigez-les avant d'importer.`);
    if (!preview.products.length) return fail("Aucun produit à importer.");
    const payload = preview.products.map((p) => ({
      name: p.name,
      category: p.category,
      brand: p.brand,
      reference: p.reference,
      description: p.description,
      purchase_price: p.variants[0].purchasePrice,
      sale_price: p.variants[0].salePrice,
      variants: p.variants.map((v) => ({
        label: v.label,
        attributes: v.attributes,
        barcode: v.barcode,
        generate_barcode: !v.barcode,
        purchase_price: v.purchasePrice,
        sale_price: v.salePrice,
        min_stock: v.minStock,
        initial_stock: v.initialStock,
      })),
    }));
    const { data, error } = await supabase.rpc("import_products", { p_products: payload });
    if (error) return fromError(error);
    revalidatePath("/produits");
    return { ok: true, message: `${data} produit(s) importé(s).`, data: { count: data as number } };
  } catch (e) {
    return fromError(e);
  }
}
