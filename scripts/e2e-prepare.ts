/**
 * Resets the e2e database (.data/e2e), applies real migrations, seeds the dev
 * workspace and a SECOND isolated workspace/template (for cross-workspace checks).
 * Writes ids to .data/e2e-fixtures.json for Playwright.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { hashPassword } from "../src/lib/auth/password";
import { insertTemplate } from "../src/lib/db/repositories/templates";
import { insertUser } from "../src/lib/db/repositories/users";
import { createWorkspaceWithOwner } from "../src/lib/db/repositories/workspaces";
import { seedDev } from "../src/lib/db/seed";
import { createEmptyDocument } from "../src/lib/schema/document";
import { connectFromEnv } from "./lib/connect";

const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "e2e-password-123";

async function main(): Promise<void> {
  rmSync(".data/e2e", { recursive: true, force: true });
  rmSync(".data/e2e-uploads", { recursive: true, force: true });
  mkdirSync(".data", { recursive: true });
  process.env.DATABASE_URL ??= "pglite://./.data/e2e";
  const conn = connectFromEnv();
  try {
    await conn.migrate();
    const seeded = await seedDev(conn.db, { password: E2E_PASSWORD });

    const other = await insertUser(conn.db, {
      email: "other@example.test",
      name: "Other Owner",
      passwordHash: await hashPassword(E2E_PASSWORD),
    });
    const otherWs = await createWorkspaceWithOwner(conn.db, {
      name: "Other Workspace",
      slug: "other-workspace",
      ownerUserId: other.id,
    });
    const foreign = await insertTemplate(conn.db, {
      workspaceId: otherWs.id,
      name: "Foreign Secret Template",
      draftDocument: createEmptyDocument(),
      createdBy: other.id,
    });
    writeFileSync(
      ".data/e2e-fixtures.json",
      JSON.stringify({ foreignTemplateId: foreign.id, devTemplateId: seeded.templateId }),
    );
    console.log("e2e database ready");
  } finally {
    await conn.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
