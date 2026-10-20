import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, op, seedShop, stockOf, type TestDb } from "./helpers";

let db: TestDb;
let shop: Awaited<ReturnType<typeof seedShop>>;
let customer: string;

beforeAll(async () => {
  db = await createTestDb();
  shop = await seedShop(db);
  [{ id: customer }] = await db.sql<{ id: string }>("insert into public.customers (first_name) values ('Awa') returning id");
});
afterAll(async () => db?.close());

async function sell(items: { variant_id: string; quantity: number }[], payments: unknown[], extra: Record<string, unknown> = {}) {
  const res = await db.rpc<{ id: string }>(extra.uid as string ?? shop.cashier, "create_sale", {
    p_client_operation_id: op(),
    p_cash_session_id: shop.session,
    p_items: items,
    p_payments: payments,
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "uid")),
  });
  const lines = await db.sql<{ id: string; variant_id: string; quantity: number; line_total: number }>(
    "select id, variant_id, quantity, line_total from public.sale_items where sale_id = $1",
    [res.id],
  );
  return { saleId: res.id, lines };
}

type ReturnResult = { id: string; total_value: number; refund_amount: number; balance_reduction: number; duplicate: boolean };

describe("retours et remboursements", () => {
  it("retour partiel remboursé en espèces, stock réintégré", async () => {
    const { saleId, lines } = await sell([{ variant_id: shop.perfume.id, quantity: 3 }], [{ method: "cash", amount: 24000 }]);
    const stockBefore = await stockOf(db, shop.perfume.id);
    const res = await db.rpc<ReturnResult>(shop.admin, "process_return", {
      p_client_operation_id: op(),
      p_sale_id: saleId,
      p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
      p_reason: "Taille non adaptée",
      p_refund_method: "cash",
      p_cash_session_id: shop.session,
    });
    expect(res).toMatchObject({ total_value: 8000, refund_amount: 8000, balance_reduction: 0 });
    expect(await stockOf(db, shop.perfume.id)).toBe(stockBefore + 1);
    const [cash] = await db.sql<{ amount: number }>("select amount from public.cash_movements where reference_id = $1", [res.id]);
    expect(cash.amount).toBe(-8000);
    const [item] = await db.sql<{ returned_qty: number; refunded_amount: number }>(
      "select returned_qty, refunded_amount from public.sale_items where id = $1",
      [lines[0].id],
    );
    expect(item).toEqual({ returned_qty: 1, refunded_amount: 8000 });
  });

  it("empêche le double remboursement : on ne peut pas retourner plus que vendu", async () => {
    const { saleId, lines } = await sell([{ variant_id: shop.perfume.id, quantity: 2 }], [{ method: "wave", amount: 16000 }]);
    const ret = (qty: number) =>
      db.rpc<ReturnResult>(shop.admin, "process_return", {
        p_client_operation_id: op(),
        p_sale_id: saleId,
        p_items: [{ sale_item_id: lines[0].id, quantity: qty, restock: true }],
        p_reason: "Défaut",
        p_refund_method: "wave",
      });
    await ret(2);
    await expect(ret(1)).rejects.toThrow(/supérieure à la quantité restante/);
    const refunds = await db.sql<{ total: number }>("select sum(amount)::bigint as total from public.refunds where sale_id = $1", [saleId]);
    expect(refunds[0].total).toBe(16000);
  });

  it("une requête de retour rejouée n'est traitée qu'une fois (remboursement et stock)", async () => {
    const { saleId, lines } = await sell([{ variant_id: shop.perfume.id, quantity: 2 }], [{ method: "cash", amount: 16000 }]);
    const stockBefore = await stockOf(db, shop.perfume.id);
    const args = {
      p_client_operation_id: op(),
      p_sale_id: saleId,
      p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
      p_reason: "Changement d'avis",
      p_refund_method: "cash",
      p_cash_session_id: shop.session,
    };
    const first = await db.rpc<ReturnResult>(shop.admin, "process_return", args);
    const second = await db.rpc<ReturnResult>(shop.admin, "process_return", args);
    expect(second).toMatchObject({ id: first.id, duplicate: true });
    expect(await stockOf(db, shop.perfume.id)).toBe(stockBefore + 1);
  });

  it("article défectueux : remboursé sans retour en stock", async () => {
    const { saleId, lines } = await sell([{ variant_id: shop.dressM.id, quantity: 1 }], [{ method: "orange_money", amount: 25000 }]);
    const stockBefore = await stockOf(db, shop.dressM.id);
    await db.rpc(shop.admin, "process_return", {
      p_client_operation_id: op(),
      p_sale_id: saleId,
      p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: false }],
      p_reason: "Couture défectueuse",
      p_refund_method: "orange_money",
    });
    expect(await stockOf(db, shop.dressM.id)).toBe(stockBefore);
  });

  it("la valeur remboursée tient compte de la remise et la somme des retours égale la ligne", async () => {
    // 3 parfums à 8 000 = 24 000, remise 2 000 → ligne nette 22 000 ; 22 000 / 3 n'est pas entier
    const { saleId, lines } = await sell(
      [{ variant_id: shop.perfume.id, quantity: 3 }],
      [{ method: "cash", amount: 22000 }],
      { p_discount_amount: 2000 },
    );
    const values: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await db.rpc<ReturnResult>(shop.admin, "process_return", {
        p_client_operation_id: op(),
        p_sale_id: saleId,
        p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
        p_reason: "Retour",
        p_refund_method: "cash",
        p_cash_session_id: shop.session,
      });
      values.push(r.total_value);
    }
    expect(values.reduce((a, b) => a + b, 0)).toBe(22000);
    expect(values).toEqual([7333, 7333, 7334]);
  });

  it("vente à crédit : le retour réduit d'abord le reste à payer, sans remboursement", async () => {
    const { saleId, lines } = await sell(
      [{ variant_id: shop.dressM.id, quantity: 1 }],
      [{ method: "cash", amount: 5000 }],
      { p_customer_id: customer, uid: shop.admin },
    );
    const r = await db.rpc<ReturnResult>(shop.admin, "process_return", {
      p_client_operation_id: op(),
      p_sale_id: saleId,
      p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
      p_reason: "Retour",
      p_refund_method: "cash",
      p_cash_session_id: shop.session,
    });
    expect(r).toMatchObject({ total_value: 25000, balance_reduction: 20000, refund_amount: 5000 });
    const [s] = await db.sql<{ balance_due: number }>("select balance_due from public.sales where id = $1", [saleId]);
    expect(s.balance_due).toBe(0);
  });

  it("avoir : le remboursement crédite le client, réutilisable en caisse", async () => {
    const { saleId, lines } = await sell(
      [{ variant_id: shop.perfume.id, quantity: 1 }],
      [{ method: "cash", amount: 8000 }],
      { p_customer_id: customer },
    );
    await db.rpc(shop.admin, "process_return", {
      p_client_operation_id: op(),
      p_sale_id: saleId,
      p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
      p_reason: "Échange",
      p_refund_method: "store_credit",
    });
    let [c] = await db.sql<{ store_credit: number }>("select store_credit from public.customers where id = $1", [customer]);
    expect(c.store_credit).toBe(8000);
    await sell(
      [{ variant_id: shop.perfume.id, quantity: 1 }],
      [{ method: "store_credit", amount: 8000 }],
      { p_customer_id: customer },
    );
    [c] = await db.sql("select store_credit from public.customers where id = $1", [customer]);
    expect(c.store_credit).toBe(0);
    await expect(
      sell([{ variant_id: shop.perfume.id, quantity: 1 }], [{ method: "store_credit", amount: 8000 }], { p_customer_id: customer }),
    ).rejects.toThrow(/Avoir client insuffisant/);
  });

  it("un caissier sans permission ne peut pas rembourser", async () => {
    const { saleId, lines } = await sell([{ variant_id: shop.perfume.id, quantity: 1 }], [{ method: "cash", amount: 8000 }]);
    await expect(
      db.rpc(shop.cashier, "process_return", {
        p_client_operation_id: op(),
        p_sale_id: saleId,
        p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
        p_reason: "x",
        p_refund_method: "cash",
        p_cash_session_id: shop.session,
      }),
    ).rejects.toThrow(/Permission refusée/);
  });

  it("une vente partiellement retournée ne peut plus être annulée", async () => {
    const { saleId, lines } = await sell([{ variant_id: shop.perfume.id, quantity: 2 }], [{ method: "wave", amount: 16000 }]);
    await db.rpc(shop.admin, "process_return", {
      p_client_operation_id: op(),
      p_sale_id: saleId,
      p_items: [{ sale_item_id: lines[0].id, quantity: 1, restock: true }],
      p_reason: "x",
      p_refund_method: "wave",
    });
    await expect(
      db.rpc(shop.admin, "cancel_sale", { p_sale_id: saleId, p_reason: "y", p_cash_session_id: shop.session }),
    ).rejects.toThrow(/procédure de retour/);
  });
});
