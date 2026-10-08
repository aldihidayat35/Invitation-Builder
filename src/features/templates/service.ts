/**
 * Template library service (server-only): authorization, lifecycle, optimistic
 * concurrency, immutable versions and audit (FR-TPL-001..003, FR-AUD-001, P-06).
 *
 * Authorization policy:
 * - Operations that name a workspace (list/create): non-member -> ForbiddenError.
 * - Operations by template id: non-member -> TemplateNotFoundError (existence is
 *   not leaked across workspaces); member with insufficient role -> ForbiddenError.
 * - Template versions are insert-only here; no update/delete API exists, and DB
 *   triggers enforce the same (defense in depth).
 */
import "server-only";
import {
  requireCapability,
  findRole,
  roleCan,
  type Actor,
  type Capability,
} from "@/lib/auth/authorization";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  archiveTemplateRow,
  findTemplateById,
  findTemplateVersion,
  insertTemplate,
  insertTemplateVersion,
  listTemplateVersions,
  listTemplates as listTemplateRows,
  markTemplatePublished,
  nextVersionNo,
  renameTemplateRow,
  updateTemplateDraft,
} from "@/lib/db/repositories/templates";
import type { TemplateRow } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import {
  LATEST_SCHEMA_VERSION,
  canonicalDocumentSchema,
  createEmptyDocument,
  describeIssues,
  migrateDocument,
  parseDocumentOrThrow,
  validateDocumentSemantics,
  type SemanticIssue,
  type WidgetCatalog,
} from "@/lib/schema";
import { defaultWidgetRegistry } from "@/features/widgets";
import { templateNameSchema, uuidSchema } from "./schemas";
import type {
  PublishedVersion,
  TemplateDetail,
  TemplateLifecycle,
  TemplateSummary,
  ValidationReport,
} from "./types";

export class TemplateNotFoundError extends Error {
  constructor(templateId: string) {
    super(`Template ${templateId} tidak ditemukan.`);
    this.name = "TemplateNotFoundError";
  }
}

export class RevisionConflictError extends Error {
  constructor(templateId: string, expectedRevision: number) {
    super(
      `Template ${templateId} sudah diubah oleh pihak lain (revisi yang diharapkan ${expectedRevision}).`,
    );
    this.name = "RevisionConflictError";
  }
}

export class TemplateArchivedError extends Error {
  constructor() {
    super("Template yang diarsipkan tidak dapat diubah.");
    this.name = "TemplateArchivedError";
  }
}

export class PublishBlockedError extends Error {
  readonly semanticIssues: readonly SemanticIssue[];
  constructor(semanticIssues: readonly SemanticIssue[]) {
    super(`Publish diblokir: ${semanticIssues.length} masalah validasi semantik.`);
    this.name = "PublishBlockedError";
    this.semanticIssues = semanticIssues;
  }
}

export class NothingToPublishError extends Error {
  constructor() {
    super("Tidak ada perubahan sejak publish terakhir.");
    this.name = "NothingToPublishError";
  }
}

export class TemplateInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateInputError";
  }
}

export interface TemplateServiceDeps {
  /** Widget catalog used for semantic validation; defaults to the global registry. */
  widgets?: WidgetCatalog;
}

/* ------------------------------------------------------------------ helpers */

function lifecycleOf(row: TemplateRow): TemplateLifecycle {
  if (row.status === "archived") return "archived";
  if (row.publishedRevision === null) return "draft";
  return row.revision > row.publishedRevision ? "published-with-changes" : "published";
}

function toSummary(row: TemplateRow): TemplateSummary {
  const lifecycle = lifecycleOf(row);
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    status: row.status,
    lifecycle,
    revision: row.revision,
    publishedVersionNo: row.publishedVersionNo,
    hasUnpublishedChanges: lifecycle === "published-with-changes",
    updatedAt: row.updatedAt,
    slug: row.slug,
    description: row.description,
    category: (row.category || "wedding") as any,
    style: (row.style || "modern_minimalist") as any,
    thumbnailUrl: row.thumbnailUrl,
    previewMockupUrl: row.previewMockupUrl,
    tier: (row.tier || "standard") as any,
    price: row.price ?? 0,
    isPublic: row.isPublic ?? false,
    isFeatured: row.isFeatured ?? false,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    metadata: (row.metadata as any) || {},
    viewCount: row.viewCount ?? 0,
    useCount: row.useCount ?? 0,
  };
}

function parseName(name: string): string {
  const parsed = templateNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new TemplateInputError(parsed.error.issues[0]?.message ?? "Nama template tidak valid.");
  }
  return parsed.data;
}

