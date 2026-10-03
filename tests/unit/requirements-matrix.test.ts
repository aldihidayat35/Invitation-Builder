/**
 * PRD refs: P-01 (traceability), §25.2 (change control).
 * - docs/PRD_BASELINE.md must be a verbatim copy of the PRD source.
 * - docs/requirements-matrix.md must mention every requirement ID in the PRD.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (p: string) =>
  readFileSync(resolve(root, p), "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");

const BASELINE = "docs/PRD_BASELINE.md";
const MATRIX = "docs/requirements-matrix.md";
const PRD_SOURCE = "PRD_Digital_Invitation_Builder_v1.0.md";

const ID_PATTERN = /\b(?:P-\d{2}|FR-[A-Z]+-\d{3}|NFR-[A-Z0-9]+-\d{3}|AC-\d{2})\b/g;

function extractIds(text: string): Set<string> {
  return new Set(text.match(ID_PATTERN) ?? []);
}

/** Matrix IDs = IDs appearing in the first cell of a table row. */
function extractMatrixRowIds(text: string): Set<string> {
  const ids = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const cell = /^\|\s*([^|]+?)\s*\|/.exec(line)?.[1];
    if (cell && new RegExp(`^${ID_PATTERN.source}$`).test(cell)) ids.add(cell);
  }
  return ids;
}

describe("PRD baseline integrity (P-01)", () => {
  const baseline = read(BASELINE);

  it("embeds the checksum of the PRD content it was generated from", () => {
    const declared = /SHA-256:\s*([a-f0-9]{64})/.exec(baseline)?.[1];
    expect(declared).toBeDefined();
    const body = baseline.slice(baseline.indexOf("-->") + "-->".length).replace(/^\r?\n\r?\n/, "");
    expect(createHash("sha256").update(body, "utf8").digest("hex")).toBe(declared);
  });

  it.skipIf(!existsSync(resolve(root, PRD_SOURCE)))(
    "is identical to the PRD source file (no paraphrasing)",
    () => {
      const declared = /SHA-256:\s*([a-f0-9]{64})/.exec(baseline)?.[1];
      const source = read(PRD_SOURCE);
      expect(createHash("sha256").update(source, "utf8").digest("hex")).toBe(declared);
    },
  );
});

describe("requirements matrix completeness (P-01)", () => {
  const prdIds = extractIds(read(BASELINE));
  const matrixIds = extractMatrixRowIds(read(MATRIX));

  it("finds the expected requirement IDs per category in the PRD v1.0", () => {
    const count = (prefix: RegExp) => [...prdIds].filter((id) => prefix.test(id)).length;
    expect(count(/^P-/)).toBe(9); // §5 principles
    expect(count(/^FR-/)).toBe(45); // §8 functional requirements
    expect(count(/^NFR-/)).toBe(11); // §18 non-functional requirements
    expect(count(/^AC-/)).toBe(15); // §23 acceptance criteria
    expect(prdIds.size).toBe(80);
  });

  it("has a matrix row for every PRD requirement ID", () => {
    const missing = [...prdIds].filter((id) => !matrixIds.has(id)).sort();
    expect(missing).toEqual([]);
  });

  it("does not invent requirement IDs that are not in the PRD", () => {
    const unknown = [...matrixIds].filter((id) => !prdIds.has(id)).sort();
    expect(unknown).toEqual([]);
  });
});
