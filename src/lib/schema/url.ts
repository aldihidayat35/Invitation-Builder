/**
 * Safe URL validator.
 *
 * PRD refs: §19 ("URL hanya mengizinkan protocol aman"), NFR-SEC-001,
 * Lampiran C ("Tidak ada URL/protocol yang dilarang").
 *
 * Strategy: strict allow-list. Anything not explicitly allowed is rejected —
 * this includes `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`,
 * protocol-relative URLs (`//host`), credentials in URLs, and any URL
 * containing whitespace/control/invisible characters (used to obfuscate
 * schemes such as `java\tscript:`).
 */
import { z } from "zod";

export type SafeProtocol = "https" | "http" | "mailto" | "tel";

export interface SafeUrlOptions {
  /** Allowed protocols without the trailing colon. Default: https, mailto, tel. */
  readonly protocols?: readonly SafeProtocol[];
  /** Allow same-origin absolute paths such as `/assets/a.png` (never `//host`). */
  readonly allowRelative?: boolean;
  /** Maximum accepted length. Default 2048. */
  readonly maxLength?: number;
}

export const DEFAULT_SAFE_PROTOCOLS: readonly SafeProtocol[] = ["https", "mailto", "tel"];
export const DEFAULT_MAX_URL_LENGTH = 2048;

export type SafeUrlFailure =
  | "not_a_string"
  | "empty"
  | "too_long"
  | "forbidden_characters"
  | "backslash"
  | "protocol_relative"
  | "relative_not_allowed"
  | "unparseable"
  | "disallowed_protocol"
  | "missing_host"
  | "credentials_in_url";

export type SafeUrlResult =
  | { readonly ok: true; readonly url: string; readonly kind: "absolute" | "relative" }
  | { readonly ok: false; readonly reason: SafeUrlFailure };

/** Control chars, all whitespace, NBSP, zero-width and bidi/invisible characters. */

const FORBIDDEN_CHARS =
  /[\u0000-\u0020\u007F-\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/;

const FAILURE_MESSAGES: Record<SafeUrlFailure, string> = {
  not_a_string: "URL must be a string",
  empty: "URL must not be empty",
  too_long: "URL is too long",
  forbidden_characters: "URL must not contain whitespace or control characters",
  backslash: "URL must not contain backslashes",
  protocol_relative: "Protocol-relative URLs are not allowed",
  relative_not_allowed: "Relative URLs are not allowed here",
  unparseable: "URL is not valid",
  disallowed_protocol: "URL protocol is not allowed",
  missing_host: "URL must include a host",
  credentials_in_url: "URL must not contain credentials",
};

export function describeSafeUrlFailure(reason: SafeUrlFailure): string {
  return FAILURE_MESSAGES[reason];
}

export function parseSafeUrl(input: unknown, options: SafeUrlOptions = {}): SafeUrlResult {
  const protocols = options.protocols ?? DEFAULT_SAFE_PROTOCOLS;
  const maxLength = options.maxLength ?? DEFAULT_MAX_URL_LENGTH;

  if (typeof input !== "string") return { ok: false, reason: "not_a_string" };
  if (input.length === 0) return { ok: false, reason: "empty" };
  if (input.length > maxLength) return { ok: false, reason: "too_long" };
  if (FORBIDDEN_CHARS.test(input)) return { ok: false, reason: "forbidden_characters" };
  if (input.includes("\\")) return { ok: false, reason: "backslash" };

  if (input.startsWith("/")) {
    if (input.startsWith("//")) return { ok: false, reason: "protocol_relative" };
    if (!options.allowRelative) return { ok: false, reason: "relative_not_allowed" };
    return { ok: true, url: input, kind: "relative" };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, reason: "unparseable" };
  }

  const protocol = parsed.protocol.slice(0, -1).toLowerCase();
  if (!(protocols as readonly string[]).includes(protocol)) {
    return { ok: false, reason: "disallowed_protocol" };
  }

  if (protocol === "http" || protocol === "https") {
    if (parsed.hostname.length === 0) return { ok: false, reason: "missing_host" };
    if (parsed.username.length > 0 || parsed.password.length > 0) {
      return { ok: false, reason: "credentials_in_url" };
    }
  }

  return { ok: true, url: input, kind: "absolute" };
}

export function isSafeUrl(input: unknown, options?: SafeUrlOptions): input is string {
  return parseSafeUrl(input, options).ok;
}

/** Zod schema that accepts only safe URLs. Output is the unchanged string. */
export function safeUrlSchema(options?: SafeUrlOptions) {
  return z.string().superRefine((value, ctx) => {
    const result = parseSafeUrl(value, options);
    if (!result.ok) {
      ctx.addIssue({
        code: "custom",
        message: describeSafeUrlFailure(result.reason),
        params: { reason: result.reason },
      });
    }
  });
}
