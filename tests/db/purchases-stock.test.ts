import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, op, seedShop, stockOf, type TestDb } from "./helpers";

let db: TestDb;
let shop: Awaited<ReturnType<typeof seedShop>>;
let stockManager: string;
let supplier: string;

beforeAll(async () => {
  db = await createTestDb();
  shop = await seedShop(db);
  stockManager = await db.createUser("stock_manager");
  [{ id: supplier }] = await db.sql<{ id: string }>("insert into public.suppliers (name) values ('Dakar Parfums') returning id");
});
afterAll(async () => db?.close());

describe("produits et codes-barres", () => {
  it("chaque variante a son propre stock et un code-barres interne unique", async () => {
    const pid = await db.rpc<string>(stockManager, "create_product", {
      p_product: { name: "Foulard soie", purchase_price: 3000, sale_price: 6500 },
      p_variants: [
        { label: "Rouge", attributes: { couleur: "Rouge" }, initial_stock: 4 },
        { label: "Bleu", attributes: { couleur: "Bleu" }, initial_stock: 0 },
      ],
    });
    const variants = await db.sql<{ barcode: string; barcode_is_internal: boolean; stock_qty: number }>(
      "select barcode, barcode_is_internal, stock_qty from public.product_variants where product_id = $1 order by label",
      [pid],
    );
    expect(variants.map((v) => v.stock_qty)).toEqual([0, 4]);
    expect(new Set(variants.map((v) => v.barcode)).size).toBe(2);
    expect(variants.every((v) => v.barcode_is_internal && /^200\d{9}$/.test(v.barcode))).toBe(true);
    const initial = await db.sql("select * from public.stock_movements where type = 'initial' and reference_id = $1", [pid]);
    expect(initial).toHaveLength(1);
  });

  it("refuse un code-barres déjà attribué", async () => {
    await db.rpc(stockManager, "create_product", {
      p_product: { name: "Montre A", sale_price: 10000 },
      p_variants: [{ label: "Std", barcode: "6111234567890" }],
    });
    await expect(
      db.rpc(stockManager, "create_product", {
        p_product: { name: "Montre B", sale_price: 10000 },
        p_variants: [{ label: "Std", barcode: "6111234567890" }],
      }),
    ).rejects.toThrow(/déjà attribué/);
    // l'index unique protège aussi la modification directe
    const [v] = await db.sql<{ id: string }>("select id from public.product_variants where barcode <> '6111234567890' limit 1");
    await expect(
      db.as(stockManager, (c) => c.query("update public.product_variants set barcode = '6111234567890' where id = $1", [v.id])),
    ).rejects.toThrow(/duplicate key/);
  });

  it("le scan d'un code-barres retrouve exactement la bonne variante", async () => {
    const rows = await db.as(shop.cashier, (c) => c.query("select * from public.pos_search($1)", [shop.dressL.id]));
    expect(rows.rowCount).toBe(0);
    const [target] = await db.sql<{ barcode: string }>("select barcode from public.product_variants where id = $1", [shop.dressL.id]);
    const found = await db.as(shop.cashier, (c) => c.query("select variant_id from public.pos_search($1)", [target.barcode]));
    expect(found.rows[0].variant_id).toBe(shop.dressL.id);
  });
});

describe("stock", () => {
  it("correction avec motif obligatoire, jamais négative par défaut", async () => {
    await expect(
      db.rpc(stockManager, "adjust_stock", { p_variant_id: shop.dressL.id, p_quantity: -1, p_type: "exit", p_reason: "" }),
    ).rejects.toThrow(/motif/);
    const current = await stockOf(db, shop.dressL.id);
    await expect(
      db.rpc(stockManager, "adjust_stock", { p_variant_id: shop.dressL.id, p_quantity: -(current + 1), p_type: "exit", p_reason: "Casse" }),
    ).rejects.toThrow(/Stock insuffisant/);
    await db.rpc(stockManager, "adjust_stock", { p_variant_id: shop.dressL.id, p_quantity: 2, p_type: "entry", p_reason: "Retour dépôt" });
    expect(await stockOf(db, shop.dressL.id)).toBe(current + 2);
  });

  it("inventaire : l'écart est appliqué en préservant les ventes faites pendant le comptage", async () => {
    const inv = await db.rpc<string>(stockManager, "start_inventory", { p_name: "Inventaire test" });
    const [line] = await db.sql<{ id: string; expected_qty: number }>(
      "select id, expected_qty from public.inventory_lines where inventory_id = $1 and variant_id = $2",
      [inv, shop.perfume.id],
    );
    // une vente pendant le comptage
    await db.rpc(shop.cashier, "create_sale", {
      p_client_operation_id: op(),
      p_cash_session_id: shop.session,
      p_items: [{ variant_id: shop.perfume.id, quantity: 1 }],
      p_payments: [{ method: "cash", amount: 8000 }],
    });
    // on compte 2 de moins que le théorique au démarrage (vol / casse)
    await db.rpc(stockManager, "record_inventory_count", { p_line_id: line.id, p_counted: line.expected_qty - 2 });
    await db.rpc(stockManager, "validate_inventory", { p_inventory_id: inv });
    expect(await stockOf(db, shop.perfume.id)).toBe(line.expected_qty - 1 - 2);
    await expect(db.rpc(stockManager, "validate_inventory", { p_inventory_id: inv })).rejects.toThrow(/déjà clôturé/);
  });
});

