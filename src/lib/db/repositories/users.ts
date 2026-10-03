import { and, eq, isNull, sql } from "drizzle-orm";
import { users, type NewUser, type User } from "../schema";
import type { Database } from "../types";

export async function insertUser(db: Database, input: NewUser): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({ ...input, email: input.email.trim() })
    .returning();
  if (!row) throw new Error("insertUser returned no row");
  return row;
}

/** Case-insensitive lookup (matches the unique lower(email) index). */
export async function findUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))
    .limit(1);
  return row;
}

export async function findUserById(db: Database, id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

/** Sets the password hash only when none exists (seed/bootstrap); never overwrites. */
export async function setInitialPasswordHash(
  db: Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(users)
    .set({ passwordHash })
    .where(and(eq(users.id, userId), isNull(users.passwordHash)));
}
