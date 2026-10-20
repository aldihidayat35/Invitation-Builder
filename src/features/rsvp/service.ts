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
import { and, eq, ilike, ne } from "drizzle-orm";
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
import { guests } from "@/lib/db/schema";
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

  const rawName = input.name.trim();

  // 1. Cek token jika ada
  const found = input.guestToken ? await findGuestByToken(db, input.guestToken) : undefined;
  let guest =
    found && found.invitationId === invitation.id && found.status !== "archived"
      ? found
      : undefined;

  // 2. Jika tidak ada token atau token tidak cocok, cari di daftar tamu berdasarkan nama
  if (!guest && rawName) {
    const [matchedByName] = await db
      .select()
      .from(guests)
      .where(
        and(
          eq(guests.invitationId, invitation.id),
          ne(guests.status, "archived"),
          ilike(guests.name, rawName),
        ),
      )
      .limit(1);
    if (matchedByName) {
      guest = matchedByName;
    }
  }

  const attending = input.response === "attending";
  const cap = guest?.maxParty ?? 20;
  const partySize = attending ? (input.partySize ?? 1) : 0;
  if (attending && (partySize < 1 || partySize > cap)) {
    throw new RsvpInvalidError(`Jumlah tamu harus antara 1 dan ${cap}.`);
  }
  const message = input.message ? input.message : null;

  return db.transaction(async (tx) => {
    const name = guest ? guest.name : rawName;

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

export interface PublicWishItem {
  readonly id: string;
  readonly name: string;
  readonly presence: "hadir" | "berhalangan" | string;
  readonly message: string;
  readonly date: string;
  readonly createdAt: string;
}

export function formatWishTime(date: Date | string | undefined): string {
  if (!date) return "Baru saja";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Baru saja";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const DEMO_WISHES: readonly PublicWishItem[] = [
  {
    id: "demo-1",
    name: "Dina & Rian",
    presence: "hadir",
    message:
      "Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Bahagia selalu! 💕",
    date: "Baru saja",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    name: "Budi Santoso",
    presence: "hadir",
    message:
      "Happy wedding brother! Lancar jaya acaranya sampai hari H. Doa terbaik untuk kalian berdua!",
    date: "1 jam lalu",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "demo-3",
    name: "Maya Indah",
    presence: "berhalangan",
    message:
      "Selamat ya kalian berdua! Maaf belum bisa hadir langsung karena masih dinas, tapi doa restu kami selalu menyertai kalian.",
    date: "3 jam lalu",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

export async function listPublicWishesBySlug(
  db: Database,
  slug: string,
): Promise<PublicWishItem[]> {
  const clean = slug.trim().toLowerCase();
  const invitation = await findInvitationBySlug(db, clean);

  if (!invitation) {
    if (clean.startsWith("demo-") || clean.includes("showcase")) {
      return [...DEMO_WISHES];
    }
    return [];
  }

  const rows = await listRsvpRows(db, invitation.id);
  const withMessage = rows.filter(
    (r) => typeof r.message === "string" && r.message.trim().length > 0,
  );

  return withMessage.map((r) => ({
    id: r.id,
    name: r.guestName || r.name,
    presence: r.response === "attending" ? "hadir" : "berhalangan",
    message: r.message!.trim(),
    date: formatWishTime(r.createdAt),
    createdAt: r.createdAt.toISOString(),
  }));
}

