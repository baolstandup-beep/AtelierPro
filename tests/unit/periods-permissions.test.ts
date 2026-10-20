import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolvePeriod } from "@/lib/periods";
import { can, effectivePermissions, homeFor, PERMISSIONS, ROLE_DEFAULTS } from "@/lib/permissions";

describe("périodes (heure de Dakar)", () => {
  const now = new Date("2026-10-20T15:00:00Z");
  it("aujourd'hui : [00:00, 24:00[", () => {
    expect(resolvePeriod({ period: "today" }, now)).toMatchObject({ from: "2026-10-20T00:00:00.000Z", to: "2026-10-21T00:00:00.000Z" });
  });
  it("mois dernier et période personnalisée inversée", () => {
    expect(resolvePeriod({ period: "last_month" }, now)).toMatchObject({ fromDate: "2026-09-01", toDate: "2026-09-30" });
    expect(resolvePeriod({ period: "custom", from: "2026-10-10", to: "2026-10-01" }, now)).toMatchObject({ fromDate: "2026-10-01", toDate: "2026-10-10" });
  });
  it("valeur inconnue → aujourd'hui", () => {
    expect(resolvePeriod({ period: "n'importe quoi" }, now).key).toBe("today");
  });
});

describe("permissions (miroir d'affichage de la base)", () => {
  it("le miroir TypeScript correspond exactement à role_default_permissions", () => {
    const sql = readFileSync("supabase/migrations/20261020000200_core_functions.sql", "utf8");
    const block = (role: string) => {
      const m = sql.match(new RegExp(`when '${role}' then array\\[([^\\]]*)\\]`));
      return [...(m?.[1].matchAll(/'([a-z_.]+)'/g) ?? [])].map((x) => x[1]).sort();
    };
    for (const role of ["cashier", "stock_manager"] as const) expect(block(role)).toEqual([...ROLE_DEFAULTS[role]].sort());
    const catalog = readFileSync("supabase/migrations/20261020000100_schema.sql", "utf8");
    const keys = [...catalog.matchAll(/\('([a-z_]+\.[a-z_]+)',\s+'/g)].map((x) => x[1]).sort();
    expect(keys).toEqual([...PERMISSIONS].sort());
  });
  it("un caissier vend mais n'administre pas", () => {
    const p = effectivePermissions("cashier");
    expect(can(p, "sales.create")).toBe(true);
    expect(can(p, "users.manage", "reports.view")).toBe(false);
    expect(homeFor(p)).toBe("/caisse");
    expect(homeFor(effectivePermissions("admin"))).toBe("/tableau-de-bord");
  });
});
