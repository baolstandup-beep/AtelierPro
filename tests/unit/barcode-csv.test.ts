import { describe, expect, it } from "vitest";
import { azertyToDigits, isCode128Compatible, isValidGtin, normalizeScan } from "@/lib/barcode";
import { detectDelimiter, parseCsv, toCsv } from "@/lib/csv";
import { analyzeProductCsv } from "@/lib/product-import";

describe("codes-barres", () => {
  it("corrige un lecteur QWERTY branché sur un poste AZERTY", () => {
    expect(azertyToDigits("é&&\"'(-è_çà")).toBe("21134567890");
    expect(azertyToDigits("200000000012")).toBeNull();
    expect(azertyToDigits("abc")).toBeNull();
    expect(normalizeScan(" 200000000012\r\n")).toBe("200000000012");
  });
  it("vérifie la clé EAN-13", () => {
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("4006381333932")).toBe(false);
    expect(isCode128Compatible("EBA-001")).toBe(true);
    expect(isCode128Compatible("é")).toBe(false);
  });
});

describe("CSV", () => {
  it("lit le format Excel français (point-virgule, guillemets, BOM)", () => {
    const text = '﻿nom;description\n"Robe ""Awa""";"ligne1\nligne2"\n';
    expect(detectDelimiter(text)).toBe(";");
    expect(parseCsv(text)).toEqual([["nom", "description"], ['Robe "Awa"', "ligne1\nligne2"]]);
  });
  it("neutralise les formules à l'export", () => {
    const csv = toCsv(["a"], [["=HYPERLINK(1)"], [-500]]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("-500");
  });
});

describe("import produits", () => {
  const header = "nom;categorie;variante;taille;code_barres;prix_achat;prix_vente;stock_initial";
  it("regroupe les variantes et détecte les erreurs avant tout enregistrement", () => {
    const csv = [
      header,
      "Robe Awa;Robes;;M;;12000;25000;3",
      "Robe Awa;Robes;;L;;12000;25000;2",
      "Oud;Parfums;50 ml;;6111234567890;5000;8000;10",
      "Musc;Parfums;;;6111234567890;3000;6000;1",
      "Sac;;;;;;abc;1",
      ";Parfums;;;;1000;2000;1",
    ].join("\n");
    const r = analyzeProductCsv(csv, new Set());
    expect(r.products.map((p) => [p.name, p.variants.map((v) => v.label)])).toEqual([
      ["Robe Awa", ["M", "L"]],
      ["Oud", ["50 ml"]],
    ]);
    expect(r.errors.map((e) => e.row)).toEqual([5, 6, 7]);
    expect(r.errors[0].message).toMatch(/en double/);
  });
  it("refuse un code-barres déjà présent en base", () => {
    const r = analyzeProductCsv(`${header}\nOud;;;;6111234567890;5000;8000;1`, new Set(["6111234567890"]));
    expect(r.errors[0].message).toMatch(/déjà attribué/);
  });
  it("exige les colonnes obligatoires", () => {
    expect(analyzeProductCsv("nom;prix\nX;1").errors[0].message).toMatch(/prix_vente/);
  });
});
