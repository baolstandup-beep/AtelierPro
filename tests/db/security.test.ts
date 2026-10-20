import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, op, seedShop, stockOf, type TestDb } from "./helpers";

let db: TestDb;
let shop: Awaited<ReturnType<typeof seedShop>>;

beforeAll(async () => {
  db = await createTestDb();
  shop = await seedShop(db);
});
afterAll(async () => db?.close());

describe("authentification et rôles", () => {
  it("un nouveau compte (inscription) est inactif et sans droits, quelles que soient ses métadonnées", async () => {
    const [{ id }] = await db.sql<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ('pirate@test.local', $1) returning id",
      [{ full_name: "Pirate", role: "admin" }],
    );
    const [profile] = await db.sql<{ role: string; is_active: boolean }>("select role, is_active from public.profiles where id = $1", [id]);
    expect(profile).toEqual({ role: "employee", is_active: false });
    expect(await db.rpc(id, "has_permission", { p_permission: "products.view" })).toBe(false);
    await expect(db.as(id, (c) => c.query("select * from public.products"))).resolves.toMatchObject({ rowCount: 0 });
  });

  it("un visiteur anonyme ne lit aucune table", async () => {
    await expect(db.as(null, (c) => c.query("select * from public.products"))).rejects.toThrow(/permission denied/);
    await expect(db.as(null, (c) => c.query("select * from public.sales"))).rejects.toThrow(/permission denied/);
    await expect(db.rpc(null, "report_summary", { p_from: "2000-01-01", p_to: "2100-01-01" })).rejects.toThrow(/permission denied/);
  });

  it("un employé ne peut pas s'attribuer de permissions ni changer de rôle", async () => {
    const employee = await db.createUser("employee");
    await expect(
      db.as(employee, (c) => c.query("update public.profiles set role = 'admin' where id = auth.uid()")),
    ).resolves.toMatchObject({ rowCount: 0 }); // RLS : aucune ligne modifiable
    const [p] = await db.sql<{ role: string }>("select role from public.profiles where id = $1", [employee]);
    expect(p.role).toBe("employee");
  });

  it("un administrateur ne peut pas modifier ses propres droits mais peut gérer les autres", async () => {
    await expect(
      db.as(shop.admin, (c) => c.query("update public.profiles set is_active = false where id = auth.uid()")),
    ).rejects.toThrow(/propre rôle/);
    const employee = await db.createUser("employee");
    await db.as(shop.admin, (c) =>
      c.query("update public.profiles set permissions = array['reports.view'] where id = $1", [employee]),
    );
    expect(await db.rpc(employee, "has_permission", { p_permission: "reports.view" })).toBe(true);
    await expect(
      db.as(shop.admin, (c) => c.query("update public.profiles set permissions = array['root'] where id = $1", [employee])),
    ).rejects.toThrow(/Permission inconnue/);
  });

  it("un compte désactivé perd immédiatement tous ses droits", async () => {
    const cashier = await db.createUser("cashier");
    expect(await db.rpc(cashier, "has_permission", { p_permission: "sales.create" })).toBe(true);
    await db.as(shop.admin, (c) => c.query("update public.profiles set is_active = false where id = $1", [cashier]));
    expect(await db.rpc(cashier, "has_permission", { p_permission: "sales.create" })).toBe(false);
  });

  it("il reste toujours au moins un administrateur actif", async () => {
    await expect(db.sql("update public.profiles set role = 'cashier' where id = $1", [shop.admin])).rejects.toThrow(/au moins un administrateur/);
  });
});

describe("contrôles côté base de données", () => {
  it("le stock ne peut pas être modifié directement, même par un gestionnaire", async () => {
    await expect(
      db.as(shop.admin, (c) => c.query("update public.product_variants set stock_qty = 999 where id = $1", [shop.perfume.id])),
    ).rejects.toThrow(/permission denied/);
    // même en contournant les privilèges de colonne (superutilisateur), le déclencheur bloque
    await expect(db.sql("update public.product_variants set stock_qty = 999 where id = $1", [shop.perfume.id])).rejects.toThrow(
      /mouvement de stock/,
    );
    expect(await stockOf(db, shop.perfume.id)).toBe(10);
  });

  it("un caissier ne peut pas créer de produit ni corriger le stock", async () => {
    await expect(
      db.rpc(shop.cashier, "create_product", { p_product: { name: "X", sale_price: 1 }, p_variants: [] }),
    ).rejects.toThrow(/Permission refusée/);
    await expect(
      db.rpc(shop.cashier, "adjust_stock", { p_variant_id: shop.perfume.id, p_quantity: 5, p_type: "entry", p_reason: "test" }),
    ).rejects.toThrow(/Permission refusée/);
  });

  it("un gestionnaire de stock ne peut ni vendre ni consulter les rapports ou les clients", async () => {
    const stock = await db.createUser("stock_manager");
    await expect(
      db.rpc(stock, "create_sale", {
        p_client_operation_id: op(),
        p_cash_session_id: shop.session,
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
        p_payments: [{ method: "cash", amount: 8000 }],
      }),
    ).rejects.toThrow(/Permission refusée/);
    await expect(db.rpc(stock, "report_summary", { p_from: "2000-01-01", p_to: "2100-01-01" })).rejects.toThrow(/Permission refusée/);
    const { rowCount } = await db.as(stock, (c) => c.query("select * from public.customers"));
    expect(rowCount).toBe(0);
  });

  it("un caissier ne voit que ses propres ventes", async () => {
    const other = await db.createUser("cashier");
    await db.rpc(shop.cashier, "create_sale", {
      p_client_operation_id: op(),
      p_cash_session_id: shop.session,
      p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
      p_payments: [{ method: "cash", amount: 8000 }],
    });
    const mine = await db.as(shop.cashier, (c) => c.query("select id from public.sales"));
    const theirs = await db.as(other, (c) => c.query("select id from public.sales"));
    expect(mine.rowCount).toBeGreaterThan(0);
    expect(theirs.rowCount).toBe(0);
  });

  it("les fonctions internes ne sont pas appelables via l'API", async () => {
    await expect(
      db.rpc(shop.admin, "apply_stock_movement", {
        p_variant_id: shop.perfume.id,
        p_quantity: 100,
        p_type: "entry",
        p_reason: "x",
        p_reference_type: null,
        p_reference_id: null,
      }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.rpc(shop.admin, "log_audit", { p_action: "x", p_entity_type: "x", p_entity_id: "x" }),
    ).rejects.toThrow(/permission denied/);
    await expect(db.rpc(shop.admin, "register_login_attempt", { p_key: "k", p_success: false })).rejects.toThrow(
      /permission denied/,
    );
  });

  it("l'historique (mouvements, journal, paiements) est non modifiable", async () => {
    await expect(db.sql("delete from public.stock_movements")).rejects.toThrow(/Historique non modifiable/);
    await expect(db.sql("update public.payments set amount = 1")).rejects.toThrow(/Historique non modifiable/);
    await expect(db.sql("delete from public.audit_logs")).rejects.toThrow(/Historique non modifiable/);
  });
});
