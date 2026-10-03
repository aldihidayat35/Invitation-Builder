import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  DocumentMigrationError,
  canonicalDocumentV1Schema,
  createMigrator,
  migrateDocument,
} from "@/lib/schema";
import { fullDocument, minimalDocument } from "../../helpers/documents";

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof DocumentMigrationError) return error.code;
    throw error;
  }
  return undefined;
}

describe("migrateDocument (NFR-REL-001, AC-14)", () => {
  it("migrates the v1 fixtures to themselves", () => {
    const full = fullDocument();
    expect(migrateDocument(full)).toEqual(canonicalDocumentV1Schema.parse(full));
    expect(migrateDocument(minimalDocument()).schemaVersion).toBe(1);
  });

  it("does not mutate its input", () => {
    const frozen = deepFreeze(fullDocument());
    expect(() => migrateDocument(frozen)).not.toThrow();
  });

  it("rejects missing, future and non-integer versions", () => {
    expect(codeOf(() => migrateDocument({ sections: [] }))).toBe("missing_schema_version");
    expect(codeOf(() => migrateDocument({ schemaVersion: 1.5 }))).toBe("missing_schema_version");
    expect(codeOf(() => migrateDocument({ schemaVersion: 0 }))).toBe("missing_schema_version");
    expect(codeOf(() => migrateDocument({ schemaVersion: 99 }))).toBe("unsupported_future_version");
  });

  it("rejects non-object and non-cloneable input", () => {
    expect(codeOf(() => migrateDocument(null))).toBe("invalid_input");
    expect(codeOf(() => migrateDocument([]))).toBe("invalid_input");
    expect(codeOf(() => migrateDocument("x"))).toBe("invalid_input");
    expect(codeOf(() => migrateDocument({ schemaVersion: 1, fn: () => 1 }))).toBe("invalid_input");
  });

  it("reports invalid documents with issues", () => {
    const doc = fullDocument() as unknown as { sections: { elements: { id: string }[] }[] };
    const first = doc.sections[0]?.elements[0];
    const second = doc.sections[0]?.elements[1];
    if (!first || !second) throw new Error("fixture shape");
    second.id = first.id;
    try {
      migrateDocument(doc);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentMigrationError);
      expect((error as DocumentMigrationError).code).toBe("invalid_document");
      expect((error as DocumentMigrationError).issues.length).toBeGreaterThan(0);
    }
  });
});

describe("createMigrator chain", () => {
  const looseSchema = z.looseObject({ schemaVersion: z.number() });

  it("applies chained migrations in order and stamps the version", () => {
    const order: number[] = [];
    const migrate = createMigrator({
      latestVersion: 3,
      migrations: [
        {
          from: 2,
          to: 3,
          migrate: (d) => {
            order.push(2);
            return { ...d, v3: true };
          },
        },
        {
          from: 1,
          to: 2,
          migrate: (d) => {
            order.push(1);
            return { ...d, v2: true };
          },
        },
      ],
      schema: looseSchema,
    });
    const result = migrate({ schemaVersion: 1, sections: [] }) as Record<string, unknown>;
    expect(order).toEqual([1, 2]);
    expect(result.schemaVersion).toBe(3);
    expect(result.v2).toBe(true);
    expect(result.v3).toBe(true);
  });

  it("fails with no_migration_path when a step is missing", () => {
    const migrate = createMigrator({
      latestVersion: 2,
      migrations: [],
      schema: canonicalDocumentV1Schema,
    });
    expect(codeOf(() => migrate({ schemaVersion: 1 }))).toBe("no_migration_path");
  });

  it("validates the registry at creation", () => {
    const noop = (d: Record<string, unknown>) => d;
    const base = { latestVersion: 2, schema: canonicalDocumentV1Schema };
    expect(() =>
      createMigrator({ ...base, migrations: [{ from: 1, to: 1, migrate: noop }] }),
    ).toThrow();
    expect(() =>
      createMigrator({ ...base, migrations: [{ from: 1, to: 3, migrate: noop }] }),
    ).toThrow();
    expect(() =>
      createMigrator({
        ...base,
        migrations: [
          { from: 1, to: 2, migrate: noop },
          { from: 1, to: 2, migrate: noop },
        ],
      }),
    ).toThrow();
  });
});