/** Loads a template by id and authorizes the actor; hides existence from non-members. */
async function loadAuthorized(
  db: Database,
  actor: Actor,
  templateId: string,
  capability: Capability,
  options: { lock?: boolean } = {},
): Promise<TemplateRow> {
  if (!uuidSchema.safeParse(templateId).success) throw new TemplateNotFoundError(templateId);
  const row = await findTemplateById(db, templateId, options);
  if (!row) throw new TemplateNotFoundError(templateId);
  const role = await findRole(db, actor, row.workspaceId);
  if (!role) throw new TemplateNotFoundError(templateId);
  await requireCapability(db, actor, row.workspaceId, capability);
  return row;
}

function assertWritable(row: TemplateRow): void {
  if (row.status === "archived") throw new TemplateArchivedError();
}

/* -------------------------------------------------------------- validation */

/** Schema (Zod) + semantic (bindings/widgets) validation of an arbitrary payload. */
export function validateDocumentPayload(
  input: unknown,
  deps: TemplateServiceDeps = {},
): ValidationReport {
  const parsed = canonicalDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, schemaIssues: describeIssues(input, parsed.error), semanticIssues: [] };
  }
  const semanticIssues = validateDocumentSemantics(parsed.data, {
    widgets: deps.widgets ?? defaultWidgetRegistry,
  });
  return { valid: semanticIssues.length === 0, schemaIssues: [], semanticIssues };
}

/** Validates the stored draft (or a supplied unsaved document) for a template. */
export async function validateTemplate(
  db: Database,
  actor: Actor,
  templateId: string,
  document?: unknown,
  deps: TemplateServiceDeps = {},
): Promise<ValidationReport> {
  const row = await loadAuthorized(db, actor, templateId, "template:read");
  return validateDocumentPayload(document === undefined ? row.draftDocument : document, deps);
}

/* ---------------------------------------------------------------- library */

export async function listTemplates(
  db: Database,
  actor: Actor,
  workspaceId: string,
  options: { archived?: boolean } = {},
): Promise<TemplateSummary[]> {
  await requireCapability(db, actor, workspaceId, "template:read");
  return (await listTemplateRows(db, workspaceId, options)).map(toSummary);
}

export async function createTemplate(
  db: Database,
  actor: Actor,
  input: { workspaceId: string; name: string; document?: unknown },
): Promise<TemplateSummary> {
  await requireCapability(db, actor, input.workspaceId, "template:write");
  const name = parseName(input.name);
  const document = parseDocumentOrThrow(input.document ?? createEmptyDocument());
  return db.transaction(async (tx) => {
    const row = await insertTemplate(tx, {
      workspaceId: input.workspaceId,
      name,
      draftDocument: document,
      createdBy: actor.userId,
    });
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "template.create",
      entityType: "template",
      entityId: row.id,
      metadata: { name },
    });
    return toSummary(row);
  });
}

export async function getTemplate(
  db: Database,
  actor: Actor,
  templateId: string,
): Promise<TemplateDetail> {
  const row = await loadAuthorized(db, actor, templateId, "template:read");
  const versions = await listTemplateVersions(db, row.id);
  return {
    ...toSummary(row),
    document: migrateDocument(row.draftDocument),
    versions: versions.map(({ id, versionNo, schemaVersion, note, createdAt }) => ({
      id,
      versionNo,
      schemaVersion,
      note,
      createdAt,
    })),
  };
}

export async function renameTemplate(
  db: Database,
  actor: Actor,
  templateId: string,
  name: string,
): Promise<TemplateSummary> {
  const row = await loadAuthorized(db, actor, templateId, "template:write");
  assertWritable(row);
  const next = parseName(name);
  return db.transaction(async (tx) => {
    const updated = await renameTemplateRow(tx, row.id, next);
    if (!updated) throw new TemplateArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "template.rename",
      entityType: "template",
      entityId: row.id,
      metadata: { from: row.name, to: next },
    });
    return toSummary(updated);
  });
}

/** Copies the current DRAFT into a brand-new draft template (no version history). */
export async function duplicateTemplate(
  db: Database,
  actor: Actor,
  templateId: string,
): Promise<TemplateSummary> {
  const source = await loadAuthorized(db, actor, templateId, "template:write");
  await requireCapability(db, actor, source.workspaceId, "template:read");
  const document = migrateDocument(source.draftDocument);
  const copyName = parseName(`${source.name} (salinan)`.slice(0, 120));
  return db.transaction(async (tx) => {
    const row = await insertTemplate(tx, {
      workspaceId: source.workspaceId,
      name: copyName,
      draftDocument: document,
      createdBy: actor.userId,
    });
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "template.duplicate",
      entityType: "template",
      entityId: row.id,
      metadata: { sourceTemplateId: source.id },
    });
    return toSummary(row);
  });
}

