import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, op, seedShop, type TestDb } from "./helpers";

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => db?.close());

type Summary = Record<string, number>;
const ALL = { p_from: "2000-01-01T00:00:00Z", p_to: "2100-01-01T00:00:00Z" };

describe("caisse : ouverture, mouvements, clôture", () => {
  it("solde théorique = fond + espèces des ventes − remboursements − dépenses ; écart motivé ; session verrouillée", async () => {
    const shop = await seedShop(db); // fond de caisse 20 000
    await expect(db.rpc(shop.cashier, "open_cash_session", { p_register_name: "Caisse principale", p_opening_float: 0 })).rejects.toThrow(
      /déjà ouverte/,
    );
    // vente mixte : 5 000 espèces + 3 000 Wave
    await db.rpc(shop.cashier, "create_sale", {
      p_client_operation_id: op(),
      p_cash_session_id: shop.session,
      p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
      p_payments: [
        { method: "cash", amount: 5000 },
        { method: "wave", amount: 3000 },
      ],
      p_cash_tendered: 10000,
    });
    // dépense d'emballages payée en caisse : un seul mouvement
    const expenseId = await db.rpc<string>(shop.admin, "record_expense", {
      p_category: "packaging",
      p_amount: 1500,
      p_expense_date: new Date().toISOString().slice(0, 10),
      p_method: "cash",
      p_cash_session_id: shop.session,
    });
    const moves = await db.sql("select * from public.cash_movements where reference_id = $1", [expenseId]);
    expect(moves).toHaveLength(1);
    // retrait d'espèces
    await expect(
      db.rpc(shop.cashier, "add_cash_movement", { p_session_id: shop.session, p_type: "cash_out", p_amount: 1000, p_reason: "" }),
    ).rejects.toThrow(/motif/);
    await db.rpc(shop.cashier, "add_cash_movement", { p_session_id: shop.session, p_type: "cash_out", p_amount: 1000, p_reason: "Dépôt banque" });

    const expected = 20000 + 5000 - 1500 - 1000;
    expect(await db.rpc(shop.cashier, "cash_session_balance", { p_session_id: shop.session })).toBe(expected);

    await expect(
      db.rpc(shop.cashier, "close_cash_session", { p_session_id: shop.session, p_counted_cash: expected - 500 }),
    ).rejects.toThrow(/motif est obligatoire/);
    const closing = await db.rpc<{ difference: number }>(shop.cashier, "close_cash_session", {
      p_session_id: shop.session,
      p_counted_cash: expected - 500,
      p_difference_reason: "Erreur de rendu de monnaie",
    });
    expect(closing.difference).toBe(-500);
    const [session] = await db.sql<{ totals_snapshot: { payments_by_method: Record<string, number> } }>(
      "select totals_snapshot from public.cash_sessions where id = $1",
      [shop.session],
    );
    // électronique suivi séparément des espèces
    expect(session.totals_snapshot.payments_by_method).toEqual({ cash: 5000, wave: 3000 });

    // session clôturée : plus aucune opération
    await expect(
      db.rpc(shop.cashier, "create_sale", {
        p_client_operation_id: op(),
        p_cash_session_id: shop.session,
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
        p_payments: [{ method: "cash", amount: 8000 }],
      }),
    ).rejects.toThrow(/pas ouverte/);
    await expect(
      db.rpc(shop.cashier, "add_cash_movement", { p_session_id: shop.session, p_type: "cash_in", p_amount: 100, p_reason: "x" }),
    ).rejects.toThrow(/pas ouverte/);
    await expect(db.rpc(shop.admin, "void_expense", { p_expense_id: expenseId, p_reason: "erreur" })).rejects.toThrow(/clôturée/);

    // correction exceptionnelle : réservée, motivée, tracée
    await expect(
      db.rpc(shop.cashier, "correct_cash_session", { p_session_id: shop.session, p_amount: -500, p_reason: "x" }),
    ).rejects.toThrow(/Permission refusée/);
    await db.rpc(shop.admin, "correct_cash_session", { p_session_id: shop.session, p_amount: -500, p_reason: "Billet de 500 remis au client par erreur" });
    const [corrected] = await db.sql<{ difference: number }>("select difference from public.cash_sessions where id = $1", [shop.session]);
    expect(corrected.difference).toBe(0);
    const audit = await db.sql("select * from public.audit_logs where action = 'cash_session.correct'");
    expect(audit).toHaveLength(1);
  });
});

