/**
 * JSON-safe static value validator for free-form widget props.
 *
 * PRD refs: NFR-SEC-001, guardrail #3/#10. Only plain JSON data is allowed:
 * no functions, no class instances, no prototype-pollution keys, and no keys
 * that look like script/raw-HTML/event-handler injection points.
 */
import { z } from "zod";

export type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export const JSON_LIMITS = {
  maxDepth: 6,
  maxNodes: 2000,
  maxStringLength: 5000,
} as const;

/** Keys (lower-cased) that must never appear in declarative data. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "script",
  "eval",
  "function",
  "html",
  "rawhtml",
  "innerhtml",
  "outerhtml",
  "dangerouslysetinnerhtml",
]);
const EVENT_HANDLER_KEY = /^on[A-Z]/;

export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key.toLowerCase()) || EVENT_HANDLER_KEY.test(key);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

interface WalkState {
  nodes: number;
}

function walk(
  value: unknown,
  path: (string | number)[],
  depth: number,
  state: WalkState,
  report: (path: (string | number)[], message: string) => void,
): void {
  state.nodes += 1;
  if (state.nodes > JSON_LIMITS.maxNodes) {
    if (state.nodes === JSON_LIMITS.maxNodes + 1) report(path, "Value is too large");
    return;
  }
  if (depth > JSON_LIMITS.maxDepth) {
    report(path, "Value is nested too deeply");
    return;
  }

  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) report(path, "Numbers must be finite");
    return;
  }
  if (typeof value === "string") {
    if (value.length > JSON_LIMITS.maxStringLength) report(path, "String is too long");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, [...path, index], depth + 1, state, report));
    return;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (isForbiddenKey(key)) {
        report([...path, key], `Key "${key}" is not allowed in declarative data`);
        continue;
      }
      walk(value[key], [...path, key], depth + 1, state, report);
    }
    return;
  }
  report(path, "Only plain JSON data is allowed");
}

/** Zod schema accepting only safe, plain JSON data. */
export const jsonValueSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    walk(value, [], 0, { nodes: 0 }, (path, message) =>
      ctx.addIssue({ code: "custom", path, message }),
    );
  })
  .transform((value) => value as JsonValue);
