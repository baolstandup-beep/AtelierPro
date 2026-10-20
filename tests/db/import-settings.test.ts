import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, seedShop, type TestDb } from "./helpers";

let db: TestDb;
let shop: Awaited<ReturnType<typeof seedShop>>;

beforeAll(async () => {
  db = await createTestDb();
  shop = await seedShop(db);
});
afterAll(async () => db?.close());

describe("import CSV et réglages", () => {
  it("import tout ou rien : un code-barres en doublon annule tout le lot", async () => {
    const [{ barcode }] = await db.sql<{ barcode: string }>("select barcode from public.product_variants where id = $1", [shop.perfume.id]);
    const [{ count: before }] = await db.sql<{ count: string }>("select count(*) from public.products");
    await expect(
      db.rpc(shop.admin, "import_products", {
        p_products: [
          { name: "Sac cuir", category: "Maroquinerie", sale_price: 30000, variants: [{ label: "Noir", initial_stock: 2 }] },
          { name: "Doublon", sale_price: 1000, variants: [{ label: "X", barcode }] },
        ],
      }),
    ).rejects.toThrow(/déjà attribué/);
    const [{ count: after }] = await db.sql<{ count: string }>("select count(*) from public.products");
    expect(after).toBe(before);
    expect(await db.sql("select * from public.categories where name = 'Maroquinerie'")).toHaveLength(0);
  });

  it("import valide : catégories créées, variantes et stock initial tracés", async () => {
    const count = await db.rpc<number>(shop.admin, "import_products", {
      p_products: [
        { name: "Sac cuir", category: "Maroquinerie", sale_price: 30000, purchase_price: 18000, variants: [{ label: "Noir", initial_stock: 2 }, { label: "Camel", initial_stock: 1 }] },
      ],
    });
    expect(count).toBe(1);
    const moves = await db.sql("select m.* from public.stock_movements m join public.product_variants v on v.id = m.variant_id join public.products p on p.id = v.product_id where p.name = 'Sac cuir'");
    expect(moves).toHaveLength(2);
    const caissier = await db.createUser("cashier");
    await expect(db.rpc(caissier, "import_products", { p_products: [{ name: "X", sale_price: 1, variants: [] }] })).rejects.toThrow(/Permission refusée/);
  });

  it("la modification des réglages est réservée et journalisée", async () => {
    const before = await db.as(shop.cashier, (c) => c.query("update public.shop_settings set allow_negative_stock = true where id = 1"));
    expect(before.rowCount).toBe(0); // RLS : un caissier ne modifie rien
    await db.as(shop.admin, (c) => c.query("update public.shop_settings set max_discount_percent = 15 where id = 1"));
    const logs = await db.sql<{ details: { after: { max_discount_percent: number } } }>("select details from public.audit_logs where action = 'settings.update'");
    expect(logs).toHaveLength(1);
    expect(logs[0].details.after.max_discount_percent).toBe(15);
  });

  it("stock négatif autorisé exceptionnellement par l'administrateur", async () => {
    await db.as(shop.admin, (c) => c.query("update public.shop_settings set allow_negative_stock = true where id = 1"));
    const [{ stock_qty }] = await db.sql<{ stock_qty: number }>("select stock_qty from public.product_variants where id = $1", [shop.dressL.id]);
    await db.rpc(shop.cashier, "create_sale", {
      p_client_operation_id: crypto.randomUUID(),
      p_cash_session_id: shop.session,
      p_items: [{ variant_id: shop.dressL.id, quantity: stock_qty + 1 }],
      p_payments: [{ method: "wave", amount: 25000 * (stock_qty + 1) }],
    });
    const [after] = await db.sql<{ stock_qty: number }>("select stock_qty from public.product_variants where id = $1", [shop.dressL.id]);
    expect(after.stock_qty).toBe(-1);
    await db.as(shop.admin, (c) => c.query("update public.shop_settings set allow_negative_stock = false where id = 1"));
  });

  it("dépense hors caisse : aucun mouvement d'espèces", async () => {
    const id = await db.rpc<string>(shop.admin, "record_expense", {
      p_category: "electricity", p_amount: 15000, p_expense_date: "2026-10-01", p_method: "wave",
    });
    expect(await db.sql("select * from public.cash_movements where reference_id = $1", [id])).toHaveLength(0);
    await expect(
      db.rpc(shop.admin, "record_expense", { p_category: "rent", p_amount: 1, p_expense_date: "2026-10-01", p_method: "wave", p_cash_session_id: shop.session }),
    ).rejects.toThrow(/Seule une dépense en espèces/);
  });
});
