import { connectPglite, migratePglite } from "@/lib/db/pglite";

/** Fresh in-memory Postgres with the real ./drizzle migrations applied. */
export async function createMigratedDb() {
  const conn = await connectPglite();
  await migratePglite(conn);
  return conn;
}
