import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, op, seedShop, stockOf, type TestDb } from "./helpers";

let db: TestDb;
let shop: Awaited<ReturnType<typeof seedShop>>;

type SaleResult = { id: string; sale_number: string; duplicate: boolean; total: number; paid: number; balance_due: number; change: number };

beforeAll(async () => {
  db = await createTestDb();
  shop = await seedShop(db);
});
afterAll(async () => db?.close());

const sale = (uid: string, args: Record<string, unknown>) =>
  db.rpc<SaleResult>(uid, "create_sale", { p_client_operation_id: op(), p_cash_session_id: shop.session, ...args });

describe("vente", () => {
  it("vente avec plusieurs articles : totaux calculés en base, stock déduit une fois", async () => {
    const before = { p: await stockOf(db, shop.perfume.id), d: await stockOf(db, shop.dressM.id) };
    const res = await sale(shop.cashier, {
      p_items: [
        { variant_id: shop.perfume.id, quantity: 2 },
        { variant_id: shop.dressM.id, quantity: 1 },
      ],
      p_payments: [{ method: "cash", amount: 41000 }],
    });
    expect(res.total).toBe(2 * 8000 + 25000);
    expect(res.balance_due).toBe(0);
    expect(res.sale_number).toMatch(/^V\d{6}-\d{5}$/);
    expect(await stockOf(db, shop.perfume.id)).toBe(before.p - 2);
    expect(await stockOf(db, shop.dressM.id)).toBe(before.d - 1);
    const items = await db.sql<{ unit_price: number; unit_cost: number; line_total: number }>(
      "select unit_price, unit_cost, line_total from public.sale_items where sale_id = $1 order by unit_price",
      [res.id],
    );
    expect(items).toEqual([
      { unit_price: 8000, unit_cost: 5000, line_total: 16000 },
      { unit_price: 25000, unit_cost: 12000, line_total: 25000 },
    ]);
    const moves = await db.sql("select * from public.stock_movements where reference_id = $1", [res.id]);
    expect(moves).toHaveLength(2);
  });

  it("le même article scanné deux fois est regroupé sur une ligne", async () => {
    const res = await sale(shop.cashier, {
      p_items: [
        { variant_id: shop.perfume.id, quantity: 1 },
        { variant_id: shop.perfume.id, quantity: 1 },
      ],
      p_payments: [{ method: "wave", amount: 16000, reference: "WAVE-123" }],
    });
    const items = await db.sql<{ quantity: number }>("select quantity from public.sale_items where sale_id = $1", [res.id]);
    expect(items).toEqual([{ quantity: 2 }]);
  });

  it("paiement mixte espèces + Wave + Orange Money, avec rendu de monnaie", async () => {
    const res = await sale(shop.cashier, {
      p_items: [{ variant_id: shop.dressM.id, quantity: 1 }],
      p_payments: [
        { method: "cash", amount: 10000 },
        { method: "wave", amount: 10000 },
        { method: "orange_money", amount: 5000 },
      ],
      p_cash_tendered: 15000,
    });
    expect(res).toMatchObject({ total: 25000, paid: 25000, balance_due: 0, change: 5000 });
    const pays = await db.sql<{ method: string; amount: number }>(
      "select method, amount from public.payments where sale_id = $1 order by method::text",
      [res.id],
    );
    expect(pays).toEqual([
      { method: "cash", amount: 10000 },
      { method: "orange_money", amount: 5000 },
      { method: "wave", amount: 10000 },
    ]);
    // seule la part espèces entre dans la caisse (la monnaie rendue n'y reste pas)
    const [cash] = await db.sql<{ amount: number }>(
      "select amount from public.cash_movements where reference_id = $1",
      [res.id],
    );
    expect(cash.amount).toBe(10000);
  });

  it("refuse une vente si le stock est insuffisant, sans rien enregistrer", async () => {
    const before = await stockOf(db, shop.dressL.id);
    const [{ count: salesBefore }] = await db.sql<{ count: string }>("select count(*) from public.sales");
    await expect(
      sale(shop.cashier, {
        p_items: [
          { variant_id: shop.perfume.id, quantity: 1 },
          { variant_id: shop.dressL.id, quantity: before + 1 },
        ],
        p_payments: [{ method: "cash", amount: 8000 + 25000 * (before + 1) }],
      }),
    ).rejects.toThrow(/Stock insuffisant/);
    expect(await stockOf(db, shop.dressL.id)).toBe(before);
    const [{ count: salesAfter }] = await db.sql<{ count: string }>("select count(*) from public.sales");
    expect(salesAfter).toBe(salesBefore);
  });

  it("une requête rejouée (même identifiant d'opération) ne crée pas de seconde vente", async () => {
    const id = op();
    const args = {
      p_client_operation_id: id,
      p_cash_session_id: shop.session,
      p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
      p_payments: [{ method: "cash", amount: 8000 }],
    };
    const before = await stockOf(db, shop.perfume.id);
    const first = await db.rpc<SaleResult>(shop.cashier, "create_sale", args);
    const second = await db.rpc<SaleResult>(shop.cashier, "create_sale", args);
    expect(second.id).toBe(first.id);
    expect(second.duplicate).toBe(true);
    expect(await stockOf(db, shop.perfume.id)).toBe(before - 1);
  });

  it("deux requêtes simultanées identiques ne produisent qu'une vente", async () => {
    const args = {
      p_client_operation_id: op(),
      p_cash_session_id: shop.session,
      p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
      p_payments: [{ method: "cash", amount: 8000 }],
    };
    const before = await stockOf(db, shop.perfume.id);
    const results = await Promise.all([
      db.rpc<SaleResult>(shop.cashier, "create_sale", args),
      db.rpc<SaleResult>(shop.cashier, "create_sale", args),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await stockOf(db, shop.perfume.id)).toBe(before - 1);
  });

  it("refuse un paiement supérieur au total", async () => {
    await expect(
      sale(shop.cashier, { p_items: [{ variant_id: shop.perfume.id, quantity: 1 }], p_payments: [{ method: "wave", amount: 9000 }] }),
    ).rejects.toThrow(/dépassent le total/);
  });

  it("remise : répartie sur les lignes et plafonnée pour un caissier", async () => {
    // plafond par défaut : 10 %
    await expect(
      sale(shop.cashier, {
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
        p_discount_amount: 1000,
        p_payments: [{ method: "cash", amount: 7000 }],
      }),
    ).rejects.toThrow(/plafond/);
    const res = await sale(shop.cashier, {
      p_items: [
        { variant_id: shop.perfume.id, quantity: 1 },
        { variant_id: shop.dressM.id, quantity: 1 },
      ],
      p_discount_amount: 3001,
      p_payments: [{ method: "cash", amount: 29999 }],
    });
    expect(res.total).toBe(33000 - 3001);
    const lines = await db.sql<{ discount_amount: number; line_total: number }>(
      "select discount_amount, line_total from public.sale_items where sale_id = $1",
      [res.id],
    );
    expect(lines.reduce((s, l) => s + l.discount_amount, 0)).toBe(3001);
    expect(lines.reduce((s, l) => s + l.line_total, 0)).toBe(res.total);
    const audit = await db.sql("select * from public.audit_logs where action = 'sale.discount' and entity_id = $1", [res.id]);
    expect(audit).toHaveLength(1);
  });

  it("un employé sans la permission de remise ne peut pas en accorder", async () => {
    const seller = await db.createUser("employee", { permissions: ["sales.create"] });
    await expect(
      sale(seller, {
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
        p_discount_amount: 100,
        p_payments: [{ method: "cash", amount: 7900 }],
      }),
    ).rejects.toThrow(/pas autorisé à accorder une remise/);
  });

  it("vente à crédit : client obligatoire, permission requise, non comptée comme encaissée", async () => {
    const [{ id: customer }] = await db.sql<{ id: string }>(
      "insert into public.customers (first_name, phone) values ('Mariama', '771234567') returning id",
    );
    await expect(
      sale(shop.cashier, { p_items: [{ variant_id: shop.perfume.id, quantity: 1 }], p_payments: [{ method: "cash", amount: 3000 }] }),
    ).rejects.toThrow(/sélectionnez un client/);
    await expect(
      sale(shop.cashier, {
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
        p_payments: [{ method: "cash", amount: 3000 }],
        p_customer_id: customer,
      }),
    ).rejects.toThrow(/pas autorisé à vendre à crédit/);
    const res = await sale(shop.admin, {
      p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
      p_payments: [{ method: "cash", amount: 3000 }],
      p_customer_id: customer,
    });
    expect(res).toMatchObject({ total: 8000, paid: 3000, balance_due: 5000 });

    // Règlement partiel puis total de la créance
    await db.rpc(shop.cashier, "record_credit_payment", {
      p_client_operation_id: op(),
      p_customer_id: customer,
      p_amount: 2000,
      p_method: "wave",
    });
    let [s] = await db.sql<{ balance_due: number; amount_paid: number }>("select balance_due, amount_paid from public.sales where id = $1", [res.id]);
    expect(s).toEqual({ balance_due: 3000, amount_paid: 5000 });
    await expect(
      db.rpc(shop.cashier, "record_credit_payment", { p_client_operation_id: op(), p_customer_id: customer, p_amount: 4000, p_method: "cash", p_cash_session_id: shop.session }),
    ).rejects.toThrow(/dépasse la créance/);
    await db.rpc(shop.cashier, "record_credit_payment", {
      p_client_operation_id: op(),
      p_customer_id: customer,
      p_amount: 3000,
      p_method: "cash",
      p_cash_session_id: shop.session,
    });
    [s] = await db.sql("select balance_due, amount_paid from public.sales where id = $1", [res.id]);
    expect(s).toEqual({ balance_due: 0, amount_paid: 8000 });
  });

  it("annulation : motif obligatoire, stock réintégré, remboursement tracé, une seule fois", async () => {
    const res = await sale(shop.cashier, {
      p_items: [{ variant_id: shop.perfume.id, quantity: 2 }],
      p_payments: [
        { method: "cash", amount: 6000 },
        { method: "orange_money", amount: 10000 },
      ],
    });
    const stockAfterSale = await stockOf(db, shop.perfume.id);
    await expect(db.rpc(shop.cashier, "cancel_sale", { p_sale_id: res.id, p_reason: "erreur" })).rejects.toThrow(/Permission refusée/);
    await expect(db.rpc(shop.admin, "cancel_sale", { p_sale_id: res.id, p_reason: " " })).rejects.toThrow(/motif/);
    await db.rpc(shop.admin, "cancel_sale", { p_sale_id: res.id, p_reason: "Erreur de saisie", p_cash_session_id: shop.session });
    expect(await stockOf(db, shop.perfume.id)).toBe(stockAfterSale + 2);
    const refunds = await db.sql<{ method: string; amount: number }>(
      "select method, amount from public.refunds where sale_id = $1 order by method::text",
      [res.id],
    );
    expect(refunds).toEqual([
      { method: "cash", amount: 6000 },
      { method: "orange_money", amount: 10000 },
    ]);
    await expect(
      db.rpc(shop.admin, "cancel_sale", { p_sale_id: res.id, p_reason: "encore", p_cash_session_id: shop.session }),
    ).rejects.toThrow(/déjà annulée/);
    expect(await stockOf(db, shop.perfume.id)).toBe(stockAfterSale + 2);
    const audit = await db.sql("select * from public.audit_logs where action = 'sale.cancel' and entity_id = $1", [res.id]);
    expect(audit).toHaveLength(1);
  });

  it("un article archivé ne peut plus être vendu", async () => {
    const pid = await db.rpc<string>(shop.admin, "create_product", {
      p_product: { name: "Sac ancien", sale_price: 5000 },
      p_variants: [{ label: "Unique", initial_stock: 2 }],
    });
    const [v] = await db.sql<{ id: string }>("select id from public.product_variants where product_id = $1", [pid]);
    await db.as(shop.admin, (c) => c.query("update public.products set status = 'archived' where id = $1", [pid]));
    await expect(
      sale(shop.cashier, { p_items: [{ variant_id: v.id, quantity: 1 }], p_payments: [{ method: "cash", amount: 5000 }] }),
    ).rejects.toThrow(/plus en vente/);
  });
});
