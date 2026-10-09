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
    if (dataDir) {
      mkdirSync(dirname(dataDir), { recursive: true });
      const pidFile = `${dataDir}/postmaster.pid`;
      try {
        if (existsSync(pidFile)) {
          const { unlinkSync } = await import("node:fs");
          unlinkSync(pidFile);
        }
      } catch {
        // Ignore unlink error
      }
    }
    const { connectPglite } = await import("./pglite");
    const conn = await connectPglite(dataDir);
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
