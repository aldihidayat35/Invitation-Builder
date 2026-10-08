import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  throw new Error("Backup hanya mendukung DATABASE_URL PostgreSQL production/staging.");
}

const outputRoot = resolve(process.env.BACKUP_OUTPUT_DIR ?? join(process.cwd(), "backups"));
mkdirSync(outputRoot, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dumpPath = join(outputRoot, `undangan-${stamp}.dump`);
const result = spawnSync(
  process.env.PG_DUMP_BIN ?? "pg_dump",
  ["--format=custom", "--no-owner", "--dbname", databaseUrl, "--file", dumpPath],
  { stdio: "inherit", shell: false },
);
if (result.status !== 0 || !existsSync(dumpPath)) {
  throw new Error(`pg_dump gagal dengan exit code ${result.status ?? "unknown"}.`);
}
const checksum = createHash("sha256").update(readFileSync(dumpPath)).digest("hex");
const manifest = {
  createdAt: new Date().toISOString(),
  file: dumpPath,
  sha256: checksum,
  format: "postgres-custom",
};
writeFileSync(`${dumpPath}.json`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, ...manifest }));
