import { and, desc, eq, ne, sql } from "drizzle-orm";
import { templates, templateVersions, type TemplateRow, type TemplateVersionRow } from "../schema";
import type { Database } from "../types";

/**
 * Template persistence. Workspace-scoped lookups are the default; the unscoped
 * `findTemplateById*` exist ONLY so the service can resolve the owning workspace
 * and then authorize membership. Never expose them to UI code.
 */
export async function insertTemplate(
  db: Database,
  input: { workspaceId: string; name: string; draftDocument: unknown; createdBy?: string },
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
