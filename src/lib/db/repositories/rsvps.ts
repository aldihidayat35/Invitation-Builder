import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { guests, rsvps } from "../schema";
import type { Database } from "../types";

export type RsvpRowType = typeof rsvps.$inferSelect;

/** RSVP persistence (FR-WDG-005). One row per guest; generic RSVPs dedupe by normalized name. */
export async function findRsvpForGuest(
  db: Database,
  invitationId: string,
  guestId: string,
): Promise<RsvpRowType | undefined> {
  const [row] = await db
    .select()
    .from(rsvps)
    .where(and(eq(rsvps.invitationId, invitationId), eq(rsvps.guestId, guestId)))
    .limit(1);
  return row;
}

export async function findGenericRsvpByName(
  db: Database,
  invitationId: string,
  name: string,
): Promise<RsvpRowType | undefined> {
  const [row] = await db
    .select()
    .from(rsvps)
    .where(
      and(
        eq(rsvps.invitationId, invitationId),
        isNull(rsvps.guestId),
        sql`lower(${rsvps.name}) = ${name.toLowerCase()}`,
      ),
    )
    .limit(1);
  return row;
}

export async function insertRsvp(
  db: Database,
  input: {
    invitationId: string;
    guestId?: string;
    name: string;
    response: "attending" | "not_attending";
    partySize: number;
    message?: string;
  },
): Promise<RsvpRowType> {
  const [row] = await db.insert(rsvps).values(input).returning();
  if (!row) throw new Error("insertRsvp returned no row");
  return row;
}

export async function updateRsvp(
  db: Database,
  id: string,
  changes: { response: "attending" | "not_attending"; partySize: number; message: string | null },
): Promise<void> {
  await db.update(rsvps).set(changes).where(eq(rsvps.id, id));
}

export async function markGuestResponded(db: Database, guestId: string): Promise<void> {
  await db
    .update(guests)
    .set({ status: "responded", updatedAt: new Date() })
    .where(and(eq(guests.id, guestId), eq(guests.status, "active")));
}

export async function listRsvpRows(
  db: Database,
  invitationId: string,
): Promise<(RsvpRowType & { guestName: string | null })[]> {
  const rows = await db
    .select({ rsvp: rsvps, guestName: guests.name })
    .from(rsvps)
    .leftJoin(guests, eq(guests.id, rsvps.guestId))
    .where(eq(rsvps.invitationId, invitationId))
    .orderBy(desc(rsvps.createdAt));
  return rows.map((r) => ({ ...r.rsvp, guestName: r.guestName }));
}
