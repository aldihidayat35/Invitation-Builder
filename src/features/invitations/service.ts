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
import { generateGuestTokenId } from "@/lib/db/guest-token";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  archiveGuestRow,
  archiveInvitationRow,
  findGuest,
  findGuestByToken,
  findInvitationById,
  findInvitationBySlug,
  findSnapshotById,
  findSnapshotByRevision,
  findTemplateVersionWithWorkspace,
  insertGuest,
  insertInvitation,
  insertPublishedSnapshot,
  listGuests as listGuestRows,
  listInvitations as listInvitationRows,
  listSnapshotSummaries,
  nextRevisionNo,
  setActiveSnapshot,
  updateGuestRow,
  updateInvitationData,
  updateInvitationTitle,
} from "@/lib/db/repositories/invitations";
import { findTemplateById, findTemplateVersion } from "@/lib/db/repositories/templates";
import type { GuestRow, InvitationRow } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import {
  applyDefaults,
  createVariableRegistry,
  parseFormSubmission,
  resolveDocument,
  validateInvitationData,
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

function toSummary(row: InvitationRow): InvitationSummary {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    slug: row.slug,
    status: row.status,
    templateVersionId: row.templateVersionId,
    updatedAt: row.updatedAt,
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
  const role = await findRole(db, actor, workspaceId);
  return { write: role ? roleCan(role, "invitation:write") : false };
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
  input: { workspaceId: string; templateId: string; title: string },
): Promise<InvitationSummary> {
  await requireCapability(db, actor, input.workspaceId, "invitation:write");
  await requireCapability(db, actor, input.workspaceId, "template:read");
  const title = parseTitle(input.title);

  if (!uuidSchema.safeParse(input.templateId).success) {
    throw new InvitationInputError("Template tidak valid.");
  }
  const template = await findTemplateById(db, input.templateId);
  // Cross-workspace templates are reported exactly like missing ones.
  if (!template || template.workspaceId !== input.workspaceId || template.status === "archived") {
    throw new InvitationInputError("Template tidak ditemukan atau sudah diarsipkan.");
  }
  if (template.publishedVersionNo === null) throw new TemplateNotPublishedError();
  const version = await findTemplateVersion(db, template.id, template.publishedVersionNo);
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
    ...toSummary(row),
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
  const row = await loadAuthorized(db, actor, invitationId, "invitation:write");
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
  const row = await loadAuthorized(db, actor, invitationId, "invitation:write");
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
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:write");
  assertWritable(row);
  const { document } = await loadPinnedDocument(db, row);
  const { data, issues } = parseFormSubmission(document.variables, input.values, {
    timeZone: input.timeZone ?? "Asia/Jakarta",
  });
  const stored = persistableData(data, issues);

  const updated = await updateInvitationData(db, { invitationId: row.id, data: stored });
  if (!updated) throw new InvitationArchivedError();
  return { invitation: toSummary(updated), issues };
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
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:write");
  assertWritable(row);
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
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:write");
  assertWritable(row);
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
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:write");
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
): Promise<SnapshotSummary> {
  const row = await loadAuthorized(db, actor, invitationId, "invitation:write");
  assertWritable(row);
  const { document } = await loadPinnedDocument(db, row);
  const issues = validateInvitationData(
    createVariableRegistry(document.variables),
    row.data,
  ).filter((issue) => issue.code !== "unknown_key");
  if (issues.length > 0) throw new PublishBlockedError(issues.map((issue) => issue.key));

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
    const updated = await setActiveSnapshot(tx, row.id, snapshot.id);
    if (!updated) throw new InvitationArchivedError();
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "invitation.publish",
      entityType: "invitation",
      entityId: row.id,
      metadata: { revisionNo },
    });
    return {
      revisionNo,
      schemaVersion: snapshot.schemaVersion,
      createdAt: snapshot.createdAt,
      active: true,
    };
  });
}

/** Re-points the live URL to an older snapshot without altering any snapshot (FR-PUB-003). */
export async function rollbackInvitation(
  db: Database,
  actor: Actor,
  input: { invitationId: string; revisionNo: number },
): Promise<SnapshotSummary> {
  const row = await loadAuthorized(db, actor, input.invitationId, "invitation:write");
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
export async function getPublicInvitation(
  db: Database,
  input: { slug: string; guestToken?: string },
): Promise<PublicInvitationModel | null> {
  if (input.slug.length === 0 || input.slug.length > 120) return null;
  const row = await findInvitationBySlug(db, input.slug);
  if (!row || row.status !== "published" || !row.activePublishedSnapshotId) return null;
  const snapshot = await findSnapshotById(db, row.activePublishedSnapshotId);
  if (!snapshot || snapshot.invitationId !== row.id) return null;

  let guest: GuestData = {};
  if (input.guestToken) {
    const found = await findGuestByToken(db, input.guestToken);
    if (found && found.invitationId === row.id && found.status !== "archived") {
      guest = { name: found.name };
    }
  }
  const document = parseDocumentOrThrow(migrateDocument(snapshot.document));
  return {
    title: row.title,
    slug: row.slug,
    revisionNo: snapshot.revisionNo,
    resolved: resolveDocument(document, snapshot.data, guest),
    ...(guest.name !== undefined && { guestName: guest.name }),
    hasGuest: guest.name !== undefined,
  };
}

/**
 * Authorization seam for sibling feature services (RSVP dashboard, CSV import):
 * same not-found-for-non-members + capability rules as every invitation call.
 */
export async function requireInvitationAccess(
  db: Database,
  actor: Actor,
  invitationId: string,
  capability: "invitation:read" | "invitation:write",
): Promise<InvitationRow> {
  return loadAuthorized(db, actor, invitationId, capability);
}

export function assertInvitationWritable(row: InvitationRow): void {
  assertWritable(row);
}
