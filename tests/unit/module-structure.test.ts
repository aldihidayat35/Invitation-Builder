/**
 * Fase 0 acceptance: required module structure exists, and the renderer
 * module does not depend on canvas/editor code (P-04).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(__dirname, "../..");

const REQUIRED_DIRS = [
  "src/app",
  "src/features/editor",
  "src/features/templates",
  "src/features/invitations",
  "src/features/widgets",
  "src/features/animations",
  "src/features/renderer",
  "src/lib/schema",
  "src/lib/db",
  "src/lib/auth",
  "tests",
  "docs/decisions",
] as const;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("module structure (Fase 0)", () => {
  it.each(REQUIRED_DIRS)("has %s", (dir) => {
    expect(existsSync(resolve(root, dir))).toBe(true);
  });

  it("has the architecture baseline ADR", () => {
    expect(existsSync(resolve(root, "docs/decisions/0001-architecture-baseline.md"))).toBe(true);
  });

  it("keeps the renderer free of Konva/canvas/editor imports (P-04)", () => {
    const files = walk(resolve(root, "src/features/renderer")).filter((f) => /\.tsx?$/.test(f));
    const offenders = files.filter((f) =>
      /from\s+["'](?:konva|react-konva|@\/features\/editor)/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
