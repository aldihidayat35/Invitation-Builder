/**
 * PRD refs: NFR-REL-001, AC-14. Migration regression: every stored document
 * fixture of every historical schema version must keep migrating to the latest
 * canonical shape (published snapshots from old versions stay renderable).
 * When schema v2 ships, freeze a copy of today's output under `fixtures/documents/v2`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { migrateDocument, parseDocumentOrThrow } from "@/lib/schema";
import { createVariableRegistry, resolveDocument } from "@/lib/engine";

const ROOT = join(process.cwd(), "tests", "fixtures", "documents");

function fixtures(): { name: string; path: string }[] {
  const out: { name: string; path: string }[] = [];
  for (const dir of readdirSync(ROOT)) {
    const full = join(ROOT, dir);
    if (!statSync(full).isDirectory()) continue;
    for (const file of readdirSync(full)) {
      if (file.endsWith(".json")) out.push({ name: `${dir}/${file}`, path: join(full, file) });
    }
  }
  return out;
}

describe("document migration regression fixtures", () => {
  const all = fixtures();

  it("has at least one fixture per historical schema version", () => {
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((f) => f.name.startsWith("v1/"))).toBe(true);
  });

  it.each(all)("$name migrates, parses and resolves", ({ path }) => {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    const migrated = parseDocumentOrThrow(migrateDocument(raw));
    // Idempotent: migrating the latest shape is a no-op.
    expect(migrateDocument(migrated)).toEqual(migrated);
    // Renderable with empty data (resolver never throws; missing data is reported).
    expect(() => createVariableRegistry(migrated.variables)).not.toThrow();
    expect(() => resolveDocument(migrated, {}, {})).not.toThrow();
  });
});