export async function archiveTemplate(
  db: Database,
  actor: Actor,
  templateId: string,
): Promise<TemplateSummary> {
  const row = await loadAuthorized(db, actor, templateId, "template:archive");
  return db.transaction(async (tx) => {
    const updated = await archiveTemplateRow(tx, row.id);
    if (!updated) throw new TemplateArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "template.archive",
      entityType: "template",
      entityId: row.id,
      metadata: { name: row.name },
    });
    return toSummary(updated);
  });
}

/* ------------------------------------------------------------------ drafts */

/** Throws DocumentValidationError (with element paths) on an invalid payload. */
export async function saveDraft(
  db: Database,
  actor: Actor,
  input: { templateId: string; expectedRevision: number; document: unknown },
): Promise<TemplateSummary> {
  const row = await loadAuthorized(db, actor, input.templateId, "template:write");
  assertWritable(row);
  const document = parseDocumentOrThrow(input.document);
  const updated = await updateTemplateDraft(db, {
    workspaceId: row.workspaceId,
    templateId: row.id,
    expectedRevision: input.expectedRevision,
    draftDocument: document,
  });
  if (!updated) throw new RevisionConflictError(row.id, input.expectedRevision);
  return toSummary(updated);
}

/* -------------------------------------------------------------- publishing */

/**
 * Publishes the draft as a new immutable TemplateVersion (versionNo + 1).
 * `expectedRevision` makes sure the user publishes exactly what they saw. The
 * row is locked, so concurrent publishes serialize and versionNo never repeats.
 */
export async function publishTemplate(
  db: Database,
  actor: Actor,
  input: { templateId: string; expectedRevision: number; note?: string },
  deps: TemplateServiceDeps = {},
): Promise<PublishedVersion> {
  await loadAuthorized(db, actor, input.templateId, "template:publish");
  const note = input.note?.trim().slice(0, 500) || null;

  return db.transaction(async (tx) => {
    const row = await loadAuthorized(tx, actor, input.templateId, "template:publish", {
      lock: true,
    });
    assertWritable(row);
    if (row.revision !== input.expectedRevision) {
      throw new RevisionConflictError(row.id, input.expectedRevision);
    }

    if (row.publishedRevision === row.revision) throw new NothingToPublishError();

    const document = parseDocumentOrThrow(migrateDocument(row.draftDocument));
    const semanticIssues = validateDocumentSemantics(document, {
      widgets: deps.widgets ?? defaultWidgetRegistry,
    });
    if (semanticIssues.length > 0) throw new PublishBlockedError(semanticIssues);

    const versionNo = await nextVersionNo(tx, row.id);
    const version = await insertTemplateVersion(tx, {
      templateId: row.id,
      versionNo,
      schemaVersion: LATEST_SCHEMA_VERSION,
      document,
      note,
      createdBy: actor.userId,
    });
    await markTemplatePublished(tx, { templateId: row.id, versionNo, revision: row.revision });
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "template.publish",
      entityType: "template",
      entityId: row.id,
      metadata: { versionNo, versionId: version.id, revision: row.revision },
    });
    return {
      id: version.id,
      templateId: row.id,
      versionNo,
      schemaVersion: version.schemaVersion,
      note,
      createdAt: version.createdAt,
      document,
    };
  });
}

/** Reads an immutable version (older versions stay readable; FR-TPL-003). */
export async function getTemplateVersion(
  db: Database,
  actor: Actor,
  templateId: string,
  versionNo: number,
): Promise<PublishedVersion> {
  const row = await loadAuthorized(db, actor, templateId, "template:read");
  const version = await findTemplateVersion(db, row.id, versionNo);
  if (!version) throw new TemplateNotFoundError(`${templateId}@v${versionNo}`);
  return {
    id: version.id,
    templateId: row.id,
    versionNo: version.versionNo,
    schemaVersion: version.schemaVersion,
    note: version.note,
    createdAt: version.createdAt,
    document: migrateDocument(version.document),
  };
}

/** UI helper: which actions the actor's role allows in a workspace. */
export async function templatePermissions(
  db: Database,
  actor: Actor,
  workspaceId: string,
): Promise<{ write: boolean; publish: boolean; archive: boolean }> {
  if (actor.systemRole === "reseller") {
    return { write: false, publish: false, archive: false };
  }
  const role = await findRole(db, actor, workspaceId);
  return {
    write: role ? roleCan(role, "template:write") : false,
    publish: role ? roleCan(role, "template:publish") : false,
    archive: role ? roleCan(role, "template:archive") : false,
  };
}
