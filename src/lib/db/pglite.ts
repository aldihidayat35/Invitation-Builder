/**
 * Embedded Postgres (PGlite, WASM) for local dev and automated tests only.
 * Production uses `connectPostgres`. Applies the real SQL migrations in ./drizzle.
 */
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import type { DbConnection } from "./connect";

export const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

/** `dataDir` undefined = in-memory. */
export interface PgliteConnection extends DbConnection {
  readonly db: PgliteDatabase<typeof schema>;
  readonly client: PGlite;
}

export async function connectPglite(dataDir?: string): Promise<PgliteConnection> {
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  return { db, client, close: () => client.close() };
}

export async function migratePglite(conn: Pick<PgliteConnection, "db">) {
  await migrate(conn.db, { migrationsFolder: MIGRATIONS_FOLDER });
}
