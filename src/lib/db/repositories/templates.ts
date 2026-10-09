import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import {
  customerOrders,
  invitations,
  templates,
  templateVersions,
  type TemplateRow,
  type TemplateVersionRow,
} from "../schema";
import type { Database } from "../types";

/**
 * Template persistence. Workspace-scoped lookups are the default; the unscoped
 * `findTemplateById*` exist ONLY so the service can resolve the owning workspace
 * and then authorize membership. Never expose them to UI code.
 */
export async function insertTemplate(
  db: Database,
  input: typeof templates.$inferInsert,
): Promise<TemplateRow> {
  const [row] = await db.insert(templates).values(input).returning();
  if (!row) throw new Error("insertTemplate returned no row");
  return row;
}

export async function findTemplate(
  db: Database,
  workspaceId: string,
  templateId: string,
): Promise<TemplateRow | undefined> {
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.workspaceId, workspaceId), eq(templates.id, templateId)))
    .limit(1);
  return row;
}

export async function findTemplateById(
  db: Database,
  templateId: string,
  options: { lock?: boolean } = {},
): Promise<TemplateRow | undefined> {
  const query = db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
  const [row] = await (options.lock ? query.for("update") : query);
  return row;
}

export async function findTemplateBySlug(
  db: Database,
  slug: string,
): Promise<TemplateRow | undefined> {
  const cleanSlug = slug.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.slug, cleanSlug), ne(templates.status, "archived")))
    .limit(1);
  return row;
}

export async function listTemplates(
  db: Database,
  workspaceId: string,
  options: { archived?: boolean } = {},
): Promise<TemplateRow[]> {
  const statusFilter = options.archived
    ? eq(templates.status, "archived")
    : ne(templates.status, "archived");
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.workspaceId, workspaceId), statusFilter))
    .orderBy(desc(templates.updatedAt));
}

export async function listAllTemplates(
  db: Database,
  options: { archived?: boolean } = {},
): Promise<TemplateRow[]> {
  const statusFilter = options.archived
    ? eq(templates.status, "archived")
    : ne(templates.status, "archived");
  return db
    .select()
    .from(templates)
    .where(statusFilter)
    .orderBy(desc(templates.updatedAt));
}

export async function findTemplateByName(
  db: Database,
  workspaceId: string,
  name: string,
): Promise<TemplateRow | undefined> {
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.workspaceId, workspaceId), eq(templates.name, name)))
    .limit(1);
  return row;
}

/**
 * Optimistic-concurrency draft save. Returns the updated row, or `undefined`
 * when `expectedRevision` is stale (or the template is not in the workspace).
 * Archived templates are never writable.
 */
export async function updateTemplateDraft(
  db: Database,
  input: {
    workspaceId: string;
    templateId: string;
    expectedRevision: number;
    draftDocument: unknown;
  },
): Promise<TemplateRow | undefined> {
  const [row] = await db
    .update(templates)
    .set({ draftDocument: input.draftDocument, revision: input.expectedRevision + 1 })
    .where(
      and(
        eq(templates.workspaceId, input.workspaceId),
        eq(templates.id, input.templateId),
        eq(templates.revision, input.expectedRevision),
        ne(templates.status, "archived"),
      ),
    )
    .returning();
  return row;
}

/** Rename does not bump the draft revision (it never conflicts with document edits). */
export async function renameTemplateRow(
  db: Database,
  templateId: string,
  name: string,
): Promise<TemplateRow | undefined> {
  const [row] = await db
    .update(templates)
    .set({ name })
    .where(and(eq(templates.id, templateId), ne(templates.status, "archived")))
    .returning();
  return row;
}

export async function archiveTemplateRow(
  db: Database,
  templateId: string,
): Promise<TemplateRow | undefined> {
  const [row] = await db
    .update(templates)
    .set({ status: "archived" })
    .where(and(eq(templates.id, templateId), ne(templates.status, "archived")))
    .returning();
  return row;
}

export async function markTemplatePublished(
  db: Database,
  input: { templateId: string; versionNo: number; revision: number },
): Promise<TemplateRow> {
  const [row] = await db
    .update(templates)
    .set({
      status: "published",
      publishedVersionNo: input.versionNo,
      publishedRevision: input.revision,
    })
    .where(eq(templates.id, input.templateId))
    .returning();
  if (!row) throw new Error("markTemplatePublished matched no row");
  return row;
}

/* ---- Versions (insert + read only; there is intentionally no update/delete) ---- */

