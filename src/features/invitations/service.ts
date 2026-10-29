/**
 * Invitation service (server-only): create from a published TemplateVersion,
 * Data Mode autosave, readiness validation, guests and preview model
 * (FR-INV-001..003, FR-GST-002..003, FR-PRV-001, AC-02, AC-03, AC-06).
 *
 * Rules:
 * - Invitations pin an immutable TemplateVersion; client data lives ONLY in
 *   `invitations.data`. No function here writes to templates/template_versions
 *   (P-02), so editing invitation data can never change a template.
 * - Authorization mirrors templates: by-id lookups hide existence from
 *   non-members (NotFound) and require `invitation:read|write` otherwise.
 * - `guest.name` comes only from the guest context, never from invitation data.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import {
  findRole,
  requireCapability,
  roleCan,
  type Actor,
  type Capability,
} from "@/lib/auth/authorization";
import { ForbiddenError } from "@/lib/auth/errors";
import { generateGuestTokenId } from "@/lib/db/guest-token";
import { and, eq, ilike, ne } from "drizzle-orm";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  archiveGuestRow,
  archiveInvitationRow,
  deleteInvitationRow,
  findGuest,
  findGuestByToken,
  findInvitationById,
  findInvitationBySlug,
  findSnapshotById,
  findSnapshotByRevision,
  findTemplateVersionWithWorkspace,
  hasPublishedSnapshots,
  insertGuest,
  insertInvitation,
  insertPublishedSnapshot,
  listGuests as listGuestRows,
  listInvitations as listInvitationRows,
  listSnapshotSummaries,
  nextRevisionNo,
  regenerateInvitationClientToken as repoRegenerateInvitationClientToken,
  restoreInvitationRow,
  setActiveSnapshot,
  updateGuestRow,
  updateInvitationData,
  updateInvitationExpiry,
  updateInvitationTitle,
} from "@/lib/db/repositories/invitations";
import {
  calculateExpiryDate,
  isInvitationExpiredOrClosed,
  type ExpiryDuration,
} from "./expiry";
import { findCustomerOrderByInvitationId } from "@/lib/db/repositories/orders";
import {
  findTemplateById,
  findTemplateVersion,
  findTemplateVersionById,
} from "@/lib/db/repositories/templates";
import {
  guests,
  templates,
  templateVersions,
  type GuestRow,
  type InvitationRow,
} from "@/lib/db/schema";
import { assetUrl } from "@/features/assets/urls";
import type { Database } from "@/lib/db/types";
import {
  applyDefaults,
  createVariableRegistry,
  parseFormSubmission,
  resolveDocument,
  validateInvitationData,
  isGiftAccountVariableKey,
  BANK_VERIFICATION_KEY,
  type DataIssue,
  type GuestData,
  type ResolvedDocument,
} from "@/lib/engine";
import { migrateDocument, parseDocumentOrThrow, type CanonicalDocument } from "@/lib/schema";
import {
  guestNameSchema,
  invitationTitleSchema,
  maxPartySchema,
  slugifyTitle,
  uuidSchema,
} from "./schemas";
import type {
  GuestSummary,
  InvitationDetail,
  InvitationSummary,
  PublicInvitationModel,
  ReadinessReport,
  SaveDataResult,
  SnapshotSummary,
} from "./types";

export class PublishBlockedError extends Error {
  constructor(readonly missing: readonly string[]) {
    super(
      `Undangan belum bisa dipublish. Lengkapi data: ${missing.slice(0, 5).join(", ")}${
        missing.length > 5 ? ", ..." : ""
      }.`,
    );
    this.name = "PublishBlockedError";
  }
}

export class RevisionNotFoundError extends Error {
  constructor(revisionNo: number) {
    super(`Revisi ${revisionNo} tidak ditemukan.`);
    this.name = "RevisionNotFoundError";
  }
}

export class InvitationNotFoundError extends Error {
  constructor(id: string) {
    super(`Undangan ${id} tidak ditemukan.`);
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationInputError";
  }
}

export class InvitationArchivedError extends Error {
  constructor() {
    super("Undangan yang diarsipkan tidak dapat diubah.");
    this.name = "InvitationArchivedError";
  }
}

export class TemplateNotPublishedError extends Error {
  constructor() {
    super("Template belum memiliki versi yang dipublish. Publish template terlebih dahulu.");
    this.name = "TemplateNotPublishedError";
  }
}

export class GuestNotFoundError extends Error {
  constructor(id: string) {
    super(`Tamu ${id} tidak ditemukan.`);
    this.name = "GuestNotFoundError";
  }
}

/** Prevents an approved preview from becoming stale through later content changes. */
export async function assertInvitationWorkflowMutable(
  db: Database,
  invitationId: string,
): Promise<void> {
  const order = await findCustomerOrderByInvitationId(db, invitationId);
  if (order && ["client_review", "approved", "published"].includes(order.productionStatus)) {
    throw new InvitationInputError(
      "Data dikunci selama review atau setelah persetujuan klien. Minta revisi untuk membukanya kembali.",
    );
  }
}

/** Preview guest-context selection (FR-GST-003, AC-06). */
export type PreviewGuestSelection =
  | { readonly kind: "generic" }
  | { readonly kind: "sample" }
  | { readonly kind: "guest"; readonly guestId: string };

export const SAMPLE_GUEST_NAME = "Nama Tamu Contoh";

export interface PreviewModel {
  readonly invitation: InvitationSummary;
  readonly resolved: ResolvedDocument;
  readonly guest: GuestData;
  /** Display label of the chosen context (for the picker UI). */
  readonly guestLabel: string;
}