describe("achats fournisseurs", () => {
  it("commande → réception partielle → réception finale → règlements : stock mis à jour une seule fois", async () => {
    const before = await stockOf(db, shop.perfume.id);
    const po = await db.rpc<{ id: string; ordered_total: number }>(stockManager, "create_purchase", {
      p_supplier_id: supplier,
      p_items: [{ variant_id: shop.perfume.id, quantity: 10, unit_cost: 5200 }],
      p_supplier_reference: "FAC-2026-118",
    });
    expect(po.ordered_total).toBe(52000);
    expect(await stockOf(db, shop.perfume.id)).toBe(before); // commande ≠ réception

    const [item] = await db.sql<{ id: string }>("select id from public.purchase_items where purchase_id = $1", [po.id]);
    const receiptOp = op();
    const receive = (qty: number, opId = op()) =>
      db.rpc(stockManager, "receive_purchase", {
        p_client_operation_id: opId,
        p_purchase_id: po.id,
        p_items: [{ purchase_item_id: item.id, quantity: qty }],
      });
    await receive(6, receiptOp);
    await receive(6, receiptOp); // rejouée : ignorée
    expect(await stockOf(db, shop.perfume.id)).toBe(before + 6);
    await expect(receive(5)).rejects.toThrow(/reste à recevoir : 4/);
    await receive(4);
    expect(await stockOf(db, shop.perfume.id)).toBe(before + 10);
    const [p] = await db.sql<{ status: string; received_total: number }>("select status, received_total from public.purchases where id = $1", [po.id]);
    expect(p).toEqual({ status: "received", received_total: 52000 });
    await expect(receive(1)).rejects.toThrow(/ne peut plus être réceptionnée/);

    // coût d'achat mis à jour pour les prochaines ventes
    const [v] = await db.sql<{ purchase_price: number }>("select purchase_price from public.product_variants where id = $1", [shop.perfume.id]);
    expect(v.purchase_price).toBe(5200);

    // règlements partiels et solde fournisseur
    await db.rpc(stockManager, "record_supplier_payment", {
      p_client_operation_id: op(), p_supplier_id: supplier, p_purchase_id: po.id, p_amount: 30000, p_method: "wave",
    });
    await expect(
      db.rpc(stockManager, "record_supplier_payment", {
        p_client_operation_id: op(), p_supplier_id: supplier, p_purchase_id: po.id, p_amount: 30000, p_method: "wave",
      }),
    ).rejects.toThrow(/dépasse le montant de la commande/);
    const balances = await db.rpc<unknown>(shop.admin, "report_summary", { p_from: "2000-01-01", p_to: "2100-01-01" });
    expect((balances as { payables: number }).payables).toBe(22000);
  });

  it("une commande déjà réceptionnée ne peut pas être annulée", async () => {
    const po = await db.rpc<{ id: string }>(stockManager, "create_purchase", {
      p_supplier_id: supplier,
      p_items: [{ variant_id: shop.dressM.id, quantity: 2, unit_cost: 12000 }],
    });
    const [item] = await db.sql<{ id: string }>("select id from public.purchase_items where purchase_id = $1", [po.id]);
    await db.rpc(stockManager, "receive_purchase", {
      p_client_operation_id: op(), p_purchase_id: po.id, p_items: [{ purchase_item_id: item.id, quantity: 1 }],
    });
    await expect(db.rpc(stockManager, "cancel_purchase", { p_purchase_id: po.id, p_reason: "x" })).rejects.toThrow(/sans réception/);
  });
});
