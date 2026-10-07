/**
 * Server-side facade for invitation pages and server actions. Binds the
 * verified session user + DB to the injected-db service so UI code never
 * touches the database (ESLint-enforced) or forgets authorization.
 */
import "server-only";
import { ForbiddenError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import type { Actor } from "@/lib/auth/authorization";
import type { Database } from "@/lib/db/types";
import * as service from "./service";
import { importGuests } from "./guest-import";
import type { PreviewGuestSelection } from "./service";

async function context(): Promise<{ db: Database; actor: Actor }> {
  const user = await requireUser();
  return { db: await getDb(), actor: { userId: user.id } };
}

export async function permissionsFor(workspaceId: string) {
  const { db, actor } = await context();
  return service.invitationPermissions(db, actor, workspaceId);
}

export async function listAll(workspaceId: string, options: { archived?: boolean } = {}) {
  const { db, actor } = await context();
  return service.listInvitations(db, actor, workspaceId, options);
}

export async function create(workspaceId: string, templateId: string, title: string) {
  const { db, actor } = await context();
  return service.createInvitation(db, actor, { workspaceId, templateId, title });
}

export async function open(invitationId: string) {
  const { db, actor } = await context();
  return service.getInvitation(db, actor, invitationId);
}

export async function rename(invitationId: string, title: string) {
  const { db, actor } = await context();
  return service.renameInvitation(db, actor, invitationId, title);
}

export async function archive(invitationId: string) {
  const { db, actor } = await context();
  return service.archiveInvitation(db, actor, invitationId);
}

export async function saveData(
  invitationId: string,
  values: Record<string, string | undefined>,
  timeZone?: string,
) {
  const { db, actor } = await context();
  return service.saveInvitationData(db, actor, {
    invitationId,
    values,
    ...(timeZone !== undefined && { timeZone }),
  });
}

export async function readiness(invitationId: string) {
  const { db, actor } = await context();
  return service.getInvitationReadiness(db, actor, invitationId);
}

export async function listGuests(invitationId: string) {
  const { db, actor } = await context();
  return service.listInvitationGuests(db, actor, invitationId);
}

export async function addGuest(invitationId: string, name: string, maxParty?: number) {
  const { db, actor } = await context();
  return service.addGuest(db, actor, {
    invitationId,
    name,
    ...(maxParty !== undefined && { maxParty }),
  });
}

export async function updateGuest(
  invitationId: string,
  guestId: string,
  changes: { name?: string; maxParty?: number },
) {
  const { db, actor } = await context();
  return service.updateGuest(db, actor, { invitationId, guestId, ...changes });
}

export async function archiveGuest(invitationId: string, guestId: string) {
  const { db, actor } = await context();
  return service.archiveGuest(db, actor, { invitationId, guestId });
}

export async function preview(invitationId: string, guest?: PreviewGuestSelection) {
  const { db, actor } = await context();
  return service.buildPreview(db, actor, { invitationId, ...(guest && { guest }) });
}

export async function publish(invitationId: string) {
  const { db, actor } = await context();
  return service.publishInvitation(db, actor, invitationId);
}

export async function rollback(invitationId: string, revisionNo: number) {
  const { db, actor } = await context();
  return service.rollbackInvitation(db, actor, { invitationId, revisionNo });
}

export async function snapshots(invitationId: string) {
  const { db, actor } = await context();
  return service.listInvitationSnapshots(db, actor, invitationId);
}

/** Unauthenticated: used by the public `/i/[slug]` route only. */
export async function getPublic(slug: string, guestToken?: string) {
  return service.getPublicInvitation(await getDb(), {
    slug,
    ...(guestToken !== undefined && { guestToken }),
  });
}

export {
  GuestNotFoundError,
  InsufficientQuotaError,
  InvitationArchivedError,
  InvitationInputError,
  InvitationNotFoundError,
  PublishBlockedError,
  RevisionNotFoundError,
  SAMPLE_GUEST_NAME,
  TemplateNotPublishedError,
} from "./service";
export type { PreviewGuestSelection, PreviewModel } from "./service";

/** Maps domain errors to messages that are safe to show; unknown errors are not leaked. */
export function describeInvitationError(error: unknown): string {
  if (
    error instanceof service.InvitationInputError ||
    error instanceof service.InvitationArchivedError ||
    error instanceof service.TemplateNotPublishedError ||
    error instanceof service.PublishBlockedError ||
    error instanceof service.RevisionNotFoundError ||
    error instanceof service.InsufficientQuotaError ||
    error instanceof ForbiddenError
  ) {
    return error.message;
  }
  if (error instanceof service.InvitationNotFoundError) return "Undangan tidak ditemukan.";
  if (error instanceof service.GuestNotFoundError) return "Tamu tidak ditemukan.";
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export async function importGuestsCsv(invitationId: string, csv: string, dryRun: boolean) {
  const { db, actor } = await context();
  return importGuests(db, actor, { invitationId, csv, dryRun });
}
