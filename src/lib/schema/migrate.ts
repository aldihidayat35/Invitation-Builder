/**
 * Document migration registry.
 *
 * PRD refs: §15.3 (schema evolution), NFR-REL-001, guardrail #11.
 * - Migrations are pure functions from version N to a later version.
 * - Input is deep-cloned first, so callers' data (e.g. stored snapshots) is
 *   never mutated, and non-cloneable input (functions, etc.) is rejected.
 * - The result is always parsed with the latest schema.
 */
import type { z } from "zod";
import {
  canonicalDocumentSchema,
  describeIssues,
  LATEST_SCHEMA_VERSION,
  type CanonicalDocument,
  type DocumentIssue,
} from "./document";

export interface DocumentMigration {
  readonly from: number;
  readonly to: number;
  /** Must be pure: no I/O, no randomness, no clock. */
  readonly migrate: (document: Record<string, unknown>) => Record<string, unknown>;
}

export type MigrationErrorCode =
  | "invalid_input"
  | "missing_schema_version"
  | "unsupported_future_version"
  | "no_migration_path"
  | "invalid_document";

export class DocumentMigrationError extends Error {
  readonly code: MigrationErrorCode;
  readonly issues: readonly DocumentIssue[];

  constructor(code: MigrationErrorCode, message: string, issues: readonly DocumentIssue[] = []) {
    super(message);
    this.name = "DocumentMigrationError";
    this.code = code;
    this.issues = issues;
  }
}

export interface MigratorConfig<T> {
  readonly latestVersion: number;
  readonly migrations: readonly DocumentMigration[];
  readonly schema: z.ZodType<T>;
}

export function readSchemaVersion(input: unknown): number | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const version = (input as Record<string, unknown>).schemaVersion;
  return typeof version === "number" && Number.isInteger(version) && version >= 1
    ? version
    : undefined;
}

/** Builds a `migrate(input) -> latest` function. Exposed for testing future versions. */
export function createMigrator<T>(config: MigratorConfig<T>): (input: unknown) => T {
  const byFrom = new Map<number, DocumentMigration>();
  for (const migration of config.migrations) {
    if (!(migration.to > migration.from)) {
      throw new Error(`Invalid migration ${migration.from}->${migration.to}: "to" must be greater`);
    }
    if (migration.to > config.latestVersion) {
      throw new Error(`Migration ${migration.from}->${migration.to} exceeds latest version`);
    }
    if (byFrom.has(migration.from)) {
      throw new Error(`Duplicate migration registered from version ${migration.from}`);
    }
    byFrom.set(migration.from, migration);
  }

  return (input: unknown): T => {
    let working: Record<string, unknown>;
    try {
      const cloned: unknown = structuredClone(input);
      if (typeof cloned !== "object" || cloned === null || Array.isArray(cloned)) {
        throw new DocumentMigrationError("invalid_input", "Document must be a JSON object");
      }
      working = cloned as Record<string, unknown>;
    } catch (error) {
      if (error instanceof DocumentMigrationError) throw error;
      throw new DocumentMigrationError("invalid_input", "Document is not plain cloneable data");
    }

    let version = readSchemaVersion(working);
    if (version === undefined) {
      throw new DocumentMigrationError(
        "missing_schema_version",
        "Document has no valid integer schemaVersion",
      );
    }
    if (version > config.latestVersion) {
      throw new DocumentMigrationError(
        "unsupported_future_version",
        `Document schemaVersion ${version} is newer than supported ${config.latestVersion}`,
      );
    }

    while (version < config.latestVersion) {
      const step = byFrom.get(version);
      if (!step) {
        throw new DocumentMigrationError(
          "no_migration_path",
          `No migration registered from schemaVersion ${version}`,
        );
      }
      working = step.migrate(working);
      working.schemaVersion = step.to;
      version = step.to;
    }

    const result = config.schema.safeParse(working);
    if (!result.success) {
      throw new DocumentMigrationError(
        "invalid_document",
        "Document does not satisfy the latest schema",
        describeIssues(working, result.error),
      );
    }
    return result.data;
  };
}

/**
 * Registered migrations for the canonical document. Empty while v1 is the
 * only version; the first breaking change adds `{ from: 1, to: 2, ... }`
 * together with a v1 fixture + test (PRD §15.3).
 */
export const DOCUMENT_MIGRATIONS: readonly DocumentMigration[] = [];

/** `migrateDocument(input) -> latest`: upgrades any supported version to the latest schema. */
export const migrateDocument: (input: unknown) => CanonicalDocument = createMigrator({
  latestVersion: LATEST_SCHEMA_VERSION,
  migrations: DOCUMENT_MIGRATIONS,
  schema: canonicalDocumentSchema,
});
