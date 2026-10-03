import "server-only";
import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";

/** Runs `select 1`; throws if the database is unreachable. */
export async function checkDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`select 1`);
}
