// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { seedDev } from "@/lib/db/seed";
import {
  listTemplateCategories,
  insertTemplateCategory,
  updateTemplateCategory,
  deleteTemplateCategory,
} from "@/lib/db/repositories/template-categories";
import { createTemplate, deleteTemplate, publishTemplate, TemplateInUseError } from "@/features/templates/service";
import { insertInvitation } from "@/lib/db/repositories/invitations";

type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
let conn: Conn;
let seed: Awaited<ReturnType<typeof seedDev>>;

beforeAll(async () => {
  conn = await createMigratedDb();
  seed = await seedDev(conn.db);
});

afterAll(async () => {
  await conn.close();
});

describe("Dynamic Template Categories CRUD", () => {
  it("lists seeded categories and allows inserting, updating, and deleting categories", async () => {
    const initial = await listTemplateCategories(conn.db);
    expect(initial.length).toBeGreaterThanOrEqual(5);

    // 1. Insert new category
    const created = await insertTemplateCategory(conn.db, {
      name: "Acara Syukuran",
      slug: "syukuran-test",
      description: "Untuk syukuran dan selamatan",
      sortOrder: 10,
    });
    expect(created.name).toBe("Acara Syukuran");
    expect(created.slug).toBe("syukuran-test");

    // 2. Update category
    const updated = await updateTemplateCategory(conn.db, created.id, {
      name: "Acara Syukuran Akbar",
      sortOrder: 11,
    });
    expect(updated.name).toBe("Acara Syukuran Akbar");
    expect(updated.sortOrder).toBe(11);

    // 3. Delete category
    const deleted = await deleteTemplateCategory(conn.db, created.id);
    expect(deleted.id).toBe(created.id);

    const listAfter = await listTemplateCategories(conn.db);
    expect(listAfter.find((c) => c.id === created.id)).toBeUndefined();
  });
});

describe("Hard Delete Template Feature", () => {
  it("permanently deletes an unused template and its versions", async () => {
    const actor = { userId: seed.userId };

    // Create a new template to test deletion
    const created = await createTemplate(conn.db, actor, {
      workspaceId: seed.workspaceId,
      name: "Template For Deletion Test",
    });

    const result = await deleteTemplate(conn.db, actor, created.id);
    expect(result.success).toBe(true);
    expect(result.templateName).toBe("Template For Deletion Test");
  });

  it("blocks hard deleting a template if an invitation is actively using it", async () => {
    const actor = { userId: seed.userId };

    const tpl = await createTemplate(conn.db, actor, {
      workspaceId: seed.workspaceId,
      name: "Template In Use Test",
    });

    // Publish a version
    const published = await publishTemplate(conn.db, actor, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    // Create an invitation using this template version
    await insertInvitation(conn.db, {
      workspaceId: seed.workspaceId,
      templateVersionId: published.id,
      slug: "undangan-in-use-test",
      title: "Pernikahan Budi & Ani",
      data: {},
      createdBy: seed.userId,
    });

    // Attempting to delete should throw TemplateInUseError
    await expect(deleteTemplate(conn.db, actor, tpl.id)).rejects.toThrowError(
      TemplateInUseError,
    );
  });
});
