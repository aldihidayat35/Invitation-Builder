import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { migrate as migrateNode } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePgliteFn } from "drizzle-orm/pglite/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "../../src/lib/db/schema";
import type { Database } from "../../src/lib/db/types";

const FOLDER = "./drizzle";

export interface ScriptDb {
  db: Database;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

/** DATABASE_URL = postgres://... (server) or pglite://<dir> (embedded, local dev). */
export function connectFromEnv(): ScriptDb {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required (postgres://... or pglite://./.data/dev)");
  if (url.startsWith("pglite://")) {
    const dataDir = url.slice("pglite://".length) || undefined;
    if (dataDir) mkdirSync(dirname(dataDir), { recursive: true });
    const client = new PGlite(dataDir);
    const db = drizzlePglite(client, { schema });
    return {
      db,
      migrate: () => migratePgliteFn(db, { migrationsFolder: FOLDER }),
      close: () => client.close(),
    };
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzleNode(pool, { schema });
  return {
    db,
    migrate: () => migrateNode(db, { migrationsFolder: FOLDER }),
    close: () => pool.end(),
  };
}