describe("rapports et marges", () => {
  it("produit acheté 5 000 et vendu 8 000 : marge brute unitaire de 3 000 FCFA", async () => {
    const fresh = await (await import("./helpers")).createTestDb();
    try {
      const shop = await seedShop(fresh);
      await fresh.rpc(shop.cashier, "create_sale", {
        p_client_operation_id: op(),
        p_cash_session_id: shop.session,
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
        p_payments: [{ method: "cash", amount: 8000 }],
      });
      const s = await fresh.rpc<Summary>(shop.admin, "report_summary", ALL);
      expect(s).toMatchObject({ gross_sales: 8000, cogs: 5000, gross_margin: 3000, sales_count: 1, average_basket: 8000 });
      const byProduct = await fresh.as(shop.admin, (c) => c.query("select * from public.report_sales_by_product($1, $2)", [ALL.p_from, ALL.p_to]));
      expect(byProduct.rows[0]).toMatchObject({ quantity: 1, net_sales: 8000, cogs: 5000, margin: 3000, margin_rate: 37.5 });
    } finally {
      await fresh.close();
    }
  });

  it("indicateurs cohérents : crédit non encaissé, retours, annulations, dépenses, stock", async () => {
    const fresh = await (await import("./helpers")).createTestDb();
    try {
      const shop = await seedShop(fresh); // parfum 10 × (5 000 / 8 000) ; robe M 3 + L 1 × (12 000 / 25 000)
      const [{ id: customer }] = await fresh.sql<{ id: string }>("insert into public.customers (first_name) values ('Khady') returning id");
      // V1 : 2 parfums, remise 1 000, payés Wave 15 000
      const v1 = await fresh.rpc<{ id: string }>(shop.admin, "create_sale", {
        p_client_operation_id: op(), p_cash_session_id: shop.session,
        p_items: [{ variant_id: shop.perfume.id, quantity: 2 }], p_discount_amount: 1000,
        p_payments: [{ method: "wave", amount: 15000 }],
      });
      // V2 : 1 robe à crédit, acompte espèces 10 000 → créance 15 000
      await fresh.rpc(shop.admin, "create_sale", {
        p_client_operation_id: op(), p_cash_session_id: shop.session, p_customer_id: customer,
        p_items: [{ variant_id: shop.dressM.id, quantity: 1 }], p_payments: [{ method: "cash", amount: 10000 }],
      });
      // V3 : annulée → exclue du CA
      const v3 = await fresh.rpc<{ id: string }>(shop.admin, "create_sale", {
        p_client_operation_id: op(), p_cash_session_id: shop.session,
        p_items: [{ variant_id: shop.perfume.id, quantity: 1 }], p_payments: [{ method: "cash", amount: 8000 }],
      });
      await fresh.rpc(shop.admin, "cancel_sale", { p_sale_id: v3.id, p_reason: "Erreur", p_cash_session_id: shop.session });
      // Retour d'un parfum de V1 (valeur nette 7 500) remboursé par Wave
      const [line] = await fresh.sql<{ id: string }>("select id from public.sale_items where sale_id = $1", [v1.id]);
      await fresh.rpc(shop.admin, "process_return", {
        p_client_operation_id: op(), p_sale_id: v1.id, p_reason: "Retour",
        p_items: [{ sale_item_id: line.id, quantity: 1, restock: true }], p_refund_method: "wave",
      });
      // Dépense hors caisse
      await fresh.rpc(shop.admin, "record_expense", {
        p_category: "rent", p_amount: 2000, p_expense_date: new Date().toISOString().slice(0, 10), p_method: "bank_transfer",
      });

      const s = await fresh.rpc<Summary>(shop.admin, "report_summary", ALL);
      expect(s.gross_sales).toBe(15000 + 25000);
      expect(s.sales_count).toBe(2);
      expect(s.returns_value).toBe(7500);
      expect(s.net_sales).toBe(40000 - 7500);
      expect(s.cogs).toBe(2 * 5000 + 12000 - 5000);
      expect(s.gross_margin).toBe(32500 - 17000);
      expect(s.expenses).toBe(2000);
      expect(s.estimated_profit).toBe(15500 - 2000);
      expect(s.credit_granted).toBe(15000);
      expect(s.receivables).toBe(15000);
      // encaissé : 15 000 Wave + 10 000 espèces + 8 000 (V3) − 8 000 (annulation V3) − 7 500 (retour)
      expect(s.cash_received).toBe(33000);
      expect(s.refunds_paid).toBe(15500);
      expect(s.net_collections).toBe(17500);
      // stock : parfum 10 − 2 − 1 + 1 (annulation) + 1 (retour) = 9 ; robe M 2 ; robe L 1
      expect(s.stock_value).toBe(9 * 5000 + 2 * 12000 + 1 * 12000);
      expect(s.low_stock_count).toBe(2); // robe M (2 ≤ 2) et robe L (1 ≤ 2)

      const methods = await fresh.as(shop.admin, (c) =>
        c.query("select method::text, received, refunded, net from public.report_payments_by_method($1, $2) order by method::text", [ALL.p_from, ALL.p_to]),
      );
      expect(methods.rows).toEqual([
        { method: "cash", received: 18000, refunded: 8000, net: 10000 },
        { method: "wave", received: 15000, refunded: 7500, net: 7500 },
      ]);
    } finally {
      await fresh.close();
    }
  });
});
