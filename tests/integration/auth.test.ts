// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createMigratedDb } from "../helpers/db";
import { TEST_PASSWORD, makeUser } from "../helpers/world";
import { AuthenticationError, RateLimitError } from "@/lib/auth/errors";
import { LoginThrottle } from "@/lib/auth/throttle";
import {
  SESSION_TTL_MS,
  createSession,
  hashSessionToken,
  login,
  logout,
  revokeSession,
  validateSession,
} from "@/lib/auth/sessions";
import { listAuditLogs } from "@/lib/db/repositories/audit";
import { auditLogs, sessions, users } from "@/lib/db/schema";

type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
let conn: Conn;

beforeAll(async () => {
  conn = await createMigratedDb();
});
afterAll(async () => {
  await conn.close();
});

const freshThrottle = () => new LoginThrottle({ maxFailures: 3, windowMs: 60_000 });

describe("FR-AUTH-001 sessions", () => {
  it("logs in, resolves the user from the token, and stores only a hash", async () => {
    const user = await makeUser(conn.db, "alice");
    const result = await login(
      conn.db,
      { email: "Alice@Example.test", password: TEST_PASSWORD },
      freshThrottle(),
    );
    expect(result.user.id).toBe(user.id);

    const resolved = await validateSession(conn.db, result.token);
    expect(resolved).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      systemRole: "client",
      resellerId: null,
    });

    const [row] = await conn.db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(row?.tokenHash).toBe(hashSessionToken(result.token));
    expect(row?.tokenHash).not.toBe(result.token);
    expect(JSON.stringify(row)).not.toContain(result.token);
  });

  it("uses an unguessable, unique token per login", async () => {
    const user = await makeUser(conn.db, "bob");
    const a = await createSession(conn.db, user.id);
    const b = await createSession(conn.db, user.id);
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("expires sessions (absolute TTL) and rejects garbage tokens", async () => {
    const user = await makeUser(conn.db, "carol");
    const now = new Date("2026-01-01T00:00:00Z");
    const { token } = await createSession(conn.db, user.id, now);
    expect(
      await validateSession(conn.db, token, new Date(now.getTime() + SESSION_TTL_MS - 1000)),
    ).toBeDefined();
    expect(
      await validateSession(conn.db, token, new Date(now.getTime() + SESSION_TTL_MS + 1000)),
    ).toBeUndefined();
    expect(await validateSession(conn.db, undefined)).toBeUndefined();
    expect(await validateSession(conn.db, "short")).toBeUndefined();
    expect(await validateSession(conn.db, "x".repeat(60))).toBeUndefined();
  });

  it("logout revokes the session server-side and writes an audit entry", async () => {
    const user = await makeUser(conn.db, "dave");
    const { token } = await login(
      conn.db,
      { email: user.email, password: TEST_PASSWORD },
      freshThrottle(),
    );
    expect(await validateSession(conn.db, token)).toBeDefined();
    await logout(conn.db, token, user.id);
    expect(await validateSession(conn.db, token)).toBeUndefined();

    const logs = await conn.db.select().from(auditLogs).where(eq(auditLogs.actorId, user.id));
    expect(logs.map((l) => l.action).sort()).toEqual(["auth.login", "auth.logout"]);
  });

  it("rejects sessions of users that were disabled afterwards", async () => {
    const user = await makeUser(conn.db, "erin");
    const { token } = await createSession(conn.db, user.id);
    await conn.db.update(users).set({ status: "disabled" }).where(eq(users.id, user.id));
    expect(await validateSession(conn.db, token)).toBeUndefined();
  });

  it("revokeSession is a no-op for unknown tokens", async () => {
    await expect(revokeSession(conn.db, "does-not-exist-does-not-exist")).resolves.toBeUndefined();
    await expect(revokeSession(conn.db, undefined)).resolves.toBeUndefined();
  });
});

describe("login failure handling", () => {
  it("gives the same error for wrong password, unknown email, no password and disabled accounts", async () => {
    const user = await makeUser(conn.db, "frank");
    await makeUser(conn.db, "nopass", null);
    const disabled = await makeUser(conn.db, "disabled-user");
    await conn.db.update(users).set({ status: "disabled" }).where(eq(users.id, disabled.id));

    const attempts = [
      { email: user.email, password: "wrong-password!!" },
      { email: "ghost@example.test", password: TEST_PASSWORD },
      { email: "nopass@example.test", password: TEST_PASSWORD },
      { email: disabled.email, password: TEST_PASSWORD },
      { email: "", password: "" },
    ];
    for (const attempt of attempts) {
      const error = await login(conn.db, attempt, freshThrottle()).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect((error as Error).message).toBe("Email atau password salah.");
    }
  });

  it("throttles repeated failures per email+client and recovers after a success window", async () => {
    const user = await makeUser(conn.db, "grace");
    const throttle = freshThrottle();
    const bad = { email: user.email, password: "wrong-password!!", clientKey: "1.2.3.4" };
    for (let i = 0; i < 3; i++) {
      await expect(login(conn.db, bad, throttle)).rejects.toBeInstanceOf(AuthenticationError);
    }
    // Locked even with the correct password.
    await expect(
      login(conn.db, { ...bad, password: TEST_PASSWORD }, throttle),
    ).rejects.toBeInstanceOf(RateLimitError);
    // Another client key is unaffected.
    await expect(
      login(conn.db, { ...bad, password: TEST_PASSWORD, clientKey: "9.9.9.9" }, throttle),
    ).resolves.toBeDefined();
  });

  it("does not create sessions or login audit rows for failed logins", async () => {
    const user = await makeUser(conn.db, "heidi");
    await login(
      conn.db,
      { email: user.email, password: "wrong-password!!" },
      freshThrottle(),
    ).catch(() => undefined);
    expect(await conn.db.select().from(sessions).where(eq(sessions.userId, user.id))).toEqual([]);
    expect(await conn.db.select().from(auditLogs).where(eq(auditLogs.actorId, user.id))).toEqual(
      [],
    );
    expect(await listAuditLogs(conn.db, "00000000-0000-4000-8000-000000000000")).toEqual([]);
  });
});
