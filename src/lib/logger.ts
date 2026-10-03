/**
 * Structured (JSON-line) logging with request correlation. Sensitive keys are
 * redacted so tokens, passwords and cookies never reach logs.
 */
import { reportError } from "./telemetry";

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Readonly<Record<string, unknown>>;

const SENSITIVE_KEY = /token|password|secret|cookie|authorization|session/i;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function newRequestId(): string {
  return crypto.randomUUID();
}

/** Accepts a caller-supplied id only if it is a short, safe token; otherwise generates one. */
export function requestIdFrom(request: Request): string {
  const supplied = request.headers.get("x-request-id");
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : newRequestId();
}

export function redact(fields: LogFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : value;
  }
  return out;
}

export function errorFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { errorName: error.name, errorMessage: error.message };
  return { errorMessage: String(error) };
}

export function formatLog(level: LogLevel, message: string, fields: LogFields = {}): string {
  return JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...redact(fields),
  });
}

export function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  const line = formatLog(level, message, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Logs an error with correlation fields and forwards it to the telemetry sink. */
export function logError(message: string, error: unknown, fields: LogFields = {}): void {
  log("error", message, { ...fields, ...errorFields(error) });
  reportError(error, fields);
}