/* ------------------------------------------------------------------ helpers */

function toSummary(
  row: InvitationRow & {
    templateName?: string | null;
    thumbnailUrl?: string | null;
    previewMockupUrl?: string | null;
    category?: string | null;
  },
): InvitationSummary {
  const isClosed = isInvitationExpiredOrClosed(row);
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    slug: row.slug,
    status: row.status,
    templateVersionId: row.templateVersionId,
    clientAccessToken: row.clientAccessToken,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
    isManuallyClosed: row.isManuallyClosed,
    isClosed,
    updatedAt: row.updatedAt,
    templateName: row.templateName ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    previewMockupUrl: row.previewMockupUrl ?? null,
    category: row.category ?? null,
  };
}

function toGuestSummary(row: GuestRow): GuestSummary {
  return {
    id: row.id,
    invitationId: row.invitationId,
    name: row.name,
    tokenId: row.tokenId,
    maxParty: row.maxParty,
    status: row.status,
  };
}

function parseTitle(title: string): string {
  const parsed = invitationTitleSchema.safeParse(title);
  if (!parsed.success) {
    throw new InvitationInputError(parsed.error.issues[0]?.message ?? "Judul tidak valid.");
  }
  return parsed.data;
}

async function loadAuthorized(
  db: Database,
  actor: Actor,
  invitationId: string,
  capability: Capability,
): Promise<InvitationRow> {
  if (actor.systemRole === "reseller" && capability !== "invitation:read") {
    throw new ForbiddenError("Reseller/Seller tidak memiliki akses untuk mengubah data undangan.");
  }
  if (!uuidSchema.safeParse(invitationId).success) throw new InvitationNotFoundError(invitationId);
  const row = await findInvitationById(db, invitationId);
  if (!row) throw new InvitationNotFoundError(invitationId);
  const role = await findRole(db, actor, row.workspaceId);
  if (!role) throw new InvitationNotFoundError(invitationId);
  await requireCapability(db, actor, row.workspaceId, capability);
  return row;
}

function assertWritable(row: InvitationRow): void {
  if (row.status === "archived") throw new InvitationArchivedError();
}

async function loadPinnedDocument(
  db: Database,
  row: InvitationRow,
): Promise<{ document: CanonicalDocument; templateId: string; versionNo: number }> {
  const found = await findTemplateVersionWithWorkspace(db, row.templateVersionId);
  if (!found) throw new InvitationNotFoundError(row.id);
  return {
    document: parseDocumentOrThrow(migrateDocument(found.version.document)),
    templateId: found.version.templateId,
    versionNo: found.version.versionNo,
  };
}

function randomSlugSuffix(): string {
  return randomBytes(4).toString("hex");
}

/** Only values that satisfy their variable type are persisted (partial data is allowed). */
function persistableData(
  data: Readonly<Record<string, unknown>>,
  issues: readonly DataIssue[],
): Record<string, unknown> {
  const rejected = new Set(issues.filter((i) => i.code !== "missing_required").map((i) => i.key));
  return Object.fromEntries(Object.entries(data).filter(([key]) => !rejected.has(key)));
}

/* -------------------------------------------------------------- invitations */

/** UI helper: whether the actor may edit invitations/guests in a workspace. */
export async function invitationPermissions(
  db: Database,
  actor: Actor,
  workspaceId: string,
): Promise<{ write: boolean }> {
  if (actor.systemRole === "reseller") {
    return { write: false };
  }
  const role = await findRole(db, actor, workspaceId);
  return {
    write: !!role && actor.systemRole !== "reseller" && roleCan(role, "invitation:content_write"),
  };
}

export async function listInvitations(
  db: Database,
  actor: Actor,
  workspaceId: string,
  options: { archived?: boolean } = {},
): Promise<InvitationSummary[]> {
  await requireCapability(db, actor, workspaceId, "invitation:read");
  return (await listInvitationRows(db, workspaceId, options)).map(toSummary);
}

/**
 * Creates an invitation pinned to the template's latest PUBLISHED version
 * (FR-INV-001). The operator never needs Design Mode.
 */
export async function createInvitation(
  db: Database,
  actor: Actor,
  input: {
    workspaceId: string;
    templateId: string;
    templateVersionId?: string;
    title: string;
    clientAccessToken?: string;
  },
): Promise<InvitationSummary> {
  await requireCapability(db, actor, input.workspaceId, "invitation:project_manage");
  const title = parseTitle(input.title);

  if (!uuidSchema.safeParse(input.templateId).success) {
    throw new InvitationInputError("Template tidak valid.");
  }
  const template = await findTemplateById(db, input.templateId);
  if (!template || template.status === "archived") {
    throw new InvitationInputError("Template tidak ditemukan atau sudah diarsipkan.");
  }
  if (template.workspaceId === input.workspaceId) {
    await requireCapability(db, actor, input.workspaceId, "template:read");
  } else if (actor.systemRole !== "owner" || !template.isPublic) {
    // A published platform master may be pinned cross-workspace only by production owner.
    throw new InvitationInputError(
      "Template tidak ditemukan atau tidak tersedia untuk proyek ini.",
    );
  }
  if (template.publishedVersionNo === null) throw new TemplateNotPublishedError();
  const version = input.templateVersionId
    ? await findTemplateVersionById(db, input.templateVersionId)
    : await findTemplateVersion(db, template.id, template.publishedVersionNo);
  if (version && version.templateId !== template.id) {
    throw new InvitationInputError("Versi template tidak sesuai dengan master template.");
  }
  if (!version) throw new TemplateNotPublishedError();

  const document = parseDocumentOrThrow(migrateDocument(version.document));
  const initialData = applyDefaults(createVariableRegistry(document.variables), {});
  const base = slugifyTitle(title);

  return db.transaction(async (tx) => {
    let slug = `${base}-${randomSlugSuffix()}`;
    for (let attempt = 0; (await findInvitationBySlug(tx, slug)) && attempt < 5; attempt += 1) {
      slug = `${base}-${randomSlugSuffix()}`;
    }
    const row = await insertInvitation(tx, {
      workspaceId: input.workspaceId,
      templateVersionId: version.id,
      slug,
      title,
      data: { ...initialData },
      createdBy: actor.userId,
      clientAccessToken: input.clientAccessToken,
    });
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.create",
      entityType: "invitation",
      entityId: row.id,
      metadata: { templateId: template.id, versionNo: version.versionNo, slug },
    });
    return toSummary(row);
  });
}

