/**
 * PRD refs: NFR-OBS (structured logging, requestId, telemetry integration point),
 * NFR-SEC (no secret leakage in logs, baseline headers).
 */
import nextConfig, { SECURITY_HEADERS } from "../../next.config";
import { formatLog, redact, requestIdFrom } from "@/lib/logger";
import { reportError, setTelemetrySink } from "@/lib/telemetry";

describe("logger", () => {
  it("emits one JSON line with level, time and message", () => {
    const parsed = JSON.parse(formatLog("warn", "hello", { requestId: "abc12345", n: 1 }));
    expect(parsed).toMatchObject({ level: "warn", message: "hello", requestId: "abc12345", n: 1 });
    expect(Date.parse(parsed.time)).not.toBeNaN();
  });

  it("redacts sensitive keys", () => {
    expect(
      redact({ guestToken: "t", password: "p", Authorization: "a", cookie: "c", route: "/x" }),
    ).toEqual({
      guestToken: "[redacted]",
      password: "[redacted]",
      Authorization: "[redacted]",
      cookie: "[redacted]",
      route: "/x",
    });
  });

  it("keeps a safe supplied x-request-id and replaces unsafe ones", () => {
    const ok = new Request("http://t", { headers: { "x-request-id": "req-1234abcd" } });
    expect(requestIdFrom(ok)).toBe("req-1234abcd");
    const bad = new Request("http://t", { headers: { "x-request-id": "bad id; drop table" } });
    expect(requestIdFrom(bad)).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdFrom(new Request("http://t"))).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("telemetry integration point", () => {
  afterEach(() => setTelemetrySink(null));

  it("forwards errors with context to the registered sink", () => {
    const sink = vi.fn();
    setTelemetrySink(sink);
    const error = new Error("boom");
    reportError(error, { requestId: "r1", route: "/x" });
    expect(sink).toHaveBeenCalledWith(error, { requestId: "r1", route: "/x" });
  });

  it("is a no-op without a sink and never throws when the sink fails", () => {
    expect(() => reportError(new Error("x"))).not.toThrow();
    setTelemetrySink(() => {
      throw new Error("sink down");
    });
    expect(() => reportError(new Error("x"))).not.toThrow();
  });
});

describe("security headers config", () => {
  it("applies baseline headers to all routes and hides X-Powered-By", async () => {
    const keys = SECURITY_HEADERS.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options"]),
    );
    expect(SECURITY_HEADERS.find((h) => h.key === "X-Content-Type-Options")?.value).toBe("nosniff");
    const rules = await nextConfig.headers?.();
    expect(rules?.[0]?.source).toBe("/:path*");
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
