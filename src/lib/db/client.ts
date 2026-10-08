/**
 * Process-wide database handle for the running Next.js server.
 * - `DATABASE_URL=postgres://...` -> node-postgres pool (production).
 * - `DATABASE_URL=pglite://<dir>`  -> embedded Postgres (local dev / e2e only).
 * Cached on globalThis so dev HMR never opens a second connection/instance.
 * Migrations are NOT run here: use `npm run db:migrate`.
 */
import "server-only";
import { mkdirSync, renameSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { connectPostgres } from "./connect";
import type { Database } from "./types";

const globalForDb = globalThis as unknown as { __invitationDb?: Promise<Database> };

async function open(url: string): Promise<Database> {
  if (url.startsWith("pglite://")) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_PGLITE_IN_PRODUCTION !== "1") {
      throw new Error("pglite:// is for development only; use a postgres:// DATABASE_URL.");
    }
    const dataDir = url.slice("pglite://".length) || undefined;
    if (dataDir) mkdirSync(dirname(dataDir), { recursive: true });
    const { connectPglite, migratePglite } = await import("./pglite");

    let conn;
    try {
      conn = await connectPglite(dataDir);
      // Run sanity check to verify database health and whether tables are initialized
      const check = await conn.client.query<{ count: string }>(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates'",
      );
      if (Number(check.rows[0]?.count ?? 0) === 0) {
        await migratePglite(conn);
      }
    } catch (err) {
      console.warn("[pglite] Corrupted data directory or query failure detected; recovering dev instance:", err);
      if (dataDir && existsSync(dataDir)) {
        try {
          const backupDir = `${dataDir}_corrupted_${Date.now()}`;
          renameSync(dataDir, backupDir);
        } catch {
          // Ignore rename error
        }
      }
      conn = await connectPglite(dataDir);
      await migratePglite(conn);
    }
    return conn.db;
  }
  return connectPostgres(url).db;
}

export function getDb(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (see .env.example).");
  }
  if (!globalForDb.__invitationDb) {
    globalForDb.__invitationDb = open(url).catch((err) => {
      delete globalForDb.__invitationDb;
      throw err;
    });
  }
  return globalForDb.__invitationDb;
}
