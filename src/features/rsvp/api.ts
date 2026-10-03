/** Server-side facade for the RSVP dashboard (session-bound). */
import "server-only";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { listInvitationRsvps } from "./service";

export async function rsvpsFor(invitationId: string) {
  const user = await requireUser();
  return listInvitationRsvps(await getDb(), { userId: user.id }, invitationId);
}