export async function getInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<InvitationDetail> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:read");
  const pinned = await loadPinnedDocument(db, row);
  const template = await findTemplateById(db, pinned.templateId);
  return {
    ...toSummary({
      ...row,
      templateName: template?.name,
      thumbnailUrl: template?.thumbnailUrl,
      previewMockupUrl: template?.previewMockupUrl,
      category: template?.category,
    }),
    data: row.data,
    template: {
      templateId: pinned.templateId,
      name: template?.name ?? "(template dihapus)",
      versionNo: pinned.versionNo,
    },
    document: pinned.document,
  };
}

export async function renameInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
  title: string,
): Promise<InvitationSummary> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:project_manage");
  assertWritable(row);
  const next = parseTitle(title);
  return db.transaction(async (tx) => {
    const updated = await updateInvitationTitle(tx, row.id, next);
    if (!updated) throw new InvitationArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.rename",
      entityType: "invitation",
      entityId: row.id,
      metadata: { from: row.title, to: next },
    });
    return toSummary(updated);
  });
}

export async function archiveInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<InvitationSummary> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:project_manage");
  return db.transaction(async (tx) => {
    const updated = await archiveInvitationRow(tx, row.id);
    if (!updated) throw new InvitationArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.archive",
      entityType: "invitation",
      entityId: row.id,
      metadata: { title: row.title },
    });
    return toSummary(updated);
  });
}

export async function restoreInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<InvitationSummary> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:project_manage");
  return db.transaction(async (tx) => {
    const updated = await restoreInvitationRow(tx, row.id);
    if (!updated) throw new InvitationNotFoundError(row.id);
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.restore",
      entityType: "invitation",
      entityId: row.id,
      metadata: { title: row.title },
    });
    return toSummary(updated);
  });
}

export async function deleteInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
  options?: { forcePermanent?: boolean },
): Promise<{ deleted: boolean; archived: boolean }> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:project_manage");
  const hasSnapshots = await hasPublishedSnapshots(db, row.id);

  if (options?.forcePermanent || row.status === "archived" || !hasSnapshots) {
    // Safe or requested to hard-delete (includes already archived invitations)
    return db.transaction(async (tx) => {
      await deleteInvitationRow(tx, row.id);
      await insertAuditLog(tx, {
        workspaceId: row.workspaceId,
        actorId: actor.userId,
        action: "invitation.delete",
        entityType: "invitation",
        entityId: row.id,
        metadata: { title: row.title, hardDeleted: true },
      });
      return { deleted: true, archived: false };
    });
  } else {
    // Immutable snapshots exist and not archived yet: soft-delete via archive
    await archiveInvitation(db, actor, invitationId);
    return { deleted: false, archived: true };
  }
}

export async function permanentDeleteInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<{ deleted: boolean }> {
  const res = await deleteInvitation(db, actor, invitationId, { forcePermanent: true });
  return { deleted: res.deleted };
}

/* ---------------------------------------------------------------- data mode */

/**
 * Autosave of Data Mode form values (FR-INV-002). Raw strings are coerced per
 * VariableDefinition; values that fail their type are NOT stored, while a
 * missing required field never blocks saving (it only blocks publishing).
 * Writes the invitation row only - the template is untouched (AC-03).
 */
export async function saveInvitationData(
  db: Database,
  actor: Actor,
  input: {
    invitationId: string;
    values: Readonly<Record<string, string | undefined>>;
    timeZone?: string;
  },
): Promise<SaveDataResult> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:content_write");
  assertWritable(row);
  await assertInvitationWorkflowMutable(db, row.id);
  const { document } = await loadPinnedDocument(db, row);
  const { data, issues } = parseFormSubmission(document.variables, input.values, {
    timeZone: input.timeZone ?? "Asia/Jakarta",
  });
  const stored = persistableData(data, issues);

  let finalStored = stored;
  // Keamanan: Jika aktor BUKAN super admin ("owner"), kunci seluruh variabel rekening
  if (actor.systemRole !== "owner") {
    const protectedStored: Record<string, unknown> = { ...stored };
    for (const key of Object.keys(stored)) {
      if (isGiftAccountVariableKey(key)) {
        if (key in row.data) {
          protectedStored[key] = row.data[key];
        } else {
          delete protectedStored[key];
        }
      }
    }
    if (BANK_VERIFICATION_KEY in row.data) {
      protectedStored[BANK_VERIFICATION_KEY] = row.data[BANK_VERIFICATION_KEY];
    }
    finalStored = protectedStored;
  }

  const updated = await updateInvitationData(db, { invitationId: row.id, data: finalStored });
  if (!updated) throw new InvitationArchivedError();
  return { invitation: toSummary(updated), issues };
}

