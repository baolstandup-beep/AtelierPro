import { describe, expect, it } from "vitest";
import { allocateDiscount, cashDifference, checkout, grossMargin, percentToAmount, returnValue } from "@/lib/calc";

const lines = [
  { variantId: "parfum", unitPrice: 8000, quantity: 1 },
  { variantId: "robe", unitPrice: 25000, quantity: 1 },
];

describe("calculs de caisse (miroir de create_sale)", () => {
  it("produit acheté 5 000, vendu 8 000 : marge brute unitaire 3 000 FCFA", () => {
    expect(grossMargin(8000, 5000)).toEqual({ margin: 3000, rate: 37.5 });
    expect(grossMargin(0, 0)).toEqual({ margin: 0, rate: null });
  });

  it("répartit une remise sans perdre un franc", () => {
    const shares = allocateDiscount(lines, 3001);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(3001);
    expect(shares).toEqual([727, 2274]); // reliquat sur la plus grosse ligne
    expect(() => allocateDiscount(lines, 40000)).toThrow();
  });

  it("convertit une remise en pourcentage à l'unité inférieure", () => {
    expect(percentToAmount(33000, 10)).toBe(3300);
    expect(percentToAmount(9999, 15)).toBe(1499);
    expect(percentToAmount(1000, 0)).toBe(0);
  });

  it("paiement mixte avec rendu de monnaie sur la part espèces", () => {
    const s = checkout(lines, 0, [
      { method: "cash", amount: 10000 },
      { method: "wave", amount: 10000 },
      { method: "orange_money", amount: 13000 },
    ], 20000);
    expect(s).toMatchObject({ subtotal: 33000, total: 33000, paid: 33000, cashPart: 10000, change: 10000, balanceDue: 0, overpaid: false });
  });

  it("vente à crédit : le reste à payer n'est pas encaissé", () => {
    const s = checkout(lines, 1000, [{ method: "cash", amount: 12000 }], 12000);
    expect(s).toMatchObject({ total: 32000, paid: 12000, balanceDue: 20000, change: 0 });
  });

  it("détecte un trop-perçu électronique", () => {
    expect(checkout(lines, 0, [{ method: "wave", amount: 40000 }]).overpaid).toBe(true);
  });

  it("valeur de retour : proportionnelle, la dernière unité solde la ligne", () => {
    const line = { lineTotal: 22000, quantity: 3, returnedQty: 0, refundedAmount: 0 };
    const first = returnValue(line, 1);
    const second = returnValue({ ...line, returnedQty: 1, refundedAmount: first }, 1);
    const last = returnValue({ ...line, returnedQty: 2, refundedAmount: first + second }, 1);
    expect([first, second, last]).toEqual([7333, 7333, 7334]);
    expect(() => returnValue({ ...line, returnedQty: 3, refundedAmount: 22000 }, 1)).toThrow();
  });

  it("écart de caisse : motif requis dès le premier franc", () => {
    expect(cashDifference(23500, 23000)).toEqual({ difference: -500, needsReason: true });
    expect(cashDifference(23500, 23500)).toEqual({ difference: 0, needsReason: false });
  });
});
