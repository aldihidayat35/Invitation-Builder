import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Database } from "./types";

export interface DbConnection {
  readonly db: Database;
  close(): Promise<void>;
}

/** Production connection (node-postgres). Pass `DATABASE_URL`. */
export function connectPostgres(connectionString: string): DbConnection {
  const pool = new Pool({ connectionString, max: 10 });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