export async function saveInvitationSections(
  db: Database,
  actor: Actor,
  input: {
    invitationId: string;
    disabledSections: string[];
  },
): Promise<InvitationSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:content_write");
  assertWritable(row);
  await assertInvitationWorkflowMutable(db, row.id);

  const disabledClean = Array.isArray(input.disabledSections)
    ? input.disabledSections.filter((id) => typeof id === "string" && id.trim().length > 0)
    : [];

  const updatedData: Record<string, unknown> = {
    ...row.data,
    "sections.disabled": disabledClean,
  };

  const updated = await updateInvitationData(db, {
    invitationId: row.id,
    data: updatedData,
  });
  if (!updated) throw new InvitationArchivedError();

  await insertAuditLog(db, {
    workspaceId: row.workspaceId,
    actorId: actor.userId,
    action: "invitation.sections_update",
    entityType: "invitation",
    entityId: row.id,
    metadata: { disabled: disabledClean },
  });

  return toSummary(updated);
}


/** Required-field validation used as the publish gate (groundwork for FR-INV-004 in F9). */
export async function getInvitationReadiness(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<ReadinessReport> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:read");
  const { document } = await loadPinnedDocument(db, row);
  const issues = validateInvitationData(
    createVariableRegistry(document.variables),
    row.data,
  ).filter((issue) => issue.code !== "unknown_key");
  return { ready: issues.length === 0, issues };
}

/* ------------------------------------------------------------------- guests */

export async function listInvitationGuests(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<GuestSummary[]> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:read");
  return (await listGuestRows(db, row.id)).map(toGuestSummary);
}

export async function addGuest(
  db: Database,
  actor: Actor,
  input: { invitationId: string; name: string; maxParty?: number },
): Promise<GuestSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:guest_manage");
  assertWritable(row);
  await assertInvitationWorkflowMutable(db, row.id);
  const name = guestNameSchema.safeParse(input.name);
  if (!name.success) {
    throw new InvitationInputError(name.error.issues[0]?.message ?? "Nama tamu tidak valid.");
  }
  const party = maxPartySchema.safeParse(input.maxParty ?? 1);
  if (!party.success) {
    throw new InvitationInputError(party.error.issues[0]?.message ?? "Jumlah tamu tidak valid.");
  }
  return db.transaction(async (tx) => {
    const guest = await insertGuest(tx, {
      invitationId: row.id,
      name: name.data,
      tokenId: generateGuestTokenId(),
      maxParty: party.data,
    });
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "guest.create",
      entityType: "guest",
      entityId: guest.id,
      metadata: { invitationId: row.id },
    });
    return toGuestSummary(guest);
  });
}

export async function updateGuest(
  db: Database,
  actor: Actor,
  input: { invitationId: string; guestId: string; name?: string; maxParty?: number },
): Promise<GuestSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:guest_manage");
  assertWritable(row);
  await assertInvitationWorkflowMutable(db, row.id);
  const changes: { name?: string; maxParty?: number } = {};
  if (input.name !== undefined) {
    const name = guestNameSchema.safeParse(input.name);
    if (!name.success) {
      throw new InvitationInputError(name.error.issues[0]?.message ?? "Nama tamu tidak valid.");
    }
    changes.name = name.data;
  }
  if (input.maxParty !== undefined) {
    const party = maxPartySchema.safeParse(input.maxParty);
    if (!party.success) {
      throw new InvitationInputError(party.error.issues[0]?.message ?? "Jumlah tamu tidak valid.");
    }
    changes.maxParty = party.data;
  }
  const updated = await updateGuestRow(db, {
    invitationId: row.id,
    guestId: input.guestId,
    ...changes,
  });
  if (!updated) throw new GuestNotFoundError(input.guestId);
  return toGuestSummary(updated);
}

/** Soft-removes a guest (archived guests keep their token reserved and disappear from lists). */
export async function archiveGuest(
  db: Database,
  actor: Actor,
  input: { invitationId: string; guestId: string },
): Promise<GuestSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:guest_manage");
  assertWritable(row);
  await assertInvitationWorkflowMutable(db, row.id);
  return db.transaction(async (tx) => {
    const archived = await archiveGuestRow(tx, row.id, input.guestId);
    if (!archived) throw new GuestNotFoundError(input.guestId);
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "guest.archive",
      entityType: "guest",
      entityId: archived.id,
      metadata: { invitationId: row.id },
    });
    return toGuestSummary(archived);
  });
}

/* ------------------------------------------------------------------ preview */

/**
 * Builds the resolved render model for preview. The same `resolveDocument`
 * + HTML renderer is used by the public runtime (P-04, FR-PRV-001), so
 * preview never renders a Konva screenshot. Guest context is explicit.
 */
export async function buildPreview(
  db: Database,
  actor: Actor,
  input: { invitationId: string; guest?: PreviewGuestSelection },
): Promise<PreviewModel> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:read");
  const { document } = await loadPinnedDocument(db, row);
  const selection = input.guest ?? { kind: "generic" };

  let guest: GuestData = {};
  let guestLabel = "Konteks umum (tanpa tamu)";
  if (selection.kind === "sample") {
    guest = { name: SAMPLE_GUEST_NAME };
    guestLabel = `Contoh: ${SAMPLE_GUEST_NAME}`;
  } else if (selection.kind === "guest") {
    const found = uuidSchema.safeParse(selection.guestId).success
      ? await findGuest(db, row.id, selection.guestId)
      : undefined;
    if (!found || found.status === "archived") throw new GuestNotFoundError(selection.guestId);
    guest = { name: found.name };
    guestLabel = `Tamu: ${found.name}`;
  }

  return {
    invitation: toSummary(row),
    resolved: resolveDocument(document, row.data, guest),
    guest,
    guestLabel,
  };
}

