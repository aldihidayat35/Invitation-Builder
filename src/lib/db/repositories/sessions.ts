import { and, eq, gt, lt } from "drizzle-orm";
import { sessions, users, type User } from "../schema";
import type { Database } from "../types";

export async function insertSession(
  db: Database,
  input: { userId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await db.insert(sessions).values(input);
}

/** Returns the user only if the session exists, is unexpired and the user is active. */
export async function findActiveSessionUser(
  db: Database,
  tokenHash: string,
  now: Date,
): Promise<{ user: User; sessionId: string; expiresAt: Date } | undefined> {
  const [row] = await db
    .select({ user: users, sessionId: sessions.id, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, now),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return row;
}

export async function deleteSessionByTokenHash(db: Database, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteSessionsForUser(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function deleteExpiredSessions(db: Database, now: Date): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
