import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { adminConfig, TEMPLATE_DB } from "./config";

// Construit une base modèle : environnement Supabase simulé + migrations.
export default async function setup() {
  const admin = new Client(adminConfig("postgres"));
  await admin.connect();
  await admin.query(`drop database if exists ${TEMPLATE_DB}`);
  await admin.query(`create database ${TEMPLATE_DB}`);
  await admin.end();

  const client = new Client(adminConfig(TEMPLATE_DB));
  await client.connect();
  const root = path.resolve(__dirname, "../..");
  await client.query(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await client.query(readFileSync(path.join(dir, file), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${file} : ${(error as Error).message}`);
    }
  }
  await client.end();
}