/* --------------------------------------------------------------- publishing */

/**
 * Publishes the CURRENT draft as a new immutable PublishedSnapshot and points
 * the live URL at it (FR-INV-004, FR-PUB-001..002, P-06). The snapshot freezes
 * the pinned template document + invitation data, so later draft edits never
 * change the live page until the next publish. Blocked while required data is
 * missing or invalid.
 */
export async function publishInvitation(
  db: Database,
  actor: Actor,
  invitationId: string,
  options?: {
    duration?: ExpiryDuration | string;
    expiresAt?: Date | null;
  },
): Promise<SnapshotSummary> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:publish");
  assertWritable(row);
  const { document } = await loadPinnedDocument(db, row);
  const issues = validateInvitationData(
    createVariableRegistry(document.variables),
    row.data,
  ).filter((issue) => issue.code !== "unknown_key");
  if (issues.length > 0) throw new PublishBlockedError(issues.map((issue) => issue.key));

  let calculatedExpiresAt: Date | null | undefined = undefined;
  if (options && "expiresAt" in options) {
    calculatedExpiresAt = options.expiresAt;
  } else if (options?.duration) {
    calculatedExpiresAt = calculateExpiryDate(new Date(), options.duration);
  } else if (!row.expiresAt) {
    // Default 6 bulan jika belum pernah diset
    calculatedExpiresAt = calculateExpiryDate(new Date(), "6_months");
  }

  return db.transaction(async (tx) => {
    const revisionNo = await nextRevisionNo(tx, row.id);
    const snapshot = await insertPublishedSnapshot(tx, {
      invitationId: row.id,
      revisionNo,
      schemaVersion: document.schemaVersion,
      document,
      data: { ...row.data },
      createdBy: actor.userId,
    });
    const updated = await setActiveSnapshot(tx, row.id, snapshot.id, {
      expiresAt: calculatedExpiresAt,
      publishedAt: row.publishedAt ?? new Date(),
    });
    if (!updated) throw new InvitationArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.publish",
      entityType: "invitation",
      entityId: row.id,
      metadata: { revisionNo, expiresAt: calculatedExpiresAt?.toISOString() ?? null },
    });
    return {
      revisionNo,
      schemaVersion: snapshot.schemaVersion,
      createdAt: snapshot.createdAt,
      active: true,
    };
  });
}

/** Extends the expiration date of an invitation. */
export async function extendInvitationExpiry(
  db: Database,
  actor: Actor,
  input: {
    invitationId: string;
    duration?: ExpiryDuration | string;
    customExpiresAt?: Date | null;
  },
): Promise<InvitationSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:project_manage");
  assertWritable(row);
  let newExpiresAt: Date | null | undefined = undefined;
  if (input.customExpiresAt !== undefined) {
    newExpiresAt = input.customExpiresAt;
  } else if (input.duration) {
    const baseDate =
      row.expiresAt && new Date(row.expiresAt) > new Date()
        ? new Date(row.expiresAt)
        : new Date();
    newExpiresAt = calculateExpiryDate(baseDate, input.duration);
  }
  const updated = await updateInvitationExpiry(db, row.id, {
    ...(newExpiresAt !== undefined && { expiresAt: newExpiresAt }),
    isManuallyClosed: false,
  });
  if (!updated) throw new InvitationArchivedError();
  await insertAuditLog(db, {
    workspaceId: row.workspaceId,
    actorId: actor.userId,
    action: "invitation.extend_expiry",
    entityType: "invitation",
    entityId: row.id,
    metadata: { expiresAt: newExpiresAt?.toISOString() ?? null },
  });
  return toSummary(updated);
}

/** Manually closes or reopens an invitation. */
export async function toggleInvitationClosure(
  db: Database,
  actor: Actor,
  input: {
    invitationId: string;
    isClosed: boolean;
  },
): Promise<InvitationSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:project_manage");
  assertWritable(row);
  const updated = await updateInvitationExpiry(db, row.id, {
    isManuallyClosed: input.isClosed,
  });
  if (!updated) throw new InvitationArchivedError();
  await insertAuditLog(db, {
    workspaceId: row.workspaceId,
    actorId: actor.userId,
    action: input.isClosed ? "invitation.close" : "invitation.reopen",
    entityType: "invitation",
    entityId: row.id,
    metadata: { isManuallyClosed: input.isClosed },
  });
  return toSummary(updated);
}

/** Re-points the live URL to an older snapshot without altering any snapshot (FR-PUB-003). */
export async function rollbackInvitation(
  db: Database,
  actor: Actor,
  input: { invitationId: string; revisionNo: number },
): Promise<SnapshotSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:rollback");
  assertWritable(row);
  const snapshot = Number.isInteger(input.revisionNo)
    ? await findSnapshotByRevision(db, row.id, input.revisionNo)
    : undefined;
  if (!snapshot) throw new RevisionNotFoundError(input.revisionNo);
  return db.transaction(async (tx) => {
    const updated = await setActiveSnapshot(tx, row.id, snapshot.id);
    if (!updated) throw new InvitationArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.rollback",
      entityType: "invitation",
      entityId: row.id,
      metadata: { revisionNo: snapshot.revisionNo, previous: row.activePublishedSnapshotId },
    });
    return {
      revisionNo: snapshot.revisionNo,
      schemaVersion: snapshot.schemaVersion,
      createdAt: snapshot.createdAt,
      active: true,
    };
  });
}

