import type { ClientConfig } from "pg";

export const TEMPLATE_DB = "eba_test_template";

// Par défaut : cluster local lancé par scripts/test-db.sh (socket /tmp/pg, port 54329).
export function adminConfig(database: string): ClientConfig {
  return {
    host: process.env.PGHOST ?? "/tmp/pg",
    port: Number(process.env.PGPORT ?? 54329),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD,
    database,
  };
}
