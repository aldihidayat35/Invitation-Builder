/**
 * RSVP service (server-only): public submission + dashboard read
 * (FR-WDG-005, FR-GST-001 partial, analytics `rsvp_submitted` is client-side).
 *
 * Policy (ADR 0010):
 * - Only PUBLISHED invitations accept RSVPs; everything else is "unavailable".
 * - A valid guest token (same invitation, not archived) identifies the guest:
 *   exactly one RSVP per guest, resubmitting UPDATES it (idempotent). The
 *   stored name is the guest's own name (not client supplied) and the party
 *   size is capped by `guest.maxParty`.
 * - Without a token, RSVPs dedupe by case-insensitive name per invitation.
 * - Unknown/foreign/archived tokens silently behave as "no token".
 */
import "server-only";
import type { Actor } from "@/lib/auth/authorization";
import {
  findGenericRsvpByName,
  findRsvpForGuest,
  insertRsvp,
  listRsvpRows,
  markGuestResponded,
  updateRsvp,
} from "@/lib/db/repositories/rsvps";
import { findGuestByToken, findInvitationBySlug } from "@/lib/db/repositories/invitations";
import type { Database } from "@/lib/db/types";
import { requireInvitationAccess } from "@/features/invitations/service";
import { rsvpInputSchema, type RsvpResult, type RsvpSummary } from "./schemas";

export class RsvpUnavailableError extends Error {
  constructor() {
    super("Undangan tidak tersedia.");
    this.name = "RsvpUnavailableError";
  }
}

export class RsvpInvalidError extends Error {
  constructor(message = "Data tidak valid.") {
    super(message);
    this.name = "RsvpInvalidError";
  }
}

export async function submitRsvp(db: Database, raw: unknown): Promise<RsvpResult> {
  const parsed = rsvpInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new RsvpInvalidError(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const input = parsed.data;

  const invitation = await findInvitationBySlug(db, input.slug);
  if (!invitation || invitation.status !== "published" || !invitation.activePublishedSnapshotId) {
    throw new RsvpUnavailableError();
  }

  const found = input.guestToken ? await findGuestByToken(db, input.guestToken) : undefined;
  const guest =
    found && found.invitationId === invitation.id && found.status !== "archived"
      ? found
      : undefined;

  const attending = input.response === "attending";
  const cap = guest?.maxParty ?? 20;
  const partySize = attending ? (input.partySize ?? 1) : 0;
  if (attending && (partySize < 1 || partySize > cap)) {
    throw new RsvpInvalidError(`Jumlah tamu harus antara 1 dan ${cap}.`);
  }
  const message = input.message ? input.message : null;
  const name = guest ? guest.name : input.name;

  return db.transaction(async (tx) => {
    const existing = guest
      ? await findRsvpForGuest(tx, invitation.id, guest.id)
      : await findGenericRsvpByName(tx, invitation.id, name);
    if (existing) {
      await updateRsvp(tx, existing.id, { response: input.response, partySize, message });
      if (guest) await markGuestResponded(tx, guest.id);
      return { status: "updated" } as const;
    }
    await insertRsvp(tx, {
      invitationId: invitation.id,
      ...(guest && { guestId: guest.id }),
      name,
      response: input.response,
      partySize,
      ...(message !== null && { message }),
    });
    if (guest) await markGuestResponded(tx, guest.id);
    return { status: "created" } as const;
  });
}

export async function listInvitationRsvps(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<RsvpSummary[]> {
  const row = await requireInvitationAccess(db, actor, invitationId, "invitation:read");
  const rows = await listRsvpRows(db, row.id);
  return rows.map((r) => ({
    id: r.id,
    guestName: r.guestName,
    name: r.name,
    response: r.response,
    partySize: r.partySize,
    message: r.message,
    createdAt: r.createdAt,
  }));
}