export async function listInvitationSnapshots(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<SnapshotSummary[]> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:read");
  const rows = await listSnapshotSummaries(db, row.id);
  return rows.map((snap) => ({
    revisionNo: snap.revisionNo,
    schemaVersion: snap.schemaVersion,
    createdAt: snap.createdAt,
    active: snap.id === row.activePublishedSnapshotId,
  }));
}

/**
 * Public, unauthenticated read model for `/i/[slug]` (FR-PUB-001). It reads
 * ONLY the active published snapshot - never `invitations.data` or the draft.
 * Returns `null` for unknown, unpublished or archived invitations. A guest
 * token is honored only for guests of THIS invitation; unknown/archived tokens
 * silently fall back to the generic context.
 */
export function formatGuestName(rawTokenOrName?: string): string | undefined {
  if (!rawTokenOrName || typeof rawTokenOrName !== "string") return undefined;
  const decoded = decodeURIComponent(rawTokenOrName).replace(/[-_+]/g, " ").trim();
  if (!decoded) return undefined;
  // Convert to Title Case
  return decoded
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function resolveGuestContext(
  db: Database,
  invitationId: string,
  input: { guestToken?: string; guestName?: string },
): Promise<{ guest: GuestData; guestName?: string; guestToken?: string }> {
  // 1. If explicit guestToken provided:
  if (input.guestToken) {
    const cleanToken = input.guestToken.trim();
    if (cleanToken) {
      const foundByToken = await findGuestByToken(db, cleanToken);
      if (foundByToken) {
        if (foundByToken.invitationId === invitationId && foundByToken.status !== "archived") {
          return {
            guest: { name: foundByToken.name },
            guestName: foundByToken.name,
            guestToken: foundByToken.tokenId,
          };
        }
        // Token exists but does not belong to this invitation or is archived
        return { guest: {} };
      }
    }
  }

  // 2. Resolve by candidate guest name (from input.guestName or if guestToken is not a token pattern)
  const candidateName =
    input.guestName?.trim() ||
    (!input.guestToken?.startsWith("g_") && input.guestToken !== "bogus"
      ? input.guestToken?.trim()
      : undefined);

  if (candidateName) {
    const formattedName = formatGuestName(candidateName);
    if (formattedName) {
      const [matchedGuest] = await db
        .select()
        .from(guests)
        .where(
          and(
            eq(guests.invitationId, invitationId),
            ne(guests.status, "archived"),
            ilike(guests.name, formattedName),
          ),
        )
        .limit(1);

      if (matchedGuest) {
        return {
          guest: { name: matchedGuest.name },
          guestName: matchedGuest.name,
          guestToken: matchedGuest.tokenId,
        };
      }

      // If guestName was provided directly (e.g. from ?to=), return it as personalized guest context
      if (input.guestName) {
        return {
          guest: { name: formattedName },
          guestName: formattedName,
          guestToken: undefined,
        };
      }
    }
  }

  return { guest: {} };
}

const EMPTY_RESOLVED_DOCUMENT: ResolvedDocument = {
  schemaVersion: 1,
  baseWidth: 390,
  tokens: { colors: {}, fonts: {}, spacing: {} },
  sections: [],
  issues: [],
  ok: true,
};

const ASSET_ID_REGEX = /^[0-9a-f-]{36}$/i;

export function extractGroomBrideNames(data: Record<string, unknown>, fallbackTitle?: string): string | undefined {
  const groom =
    (typeof data["groom_nickname"] === "string" && data["groom_nickname"].trim()) ||
    (typeof data["groom_name"] === "string" && data["groom_name"].trim()) ||
    (typeof data["nama_pria"] === "string" && data["nama_pria"].trim()) ||
    (typeof data["mempelai_pria"] === "string" && data["mempelai_pria"].trim()) ||
    "";
  const bride =
    (typeof data["bride_nickname"] === "string" && data["bride_nickname"].trim()) ||
    (typeof data["bride_name"] === "string" && data["bride_name"].trim()) ||
    (typeof data["nama_wanita"] === "string" && data["nama_wanita"].trim()) ||
    (typeof data["mempelai_wanita"] === "string" && data["mempelai_wanita"].trim()) ||
    "";
  const couple =
    (typeof data["couple_names"] === "string" && data["couple_names"].trim()) ||
    (typeof data["nama_mempelai"] === "string" && data["nama_mempelai"].trim()) ||
    "";

  if (groom && bride) {
    return `${groom} & ${bride}`;
  }
  if (couple) {
    return couple;
  }
  if (fallbackTitle) {
    const candidate = fallbackTitle.split(/\s*[-—–|·]\s*/)[0]?.trim();
    // Hanya anggap sebagai nama mempelai jika mengandung "&" atau kata "dan"
    if (candidate && (/(&|\bdan\b)/i.test(candidate))) {
      return candidate;
    }
  }
  return undefined;
}

export function extractEventDateFormatted(data: Record<string, unknown>): string | undefined {
  const direct =
    (typeof data["event_date_formatted"] === "string" && data["event_date_formatted"].trim()) ||
    (typeof data["event_date"] === "string" && data["event_date"].trim()) ||
    (typeof data["tanggal_acara"] === "string" && data["tanggal_acara"].trim()) ||
    (typeof data["tanggal"] === "string" && data["tanggal"].trim()) ||
    (typeof data["waktu"] === "string" && data["waktu"].trim()) ||
    (typeof data["hari_tanggal"] === "string" && data["hari_tanggal"].trim()) ||
    (typeof data["event.date"] === "string" && data["event.date"].trim()) ||
    (typeof data["date"] === "string" && data["date"].trim()) ||
    (typeof data["akad_date"] === "string" && data["akad_date"].trim()) ||
    (typeof data["resepsi_date"] === "string" && data["resepsi_date"].trim()) ||
    (typeof data["wedding_date"] === "string" && data["wedding_date"].trim()) ||
    "";

  let dateStr = direct;
  if (!dateStr) {
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "string" && val.trim().length > 0) {
        if (/date|tanggal|tgl|waktu/i.test(key)) {
          dateStr = val.trim();
          break;
        }
      }
    }
  }

  if (!dateStr) return undefined;

  const indonesianMonths =
    /januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember/i;
  if (indonesianMonths.test(dateStr)) {
    return dateStr;
  }

  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(parsed);
    } catch {
      return dateStr;
    }
  }

  return dateStr;
}

