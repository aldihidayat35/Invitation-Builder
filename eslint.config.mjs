import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const DB_MESSAGE = "Fase 1: UI must not access the database directly; use a feature service.";
const DB_PATHS = ["drizzle-orm", "pg", "@electric-sql/pglite"].map((name) => ({
  name,
  message: DB_MESSAGE,
}));
const DB_PATTERNS = [{ group: ["@/lib/db", "@/lib/db/*", "drizzle-orm/*"], message: DB_MESSAGE }];
const CANVAS_PATHS = ["konva", "react-konva"].map((name) => ({
  name,
  message: `P-04: public renderer must not use canvas (${name}).`,
}));
const EDITOR_PATTERNS = [
  {
    group: ["@/features/editor", "@/features/editor/*"],
    message: "P-04: renderer must not depend on editor (canvas) modules.",
  },
];
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Guardrail #10 / NFR-SEC-001: no eval-able code paths anywhere.
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // P-04 / AC-11: the public runtime and renderer must be DOM/HTML only.
    // Konva/canvas is an editor-only interaction surface.
    files: ["src/features/renderer/**", "src/app/(public)/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [...CANVAS_PATHS, ...DB_PATHS], patterns: [...EDITOR_PATTERNS, ...DB_PATTERNS] },
      ],
    },
  },
  {
    // Fase 1: UI/route code never queries the DB; it goes through feature services.
    files: ["src/app/**", "src/features/*/components/**"],
    ignores: ["src/features/renderer/**", "src/app/(public)/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: DB_PATHS, patterns: DB_PATTERNS }],
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
