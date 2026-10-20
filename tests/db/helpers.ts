import { randomUUID } from "node:crypto";
import pg, { Client, Pool, type PoolClient } from "pg";
import { adminConfig, TEMPLATE_DB } from "./config";

// bigint (int8) et numeric → number : les montants FCFA restent très en deçà de 2^53.
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1700, (v) => Number(v));

export type Role = "admin" | "cashier" | "stock_manager" | "employee";

export interface TestDb {
  pool: Pool;
  /** Requête en tant que superutilisateur (hors RLS), pour préparer ou vérifier. */
  sql<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Crée un utilisateur Supabase avec son profil. */
  createUser(role: Role, opts?: { permissions?: string[]; active?: boolean; name?: string }): Promise<string>;
  /** Exécute une transaction comme le ferait PostgREST pour cet utilisateur. */
  as<T>(uid: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T>;
  /** Appelle une fonction RPC avec des arguments nommés. */
  rpc<T = unknown>(uid: string | null, fn: string, args?: Record<string, unknown>): Promise<T>;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const name = `eba_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const admin = new Client(adminConfig("postgres"));
  await admin.connect();
  await admin.query(`create database ${name} template ${TEMPLATE_DB}`);
  await admin.end();
  const pool = new Pool({ ...adminConfig(name), max: 4 });

  const sql: TestDb["sql"] = async (text, params) => (await pool.query(text, params)).rows;

  const as: TestDb["as"] = async (uid, fn) => {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query(`set local role ${uid ? "authenticated" : "anon"}`);
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
      ]);
      const result = await fn(c);
      await c.query("commit");
      return result;
    } catch (error) {
      await c.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      c.release();
    }
  };

  return {
    pool,
    sql,
    as,
    async createUser(role, opts = {}) {
      const [{ id }] = await sql<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [`${randomUUID()}@test.local`, { full_name: opts.name ?? `${role} test` }],
      );
      await sql("update public.profiles set role = $2, permissions = $3, is_active = $4 where id = $1", [
        id,
        role,
        opts.permissions ?? [],
        opts.active ?? true,
      ]);
      return id;
    },
    async rpc(uid, fn, args = {}) {
      const keys = Object.keys(args);
      const call = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as result`;
      const values = keys.map((k) => {
        const v = args[k];
        return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      });
      return as(uid, async (c) => (await c.query(call, values)).rows[0]?.result);
    },
    async close() {
      await pool.end();
      const a = new Client(adminConfig("postgres"));
      await a.connect();
      await a.query(`drop database if exists ${name} with (force)`);
      await a.end();
    },
  };
}

/** Prépare un catalogue minimal et une caisse ouverte. */
export async function seedShop(db: TestDb) {
  const admin = await db.createUser("admin", { name: "Aicha" });
  const cashier = await db.createUser("cashier", { name: "Fatou" });
  const productId = await db.rpc<string>(admin, "create_product", {
    p_product: { name: "Parfum Oud", purchase_price: 5000, sale_price: 8000, min_stock: 2 },
    p_variants: [{ label: "50 ml", initial_stock: 10 }],
  });
  const [variant] = await db.sql<{ id: string; barcode: string }>(
    "select id, barcode from public.product_variants where product_id = $1",
    [productId],
  );
  const product2 = await db.rpc<string>(admin, "create_product", {
    p_product: { name: "Robe wax", purchase_price: 12000, sale_price: 25000 },
    p_variants: [
      { label: "M", attributes: { taille: "M" }, initial_stock: 3 },
      { label: "L", attributes: { taille: "L" }, initial_stock: 1 },
    ],
  });
  const dress = await db.sql<{ id: string; label: string }>(
    "select id, label from public.product_variants where product_id = $1 order by label desc",
    [product2],
  );
  const session = await db.rpc<string>(cashier, "open_cash_session", {
    p_register_name: "Caisse principale",
    p_opening_float: 20000,
  });
  return { admin, cashier, perfume: variant, dressM: dress[0], dressL: dress[1], session };
}

export const op = () => randomUUID();

export async function stockOf(db: TestDb, variantId: string): Promise<number> {
  const [row] = await db.sql<{ stock_qty: number }>("select stock_qty from public.product_variants where id = $1", [variantId]);
  return Number(row.stock_qty);
}
