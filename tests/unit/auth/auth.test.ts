import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCRYPT_PARAMS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  assertPasswordPolicy,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import { LoginThrottle } from "@/lib/auth/throttle";
import { CAPABILITIES, roleCan } from "@/lib/auth/authorization";
import { safeNextPath } from "@/lib/auth/redirect";
import { WORKSPACE_ROLES } from "@/lib/schema/domain";

const cheap = { N: 1024, r: 8, p: 1 } as const;

describe("password hashing (FR-AUTH-001)", () => {
  it("round-trips and uses a random salt", async () => {
    const a = await hashPassword("a-long-enough-password", cheap);
    const b = await hashPassword("a-long-enough-password", cheap);
    expect(a).not.toBe(b);
    expect(await verifyPassword("a-long-enough-password", a)).toBe(true);
    expect(await verifyPassword("a-long-enough-passworD", a)).toBe(false);
    expect(a.startsWith("scrypt$1024$8$1$")).toBe(true);
    expect(a).not.toContain("a-long-enough-password");
  });

  it("defaults to OWASP-strength parameters", () => {
    expect(DEFAULT_SCRYPT_PARAMS.N).toBeGreaterThanOrEqual(1 << 16);
  });

  it("treats malformed stored hashes as a failed match instead of throwing", async () => {
    for (const bad of [
      "",
      "plain",
      "scrypt$x$y$z$a$b",
      "scrypt$3$8$1$AAAA$AAAA",
      "md5$1$2$3$4$5",
      `scrypt$${2 ** 30}$8$1$AAAA$AAAA`,
    ]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  it("enforces the password policy bounds", () => {
    expect(() => assertPasswordPolicy("x".repeat(MIN_PASSWORD_LENGTH - 1))).toThrow();
    expect(() => assertPasswordPolicy("x".repeat(MAX_PASSWORD_LENGTH + 1))).toThrow();
    expect(() => assertPasswordPolicy("x".repeat(MIN_PASSWORD_LENGTH))).not.toThrow();
  });
});

describe("LoginThrottle", () => {
  it("locks after maxFailures within the window and unlocks after it", () => {
    let now = 1_000_000;
    const t = new LoginThrottle({ maxFailures: 3, windowMs: 60_000, now: () => now });
    expect(t.retryAfterSeconds("k")).toBe(0);
    t.recordFailure("k");
    t.recordFailure("k");
    expect(t.retryAfterSeconds("k")).toBe(0);
    t.recordFailure("k");
    expect(t.retryAfterSeconds("k")).toBeGreaterThan(0);
    expect(t.retryAfterSeconds("other")).toBe(0);
    now += 61_000;
    expect(t.retryAfterSeconds("k")).toBe(0);
  });

  it("reset clears the failures", () => {
    const t = new LoginThrottle({ maxFailures: 1, windowMs: 60_000 });
    t.recordFailure("k");
    expect(t.retryAfterSeconds("k")).toBeGreaterThan(0);
    t.reset("k");
    expect(t.retryAfterSeconds("k")).toBe(0);
  });
});

describe("role capability matrix (PRD §4)", () => {
  const expected: Record<(typeof WORKSPACE_ROLES)[number], readonly string[]> = {
    owner: [...CAPABILITIES],
    admin: [...CAPABILITIES],
    designer: ["template:read", "template:write", "template:publish", "asset:read", "asset:write"],
    operator: ["template:read", "asset:read"],
  };

  it.each(WORKSPACE_ROLES)("%s has exactly the expected capabilities", (role) => {
    const granted = CAPABILITIES.filter((c) => roleCan(role, c));
    expect(granted).toEqual(CAPABILITIES.filter((c) => expected[role].includes(c)));
  });
});

describe("safeNextPath (open-redirect guard)", () => {
  it.each(["/dashboard", "/dashboard/templates/abc?x=1"])("allows %s", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });

  it.each([
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/login",
    "/dash\nboard",
    "",
    undefined,
    42,
  ])("falls back for %j", (p) => {
    expect(safeNextPath(p)).toBe("/dashboard");
  });
});