export function extractCoverPhotoUrl(data: Record<string, unknown>): string | undefined {
  const direct =
    (typeof data["whatsapp_share_image"] === "string" && data["whatsapp_share_image"].trim()) ||
    (typeof data["share_image"] === "string" && data["share_image"].trim()) ||
    (typeof data["og_image"] === "string" && data["og_image"].trim()) ||
    (typeof data["cover_photo"] === "string" && data["cover_photo"].trim()) ||
    (typeof data["meta_image"] === "string" && data["meta_image"].trim()) ||
    (typeof data["photo_mempelai"] === "string" && data["photo_mempelai"].trim()) ||
    (typeof data["couple_photo"] === "string" && data["couple_photo"].trim()) ||
    (typeof data["header_photo"] === "string" && data["header_photo"].trim()) ||
    (typeof data["foto_anak"] === "string" && data["foto_anak"].trim()) ||
    (typeof data["child_photo"] === "string" && data["child_photo"].trim()) ||
    (typeof data["baby_photo"] === "string" && data["baby_photo"].trim()) ||
    (typeof data["foto_utama"] === "string" && data["foto_utama"].trim()) ||
    (typeof data["foto_sampul"] === "string" && data["foto_sampul"].trim()) ||
    (typeof data["foto_cover"] === "string" && data["foto_cover"].trim()) ||
    (typeof data["foto_mempelai"] === "string" && data["foto_mempelai"].trim()) ||
    (typeof data["photo"] === "string" && data["photo"].trim()) ||
    (typeof data["image"] === "string" && data["image"].trim());

  if (direct) {
    if (ASSET_ID_REGEX.test(direct)) return assetUrl(direct);
    return direct;
  }

  const galleryItems = data["gallery.items"] || data["gallery_items"] || data["gallery"];
  if (Array.isArray(galleryItems) && galleryItems.length > 0) {
    const first = galleryItems[0];
    if (typeof first === "object" && first !== null) {
      const rec = first as Record<string, unknown>;
      if (typeof rec.assetId === "string" && ASSET_ID_REGEX.test(rec.assetId.trim())) {
        return assetUrl(rec.assetId.trim());
      }
      if (typeof rec.src === "string" && rec.src.trim()) {
        return rec.src.trim();
      }
      if (typeof rec.url === "string" && rec.url.trim()) {
        return rec.url.trim();
      }
    }
  }

  for (const [key, val] of Object.entries(data)) {
    if (typeof val === "string" && val.trim().length > 0) {
      const cleanVal = val.trim();
      if (/photo|image|foto|sampul|cover|banner|hero|anak|mempelai/i.test(key)) {
        if (ASSET_ID_REGEX.test(cleanVal)) return assetUrl(cleanVal);
        if (cleanVal.startsWith("http://") || cleanVal.startsWith("https://") || cleanVal.startsWith("/")) {
          return cleanVal;
        }
      }
      if (ASSET_ID_REGEX.test(cleanVal)) {
        return assetUrl(cleanVal);
      }
      if (/\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(cleanVal)) {
        return cleanVal;
      }
    }
  }

  return undefined;
}

export function extractCoverPhotoFromDocument(document: CanonicalDocument): string | undefined {
  if (!document || !Array.isArray(document.sections)) return undefined;

  for (const section of document.sections) {
    if (!section) continue;
    if (section.background?.image && "assetId" in section.background.image && section.background.image.assetId) {
      return assetUrl(section.background.image.assetId);
    }
    if (!Array.isArray(section.elements)) continue;
    for (const el of section.elements) {
      if (el.type === "image" && el.source && "assetId" in el.source && el.source.assetId) {
        return assetUrl(el.source.assetId);
      }
      if (el.type === "widget" && el.widgetType === "photoFrame" && el.props) {
        const p = el.props as Record<string, unknown>;
        if (typeof p.src === "string" && p.src.trim()) {
          const src = p.src.trim();
          if (ASSET_ID_REGEX.test(src)) return assetUrl(src);
          return src;
        }
        if (typeof p.image === "string" && p.image.trim()) {
          const img = p.image.trim();
          if (ASSET_ID_REGEX.test(img)) return assetUrl(img);
          return img;
        }
      }
    }
  }
  return undefined;
}

