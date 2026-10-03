/**
 * Variable registry helpers: define, validate, default, required, formatter
 * whitelist.
 *
 * PRD refs: FR-VAR-001, FR-INV-002 (data validated against the variable
 * schema), P-02. Pure and framework-free.
 */
import type { z } from "zod";
import {
  FORMATTER_NAMES,
  FORMATTER_ACCEPTS,
  RUNTIME_CONTEXT_VARIABLES,
  isFormatterCompatible,
  valueSchemaForVariable,
  variableDefinitionSchema,
  type FormatterName,
  type VariableDefinition,
  type VariableDefinitionInput,
  type VariableType,
} from "@/lib/schema";
import type { DataIssue, InvitationData } from "./types";

/** Throws with a readable message if the definition is not valid (use at authoring time). */
export function defineVariable(input: VariableDefinitionInput): VariableDefinition {
  const result = variableDefinitionSchema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid variable definition: ${detail}`);
  }
  return result.data;
}

/** A value counts as "not provided" when absent, null, blank text, or an empty list. */
export function isMissingValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export interface VariableRegistry {
  readonly definitions: readonly VariableDefinition[];
  get(key: string): VariableDefinition | undefined;
  has(key: string): boolean;
  /** Declared type, or the runtime context type (e.g. `guest.name`). */
  typeOf(key: string): VariableType | undefined;
  /** Declared required variables that are filled by the invitation form (not runtime). */
  required(): readonly VariableDefinition[];
  /** Static default of a variable, if declared. */
  defaultFor(key: string): unknown;
  /** Zod schema for a variable's value (cached). */
  schemaFor(key: string): z.ZodType | undefined;
}

export function createVariableRegistry(
  definitions: readonly VariableDefinition[],
): VariableRegistry {
  const byKey = new Map<string, VariableDefinition>();
  for (const def of definitions) {
    if (byKey.has(def.key)) throw new Error(`Duplicate variable key "${def.key}"`);
    byKey.set(def.key, def);
  }
  const schemas = new Map<string, z.ZodType>();

  return {
    definitions,
    get: (key) => byKey.get(key),
    has: (key) => byKey.has(key),
    typeOf(key) {
      const def = byKey.get(key);
      if (def) return def.type;
      return Object.hasOwn(RUNTIME_CONTEXT_VARIABLES, key)
        ? RUNTIME_CONTEXT_VARIABLES[key]
        : undefined;
    },
    required: () => definitions.filter((d) => d.required && d.type !== "guest-context"),
    defaultFor(key) {
      const def = byKey.get(key);
      return def && "default" in def ? def.default : undefined;
    },
    schemaFor(key) {
      const cached = schemas.get(key);
      if (cached) return cached;
      const def = byKey.get(key);
      if (!def) return undefined;
      const schema = valueSchemaForVariable(def);
      schemas.set(key, schema);
      return schema;
    },
  };
}

/** Whitelist introspection (no dynamic formatter lookup anywhere). */
export const FORMATTER_WHITELIST: readonly FormatterName[] = FORMATTER_NAMES;

export function formattersFor(type: VariableType): FormatterName[] {
  return FORMATTER_WHITELIST.filter((name) => isFormatterCompatible(name, type));
}

export function isFormatterWhitelisted(name: string): name is FormatterName {
  return (FORMATTER_WHITELIST as readonly string[]).includes(name);
}

/** For tooling: map of formatter -> accepted variable types. */
export const FORMATTER_TYPE_MATRIX = FORMATTER_ACCEPTS;

/** Own-property read (prevents prototype keys such as `constructor` leaking in). */
export function readOwn(data: InvitationData, key: string): unknown {
  return Object.hasOwn(data, key) ? data[key] : undefined;
}

/**
 * Validates invitation data against variable definitions (FR-INV-002).
 * - required variables must be present (or have a declared default);
 * - present values must satisfy the variable's type and constraints;
 * - keys with no definition are reported (typo/stale data detection);
 * - `guest-context` variables are runtime-only and never come from this data.
 */
export function validateInvitationData(
  registry: VariableRegistry,
  data: InvitationData,
): DataIssue[] {
  const issues: DataIssue[] = [];

  for (const def of registry.definitions) {
    if (def.type === "guest-context") continue;
    const raw = readOwn(data, def.key);
    const hasDefault = registry.defaultFor(def.key) !== undefined;

    if (isMissingValue(raw)) {
      if (def.required && !hasDefault) {
        issues.push({
          key: def.key,
          code: "missing_required",
          message: `"${def.label}" wajib diisi`,
        });
      }
      continue;
    }
    const result = registry.schemaFor(def.key)?.safeParse(raw);
    if (result && !result.success) {
      issues.push({
        key: def.key,
        code: "wrong_type",
        message: `"${def.label}": ${result.error.issues[0]?.message ?? "nilai tidak valid"}`,
      });
    }
  }

  for (const key of Object.keys(data)) {
    if (!registry.has(key)) {
      issues.push({
        key,
        code: "unknown_key",
        message: `Key "${key}" tidak didefinisikan di variable schema`,
      });
    }
  }
  return issues;
}

/** New data object where missing/blank variables are filled from their defaults (no mutation). */
export function applyDefaults(registry: VariableRegistry, data: InvitationData): InvitationData {
  const out: Record<string, unknown> = { ...data };
  for (const def of registry.definitions) {
    if (def.type === "guest-context") continue;
    if (isMissingValue(readOwn(data, def.key))) {
      const fallback = registry.defaultFor(def.key);
      if (fallback !== undefined) out[def.key] = structuredClone(fallback);
    }
  }
  return out;
}
