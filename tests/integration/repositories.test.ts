// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { createEmptyDocument, migrateDocument } from "@/lib/schema";
import { DEV_TEMPLATE_NAME, seedDev, type SeedResult } from "@/lib/db/seed";
import { findTemplate, listTemplates } from "@/lib/db/repositories/templates";
import { createWorkspaceWithOwner, getMemberRole } from "@/lib/db/repositories/workspaces";
import { insertUser } from "@/lib/db/repositories/users";
import { generateGuestTokenId } from "@/lib/db/guest-token";

type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
let conn: Conn;
let seed: SeedResult;

beforeAll(async () => {
  conn = await createMigratedDb();
  seed = await seedDev(conn.db);
});
afterAll(async () => {
  await conn.close();
});

describe("seed", () => {
  it("creates dev user, workspace owner and an empty template; is idempotent", async () => {
    const again = await seedDev(conn.db);
    expect(again).toEqual(seed);
    expect(await getMemberRole(conn.db, seed.workspaceId, seed.userId)).toBe("owner");
    const templates = await listTemplates(conn.db, seed.workspaceId);
    expect(templates).toHaveLength(1);
    expect(templates[0]?.name).toBe(DEV_TEMPLATE_NAME);
    const row = await findTemplate(conn.db, seed.workspaceId, seed.templateId);
    expect(migrateDocument(row?.draftDocument)).toEqual(createEmptyDocument());
  });
});

describe("repositories", () => {
  it("scopes templates by workspace", async () => {
    const other = await insertUser(conn.db, { email: "other@example.test", name: "Other" });
    const ws = await createWorkspaceWithOwner(conn.db, {
      name: "Other",
      slug: "other-ws",
      ownerUserId: other.id,
    });
    expect(await findTemplate(conn.db, ws.id, seed.templateId)).toBeUndefined();
    expect(await getMemberRole(conn.db, ws.id, seed.userId)).toBeUndefined();
  });

  it("generates unique opaque guest token ids", () => {
    const ids = new Set(Array.from({ length: 200 }, generateGuestTokenId));
    expect(ids.size).toBe(200);
    expect([...ids][0]).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});
