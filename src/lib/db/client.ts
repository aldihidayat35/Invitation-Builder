/**
 * Process-wide database handle for the running Next.js server.
 * - `DATABASE_URL=postgres://...` -> node-postgres pool (production).
 * - `DATABASE_URL=pglite://<dir>`  -> embedded Postgres (local dev / e2e only).
 * Cached on globalThis so dev HMR never opens a second connection/instance.
 * Migrations are NOT run here: use `npm run db:migrate`.
 */
import "server-only";
import { mkdirSync, renameSync, existsSync, rmSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
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
      const pidFile = join(dataDir, "postmaster.pid");
      try {
        if (existsSync(pidFile)) {
          unlinkSync(pidFile);
        }
      } catch {
        // Ignore unlink error
      }
    }
    const { connectPglite, migratePglite } = await import("./pglite");
    let initialConn: Awaited<ReturnType<typeof connectPglite>> | null = null;
    try {
      initialConn = await connectPglite(dataDir);
      await initialConn.client.waitReady;
      return initialConn.db;
    } catch (err) {
      if (initialConn?.client) {
        try {
          await initialConn.client.close();
        } catch {
          // Ignore close error
        }
      }
      if (dataDir && existsSync(/*turbopackIgnore: true*/ dataDir)) {
        const corruptedDir = `${dataDir}_corrupted_${Date.now()}`;
        console.warn(`[db/client] PGlite dataDir corrupted (${err}). Auto-recovering to ${corruptedDir}...`);
        let moved = false;
        try {
          renameSync(dataDir, corruptedDir);
          moved = true;
        } catch {
          try {
            rmSync(dataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            moved = true;
          } catch {
            // Locked by another process on Windows
          }
        }
        // If dataDir was moved or removed, recreate it; otherwise use a fallback recovery directory to avoid re-opening the locked directory
        const effectiveDir = (moved || !existsSync(dataDir)) ? dataDir : `${dataDir}_recovered_${Date.now()}`;
        mkdirSync(effectiveDir, { recursive: true });
        const freshConn = await connectPglite(effectiveDir);
        await freshConn.client.waitReady;
        await migratePglite(freshConn);
        try {
          const { seedDev } = await import("./seed");
          await seedDev(freshConn.db);
        } catch (seedErr) {
          console.warn("[db/client] auto-seed after recovery notice:", seedErr);
        }
        return freshConn.db;
      }
      throw err;
    }
  }
  return connectPostgres(url).db;
}

export function resetDbHandle(): void {
  delete globalForDb.__invitationDb;
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
