/**
 * Next.js glue for auth: session cookie + request-scoped current user.
 * The database stays the source of truth: the cookie only carries an opaque
 * token, verified against the `sessions` table on every request that needs it.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { listMemberships, type Membership } from "@/lib/db/repositories/workspaces";
import { login, logout, validateSession, type SessionUser } from "./sessions";

export const SESSION_COOKIE = "session";

function cookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // `next start` over plain http on localhost (e2e) opts out explicitly; never in real prod.
    secure: process.env.NODE_ENV === "production" && process.env.AUTH_INSECURE_COOKIES !== "1",
    path: "/",
    ...(expires ? { expires } : { maxAge: 0 }),
  };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", cookieOptions());
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Verified current user (DB lookup), de-duplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | undefined> => {
  const token = await readSessionToken();
  if (!token) return undefined;
  return validateSession(await getDb(), token);
});

/** Data Access Layer guard: use at the top of every protected page/action/handler. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export interface WorkspaceContext {
  user: SessionUser;
  memberships: Membership[];
  /** Active workspace = first membership (a workspace switcher is out of scope for F2). */
  active: Membership | undefined;
}

export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  const user = await requireUser();
  const memberships = await listMemberships(await getDb(), user.id);
  return { user, memberships, active: memberships[0] };
});

/** Verifies credentials, opens a session and sets the cookie. Throws Authentication/RateLimit errors. */
export async function signIn(email: string, password: string): Promise<void> {
  const { token, expiresAt } = await login(await getDb(), { email, password });
  await setSessionCookie(token, expiresAt);
}

/** Revokes the current session server-side and clears the cookie. */
export async function signOut(): Promise<void> {
  const user = await getCurrentUser();
  await logout(await getDb(), await readSessionToken(), user?.id);
  await clearSessionCookie();
}