export async function getPublicInvitation(
  db: Database,
  input: { slug: string; guestToken?: string; guestName?: string; allowDraft?: boolean },
): Promise<PublicInvitationModel | null> {
  if (input.slug.length === 0 || input.slug.length > 120) return null;
  const row = await findInvitationBySlug(db, input.slug);
  if (!row || row.status === "archived") return null;

  let templateThumbnailUrl: string | null = null;
  if (row.templateVersionId) {
    try {
      const [tpl] = await db
        .select({
          thumbnailUrl: templates.thumbnailUrl,
          previewMockupUrl: templates.previewMockupUrl,
        })
        .from(templateVersions)
        .innerJoin(templates, eq(templates.id, templateVersions.templateId))
        .where(eq(templateVersions.id, row.templateVersionId))
        .limit(1);
      if (tpl) {
        const rawTpl = tpl.thumbnailUrl || tpl.previewMockupUrl || null;
        if (rawTpl) {
          templateThumbnailUrl = ASSET_ID_REGEX.test(rawTpl) ? assetUrl(rawTpl) : rawTpl;
        }
      }
    } catch {
      // ignore
    }
  }

  // Check if invitation has expired or was manually closed
  const isClosed = isInvitationExpiredOrClosed(row);
  if (isClosed && row.status === "published" && !input.allowDraft) {
    const effectiveData = row.data || {};
    const groomBrideNames = extractGroomBrideNames(effectiveData, row.title);
    const eventDateFormatted = extractEventDateFormatted(effectiveData);
    const coverPhotoUrl = extractCoverPhotoUrl(effectiveData);

    return {
      title: row.title,
      slug: row.slug,
      revisionNo: 0,
      resolved: EMPTY_RESOLVED_DOCUMENT,
      hasGuest: false,
      isClosed: true,
      closedReason: row.isManuallyClosed ? "manual" : "expired",
      publishedAt: row.publishedAt,
      expiresAt: row.expiresAt,
      groomBrideNames,
      eventDateFormatted,
      coverPhotoUrl,
      templateThumbnailUrl,
    };
  }

  // 1. If published, load from the immutable active snapshot (FR-PUB-001)
  if (row.status === "published" && row.activePublishedSnapshotId) {
    const snapshot = await findSnapshotById(db, row.activePublishedSnapshotId);
    if (snapshot && snapshot.invitationId === row.id) {
      const { guest, guestName, guestToken } = await resolveGuestContext(
        db,
        row.id,
        input,
      );
      const document = parseDocumentOrThrow(migrateDocument(snapshot.document));
      // Always merge snapshot.data with row.data so client customizations
      // (custom WhatsApp share photo, share message, or client portal edits)
      // are immediately active without waiting for a re-publish.
      const effectiveData: Record<string, unknown> = {
        ...(snapshot.data || {}),
        ...(row.data || {}),
      };

      // Explicitly prioritize whatsapp_share_image from row.data or snapshot.data
      const rawShareImg =
        (row.data as Record<string, unknown> | null)?.["whatsapp_share_image"] ||
        (row.data as Record<string, unknown> | null)?.["share_image"] ||
        (snapshot.data as Record<string, unknown> | null)?.["whatsapp_share_image"] ||
        (snapshot.data as Record<string, unknown> | null)?.["share_image"];
      if (rawShareImg && typeof rawShareImg === "string") {
        effectiveData["whatsapp_share_image"] = rawShareImg.trim();
      }

      const groomBrideNames = extractGroomBrideNames(effectiveData, row.title);
      const eventDateFormatted = extractEventDateFormatted(effectiveData);
      const coverPhotoUrl =
        extractCoverPhotoUrl(effectiveData) ||
        extractCoverPhotoUrl(row.data as Record<string, unknown>) ||
        extractCoverPhotoFromDocument(document);

      return {
        title: row.title,
        slug: row.slug,
        revisionNo: snapshot.revisionNo,
        resolved: resolveDocument(document, snapshot.data, guest),
        ...(guestName !== undefined && { guestName }),
        ...(guestToken !== undefined && { guestToken }),
        hasGuest: guestName !== undefined,
        isDraft: false,
        isClosed: false,
        publishedAt: row.publishedAt,
        expiresAt: row.expiresAt,
        groomBrideNames,
        eventDateFormatted,
        coverPhotoUrl,
        templateThumbnailUrl,
      };
    }
  }

  // 2. If allowDraft is requested, render the active pinned template draft for client review (P-04, FR-PRV-001)
  if (input.allowDraft) {
    try {
      const { document } = await loadPinnedDocument(db, row);
      const { guest, guestName, guestToken } = await resolveGuestContext(
        db,
        row.id,
        input,
      );
      const effectiveData = row.data || {};
      const groomBrideNames = extractGroomBrideNames(effectiveData, row.title);
      const eventDateFormatted = extractEventDateFormatted(effectiveData);
      const coverPhotoUrl =
        extractCoverPhotoUrl(effectiveData) ||
        extractCoverPhotoFromDocument(document);

      return {
        title: row.title,
        slug: row.slug,
        revisionNo: 0,
        resolved: resolveDocument(document, row.data, guest),
        ...(guestName !== undefined && { guestName }),
        ...(guestToken !== undefined && { guestToken }),
        hasGuest: guestName !== undefined,
        isDraft: true,
        isClosed,
        publishedAt: row.publishedAt,
        expiresAt: row.expiresAt,
        groomBrideNames,
        eventDateFormatted,
        coverPhotoUrl,
        templateThumbnailUrl,
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Authorization seam for sibling feature services (RSVP dashboard, CSV import):
 * same not-found-for-non-members + capability rules as every invitation call.
 */
export async function requireInvitationAccess(
  db: Database,
  actor: Actor,
  invitationId: string,
  capability: "invitation:read" | "invitation:guest_manage" | "rsvp:read" | "rsvp:moderate",
): Promise<InvitationRow> {
  return loadAuthorized(db, actor, invitationId, capability);
}

export function assertInvitationWritable(row: InvitationRow): void {
  assertWritable(row);
}

export async function regenerateInvitationClientToken(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<string> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:write");
  const updated = await repoRegenerateInvitationClientToken(db, row.id);
  if (!updated || !updated.clientAccessToken) {
    throw new Error("Gagal memperbarui token portal klien.");
  }
  return updated.clientAccessToken;
}
