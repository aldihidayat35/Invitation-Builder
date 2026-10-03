/**
 * Server-side session lifecycle (FR-AUTH-001). The browser holds a random
 * opaque token; the DB stores only its SHA-256 hash, so a DB leak cannot be
 * replayed. Expiry is absolute.
 */
import { createHash, randomBytes } from "node:crypto";
import {
  deleteSessionByTokenHash,
  findActiveSessionUser,
  insertSession,
} from "../db/repositories/sessions";
import { findUserByEmail } from "../db/repositories/users";
import { insertAuditLog } from "../db/repositories/audit";
import type { User } from "../db/schema";
import type { Database } from "../db/types";
import { AuthenticationError, RateLimitError } from "./errors";
import { MAX_PASSWORD_LENGTH, hashPassword, verifyPassword } from "./password";
import { LoginThrottle } from "./throttle";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = Pick<User, "id" | "email" | "name">;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await insertSession(db, { userId, tokenHash: hashSessionToken(token), expiresAt });
  return { token, expiresAt };
}

export async function validateSession(
  db: Database,
  token: string | undefined,
  now: Date = new Date(),
): Promise<SessionUser | undefined> {
  if (!token || token.length < 20 || token.length > 200) return undefined;
  const found = await findActiveSessionUser(db, hashSessionToken(token), now);
  if (!found) return undefined;
  return { id: found.user.id, email: found.user.email, name: found.user.name };
}

export async function revokeSession(db: Database, token: string | undefined): Promise<void> {
  if (token) await deleteSessionByTokenHash(db, hashSessionToken(token));
}

/** Computed once; used to equalize timing when the account does not exist. */
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password");
  return dummyHash;
}

export const defaultLoginThrottle = new LoginThrottle();

export interface LoginInput {
  email: string;
  password: string;
  /** Extra throttle dimension, e.g. client IP. */
  clientKey?: string;
}

/**
 * Verifies credentials and opens a session. Same error for unknown email,
 * wrong password and disabled account (no account enumeration).
 */
export async function login(
  db: Database,
  input: LoginInput,
  throttle: LoginThrottle = defaultLoginThrottle,
): Promise<{ user: SessionUser; token: string; expiresAt: Date }> {
  const email = input.email.trim().toLowerCase();
  const key = `${email}|${input.clientKey ?? "-"}`;
  const wait = throttle.retryAfterSeconds(key);
  if (wait > 0) throw new RateLimitError(wait);

  if (!email || !input.password || input.password.length > MAX_PASSWORD_LENGTH) {
    throttle.recordFailure(key);
    throw new AuthenticationError();
  }

  const user = await findUserByEmail(db, email);
  const stored = user?.passwordHash ?? (await getDummyHash());
  const passwordOk = await verifyPassword(input.password, stored);

  if (!user || !user.passwordHash || !passwordOk || user.status !== "active") {
    throttle.recordFailure(key);
    throw new AuthenticationError();
  }

  throttle.reset(key);
  const session = await createSession(db, user.id);
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
  });
  return { user: { id: user.id, email: user.email, name: user.name }, ...session };
}

export async function logout(
  db: Database,
  token: string | undefined,
  userId?: string,
): Promise<void> {
  await revokeSession(db, token);
  if (userId) {
    await insertAuditLog(db, {
      workspaceId: null,
      actorId: userId,
      action: "auth.logout",
      entityType: "user",
      entityId: userId,
    });
  }
}
