import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Database } from "./types";

export interface DbConnection {
  readonly db: Database;
  close(): Promise<void>;
}

export function connectPostgres(connectionString: string): DbConnection {
  const isSslRequired =
    process.env.DATABASE_SSL === "true" ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true");
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    ...(isSslRequired ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
