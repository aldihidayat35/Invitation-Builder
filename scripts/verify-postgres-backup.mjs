import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const input = process.argv[2];
if (!input) throw new Error("Gunakan: npm run backup:verify -- <path-file.dump>");
const dumpPath = resolve(input);
if (!existsSync(dumpPath)) throw new Error(`Backup tidak ditemukan: ${dumpPath}`);

const manifestPath = `${dumpPath}.json`;
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const actual = createHash("sha256").update(readFileSync(dumpPath)).digest("hex");
  if (manifest.sha256 !== actual) throw new Error("Checksum backup tidak cocok.");
}
const result = spawnSync(process.env.PG_RESTORE_BIN ?? "pg_restore", ["--list", dumpPath], {
  stdio: "inherit",
  shell: false,
});
if (result.status !== 0) throw new Error("Arsip tidak dapat dibaca oleh pg_restore.");
console.log(JSON.stringify({ ok: true, file: dumpPath, archiveReadable: true }));
