/**
 * PRD refs: NFR-SEC-001, §19, Lampiran C. Strict allow-list URL validation.
 */
import { isSafeUrl, parseSafeUrl, safeUrlSchema } from "@/lib/schema";

describe("safe URL validator", () => {
  it.each([
    "https://maps.google.com/?q=-7.79,110.36",
    "HTTPS://Example.com/path?x=1#frag",
    "mailto:hello@example.com",
    "tel:+628123456789",
  ])("accepts %s", (url) => {
    expect(isSafeUrl(url)).toBe(true);
  });

  it.each([
    ["javascript:alert(1)", "disallowed_protocol"],
    ["JaVaScRiPt:alert(1)", "disallowed_protocol"],
    ["vbscript:msgbox(1)", "disallowed_protocol"],
    ["data:text/html,<script>alert(1)</script>", "disallowed_protocol"],
    ["file:///etc/passwd", "disallowed_protocol"],
    ["blob:https://example.com/uuid", "disallowed_protocol"],
    ["ftp://example.com/file", "disallowed_protocol"],
    ["http://example.com", "disallowed_protocol"], // https only by default
  ])("rejects %s (%s)", (url, reason) => {
    expect(parseSafeUrl(url)).toEqual({ ok: false, reason });
  });

  it.each([
    [" javascript:alert(1)", "forbidden_characters"],
    ["javascript:alert(1) ", "forbidden_characters"],
    ["java\tscript:alert(1)", "forbidden_characters"],
    ["java\nscript:alert(1)", "forbidden_characters"],
    ["jav\u200Bascript:alert(1)", "forbidden_characters"],
    ["https://exa mple.com", "forbidden_characters"],
    ["https:\\\\evil.com", "backslash"],
    ["//evil.com/path", "protocol_relative"],
    ["https://user:pw@evil.com", "credentials_in_url"],
    ["https://", "unparseable"],
    ["example.com", "unparseable"],
    ["", "empty"],
  ])("rejects obfuscated/malformed %j (%s)", (url, reason) => {
    expect(parseSafeUrl(url)).toEqual({ ok: false, reason });
  });

  it("rejects non-strings and over-long URLs", () => {
    expect(parseSafeUrl(42)).toEqual({ ok: false, reason: "not_a_string" });
    expect(parseSafeUrl(`https://example.com/${"a".repeat(3000)}`)).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("only allows same-origin relative paths when enabled, never //host", () => {
    expect(parseSafeUrl("/assets/a.png")).toEqual({ ok: false, reason: "relative_not_allowed" });
    expect(parseSafeUrl("/assets/a.png", { allowRelative: true })).toEqual({
      ok: true,
      url: "/assets/a.png",
      kind: "relative",
    });
    expect(parseSafeUrl("//evil.com", { allowRelative: true })).toEqual({
      ok: false,
      reason: "protocol_relative",
    });
  });

  it("allows http only when explicitly configured", () => {
    expect(isSafeUrl("http://localhost:3000/a", { protocols: ["https", "http"] })).toBe(true);
  });

  it("provides a Zod schema that reports the failure reason", () => {
    const schema = safeUrlSchema();
    expect(schema.safeParse("https://example.com").success).toBe(true);
    const bad = schema.safeParse("javascript:alert(1)");
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe("URL protocol is not allowed");
  });
});
