import { isCode128Compatible } from "./barcode";
import { parseAmount } from "./format";
import { parseCsv } from "./csv";

export const IMPORT_COLUMNS = [
  "nom", "categorie", "marque", "reference", "variante", "taille", "couleur", "contenance",
  "code_barres", "prix_achat", "prix_vente", "stock_initial", "seuil_minimum", "description",
] as const;

export interface ImportVariant {
  label: string;
  attributes: Record<string, string>;
  barcode: string | null;
  purchasePrice: number;
  salePrice: number;
  initialStock: number;
  minStock: number | null;
}

export interface ImportProduct {
  key: string;
  name: string;
  category: string | null;
  brand: string | null;
  reference: string | null;
  description: string | null;
  variants: ImportVariant[];
  rows: number[];
}

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ImportPreview {
  products: ImportProduct[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  rowCount: number;
}

const normalizeHeader = (h: string) =>
  h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s-]+/g, "_");

/**
 * Analyse un CSV produits. Les lignes partageant le même nom (et la même
 * référence) deviennent les variantes d'un même produit.
 */
export function analyzeProductCsv(text: string, existingBarcodes: Set<string> = new Set()): ImportPreview {
  const rows = parseCsv(text);
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  if (rows.length < 2) {
    return { products: [], errors: [{ row: 1, message: "Le fichier ne contient aucune ligne de produit." }], warnings, rowCount: 0 };
  }
  const headers = rows[0].map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);
  for (const required of ["nom", "prix_vente"]) {
    if (idx(required) === -1) errors.push({ row: 1, message: `Colonne obligatoire manquante : « ${required} ».` });
  }
  if (errors.length) return { products: [], errors, warnings, rowCount: rows.length - 1 };

  const get = (r: string[], name: string) => {
    const i = idx(name);
    return i === -1 ? "" : (r[i] ?? "").trim();
  };
  const products = new Map<string, ImportProduct>();
  const seenBarcodes = new Map<string, number>();

  rows.slice(1).forEach((r, i) => {
    const rowNumber = i + 2;
    const name = get(r, "nom");
    if (!name) {
      errors.push({ row: rowNumber, message: "Nom du produit manquant." });
      return;
    }
    const salePrice = parseAmount(get(r, "prix_vente"));
    if (salePrice === null || salePrice < 0) {
      errors.push({ row: rowNumber, message: "Prix de vente invalide (nombre entier en FCFA attendu)." });
      return;
    }
    const purchaseRaw = get(r, "prix_achat");
    const purchasePrice = purchaseRaw === "" ? 0 : parseAmount(purchaseRaw);
    if (purchasePrice === null || purchasePrice < 0) {
      errors.push({ row: rowNumber, message: "Prix d'achat invalide." });
      return;
    }
    if (purchaseRaw === "") warnings.push({ row: rowNumber, message: "Prix d'achat absent : la marge sera surestimée." });
    else if (purchasePrice > salePrice) warnings.push({ row: rowNumber, message: "Prix d'achat supérieur au prix de vente." });

    const stockRaw = get(r, "stock_initial");
    const initialStock = stockRaw === "" ? 0 : Number(stockRaw);
    if (!Number.isInteger(initialStock) || initialStock < 0) {
      errors.push({ row: rowNumber, message: "Stock initial invalide (entier positif attendu)." });
      return;
    }
    const minRaw = get(r, "seuil_minimum");
    const minStock = minRaw === "" ? null : Number(minRaw);
    if (minStock !== null && (!Number.isInteger(minStock) || minStock < 0)) {
      errors.push({ row: rowNumber, message: "Seuil minimum invalide." });
      return;
    }
    const barcode = get(r, "code_barres") || null;
    if (barcode) {
      if (!isCode128Compatible(barcode)) {
        errors.push({ row: rowNumber, message: `Code-barres « ${barcode} » invalide.` });
        return;
      }
      if (existingBarcodes.has(barcode)) {
        errors.push({ row: rowNumber, message: `Code-barres ${barcode} déjà attribué à un article existant.` });
        return;
      }
      const dup = seenBarcodes.get(barcode);
      if (dup) {
        errors.push({ row: rowNumber, message: `Code-barres ${barcode} en double (déjà ligne ${dup}).` });
        return;
      }
      seenBarcodes.set(barcode, rowNumber);
    }
    const attributes: Record<string, string> = {};
    for (const attr of ["taille", "couleur", "contenance"]) {
      const v = get(r, attr);
      if (v) attributes[attr] = v;
    }
    const label = get(r, "variante") || Object.values(attributes).join(" / ") || "Standard";
    const reference = get(r, "reference") || null;
    const key = `${name.toLowerCase()}|${(reference ?? "").toLowerCase()}`;
    let product = products.get(key);
    if (!product) {
      product = {
        key,
        name,
        category: get(r, "categorie") || null,
        brand: get(r, "marque") || null,
        reference,
        description: get(r, "description") || null,
        variants: [],
        rows: [],
      };
      products.set(key, product);
    }
    if (product.variants.some((v) => v.label.toLowerCase() === label.toLowerCase())) {
      errors.push({ row: rowNumber, message: `Variante « ${label} » en double pour « ${name} ».` });
      return;
    }
    product.variants.push({ label, attributes, barcode, purchasePrice, salePrice, initialStock, minStock });
    product.rows.push(rowNumber);
  });

  return { products: [...products.values()], errors, warnings, rowCount: rows.length - 1 };
}