export async function nextVersionNo(db: Database, templateId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${templateVersions.versionNo})` })
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId));
  return (row?.max ?? 0) + 1;
}

export async function insertTemplateVersion(
  db: Database,
  input: {
    templateId: string;
    versionNo: number;
    schemaVersion: number;
    document: unknown;
    note?: string | null;
    createdBy?: string;
  },
): Promise<TemplateVersionRow> {
  const [row] = await db.insert(templateVersions).values(input).returning();
  if (!row) throw new Error("insertTemplateVersion returned no row");
  return row;
}

export type TemplateVersionSummary = Omit<TemplateVersionRow, "document">;

export async function listTemplateVersions(
  db: Database,
  templateId: string,
): Promise<TemplateVersionSummary[]> {
  return db
    .select({
      id: templateVersions.id,
      templateId: templateVersions.templateId,
      versionNo: templateVersions.versionNo,
      schemaVersion: templateVersions.schemaVersion,
      note: templateVersions.note,
      createdBy: templateVersions.createdBy,
      createdAt: templateVersions.createdAt,
    })
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId))
    .orderBy(desc(templateVersions.versionNo));
}

export async function findTemplateVersion(
  db: Database,
  templateId: string,
  versionNo: number,
): Promise<TemplateVersionRow | undefined> {
  const [row] = await db
    .select()
    .from(templateVersions)
    .where(
      and(eq(templateVersions.templateId, templateId), eq(templateVersions.versionNo, versionNo)),
    )
    .limit(1);
  return row;
}

export async function findTemplateVersionById(
  db: Database,
  versionId: string,
): Promise<TemplateVersionRow | undefined> {
  const [row] = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.id, versionId))
    .limit(1);
  return row;
}

/** Lists active templates available in the public catalog for customer order selection. */
export async function listPublicTemplates(db: Database): Promise<TemplateRow[]> {
  return db
    .select()
    .from(templates)
    .where(
      and(
        eq(templates.status, "published"),
        eq(templates.isPublic, true),
        isNotNull(templates.publishedVersionNo),
      ),
    )
    .orderBy(desc(templates.createdAt))
    .limit(50);
}

export async function isTemplateUsedByInvitations(
  db: Database,
  templateId: string,
): Promise<{ inUse: boolean; invitationTitle?: string }> {
  const [row] = await db
    .select({ id: invitations.id, title: invitations.title })
    .from(invitations)
    .innerJoin(templateVersions, eq(invitations.templateVersionId, templateVersions.id))
    .where(eq(templateVersions.templateId, templateId))
    .limit(1);

  if (row) {
    return { inUse: true, invitationTitle: row.title };
  }
  return { inUse: false };
}

export async function deleteTemplateRow(
  db: Database,
  templateId: string,
): Promise<TemplateRow | undefined> {
  // Disconnect from any customer orders
  await db
    .update(customerOrders)
    .set({ templateId: null })
    .where(eq(customerOrders.templateId, templateId));

  // Delete versions
  await db.delete(templateVersions).where(eq(templateVersions.templateId, templateId));

  // Delete the template row
  const [deleted] = await db.delete(templates).where(eq(templates.id, templateId)).returning();

  return deleted;
}

/**
 * Resolves a template row for public live previews and demo links.
 * Checks exact slug, un-prefixed "demo-" slug, metadata demoInvitationSlug, UUID, and name.
 */
export async function findTemplateForDemo(
  db: Database,
  identifier: string,
): Promise<TemplateRow | undefined> {
  const clean = identifier.trim().toLowerCase();
  const unPrefixed = clean.replace(/^demo-/, "");

  // 1. Try exact slug match
  let row = await findTemplateBySlug(db, clean);
  if (row) return row;

  // 2. Try un-prefixed slug (e.g. "demo-royal-elegant" -> "royal-elegant")
  if (unPrefixed !== clean) {
    row = await findTemplateBySlug(db, unPrefixed);
    if (row) return row;
  }

  // 3. Try lookup by UUID or template-<uuid>
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    row = await findTemplateById(db, clean);
    if (row && row.status !== "archived") return row;
  }
  if (clean.startsWith("template-")) {
    const rawId = clean.slice(9);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
      row = await findTemplateById(db, rawId);
      if (row && row.status !== "archived") return row;
    }
  }

  // 4. Try matching metadata->>'demoInvitationSlug' or slugified name across all non-archived templates
  const allTemplates = await listAllTemplates(db);
  const matched = allTemplates.find((t) => {
    const meta = (t.metadata as Record<string, unknown> | null) || {};
    if (meta.demoInvitationSlug && typeof meta.demoInvitationSlug === "string") {
      const demoSlug = meta.demoInvitationSlug.trim().toLowerCase();
      if (demoSlug === clean || demoSlug === unPrefixed) return true;
    }
    const slugifiedName = t.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (slugifiedName === clean || slugifiedName === unPrefixed) return true;
    return false;
  });

  return matched;
}

