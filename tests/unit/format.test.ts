import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatFCFA, parseAmount, todayInShop } from "@/lib/format";

describe("formatage FCFA et dates", () => {
  it("affiche les montants sans décimales avec espaces insécables", () => {
    expect(formatFCFA(1250000)).toBe("1 250 000 FCFA");
    expect(formatFCFA(0)).toBe("0 FCFA");
    expect(formatFCFA(-500)).toMatch(/^-500 FCFA$/);
    expect(formatFCFA(null)).toBe("0 FCFA");
  });

  it("lit les montants saisis à la française", () => {
    expect(parseAmount("12 500")).toBe(12500);
    expect(parseAmount("12.500")).toBe(12500);
    expect(parseAmount("8000 FCFA")).toBe(8000);
    expect(parseAmount("12,5")).toBeNull(); // pas de centimes en FCFA
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });

  it("affiche les dates en jj/mm/aaaa à l'heure de Dakar", () => {
    expect(formatDate("2026-03-07")).toBe("07/03/2026");
    expect(formatDate("2026-03-07T23:30:00Z")).toBe("07/03/2026");
    expect(formatDateTime("2026-03-07T09:05:00Z")).toBe("07/03/2026 à 09:05");
    expect(todayInShop(new Date("2026-12-31T23:59:00Z"))).toBe("2026-12-31");
  });
});
