import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { invitations, rsvps, templates } from "@/lib/db/schema";

export async function getWorkspaceDashboardMetrics(workspaceId: string, year: number) {
  const db = await getDb();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  const [invitationMonthRows, templateMonthRows, rsvpRows] = await Promise.all([
    db
      .select({
        monthNum: sql<number>`extract(month from ${invitations.createdAt})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          gte(invitations.createdAt, start),
          lte(invitations.createdAt, end),
        ),
      )
      .groupBy(sql`extract(month from ${invitations.createdAt})`),
    db
      .select({
        monthNum: sql<number>`extract(month from ${templates.createdAt})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(templates)
      .where(
        and(
          eq(templates.workspaceId, workspaceId),
          gte(templates.createdAt, start),
          lte(templates.createdAt, end),
        ),
      )
      .groupBy(sql`extract(month from ${templates.createdAt})`),
    db
      .select({
        totalRsvps: sql<number>`count(*)::int`,
        attendingCount: sql<number>`coalesce(sum(case when ${rsvps.response} = 'attending' then 1 else 0 end), 0)::int`,
        totalPartyGuests: sql<number>`coalesce(sum(case when ${rsvps.response} = 'attending' then ${rsvps.partySize} else 0 end), 0)::int`,
      })
      .from(rsvps)
      .innerJoin(invitations, eq(invitations.id, rsvps.invitationId))
      .where(eq(invitations.workspaceId, workspaceId)),
  ]);
  return {
    invitationMonthRows,
    templateMonthRows,
    rsvpStats: rsvpRows[0] ?? { totalRsvps: 0, attendingCount: 0, totalPartyGuests: 0 },
  };
}
