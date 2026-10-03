// One-off/repeatable: regenerate docs/PRD_BASELINE.md verbatim from the PRD source.
// Usage: node scripts/sync-prd-baseline.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "PRD_Digital_Invitation_Builder_v1.0.md";
const TARGET = "docs/PRD_BASELINE.md";

const prd = readFileSync(SOURCE, "utf8")
  .replace(/^\uFEFF/, "")
  .replace(/\r\n/g, "\n");
const sha256 = createHash("sha256").update(prd, "utf8").digest("hex");

const header = `<!--
  PRD BASELINE (verbatim copy). DO NOT EDIT BY HAND.
  Source : ${SOURCE}
  SHA-256: ${sha256}
  Regenerate: node scripts/sync-prd-baseline.mjs
  Isi dan requirement ID tidak boleh diubah tanpa Change Request resmi (PRD §25.2).
-->

`;

writeFileSync(TARGET, header + prd, "utf8");
console.log(`Wrote ${TARGET} (sha256 ${sha256})`);
