import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  auditLogs,
  customerOrders,
  privacyRequests,
  recoveryDrills,
  resellerProfiles,
  securityEvents,
  users,
  type PrivacyRequest,
  type RecoveryDrill,
} from "../schema";
import type { Database } from "../types";

export interface AuditSearchFilter {
  query?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function searchGlobalAuditLogs(db: Database, filter: AuditSearchFilter = {}) {
  const conditions = [];
  if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
  if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType));
  if (filter.from) conditions.push(gte(auditLogs.createdAt, filter.from));
  if (filter.to) conditions.push(lte(auditLogs.createdAt, filter.to));
  if (filter.query?.trim()) {
    const pattern = `%${filter.query.trim()}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.entityType, pattern),
        ilike(auditLogs.entityId, pattern),
        ilike(users.name, pattern),
        ilike(users.email, pattern),
      )!,
    );
  }
  return db
    .select({ audit: auditLogs, actorName: users.name, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(Math.max(filter.limit ?? 100, 1), 500));
}

export async function insertSecurityEvent(
  db: Database,
  input: {
    eventType: string;
    severity?: "info" | "warning" | "critical";
    subjectHash?: string | null;
    clientHash?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(securityEvents).values({
    eventType: input.eventType,
    severity: input.severity ?? "warning",
    subjectHash: input.subjectHash ?? null,
    clientHash: input.clientHash ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function getSecuritySummary(db: Database, since: Date) {
  const [summary] = await db
    .select({
      total: count(),
      failedLogins: sql<number>`count(case when ${securityEvents.eventType} = 'auth.login_failed' then 1 end)::int`,
      rateLimited: sql<number>`count(case when ${securityEvents.eventType} = 'auth.rate_limited' then 1 end)::int`,
      critical: sql<number>`count(case when ${securityEvents.severity} = 'critical' then 1 end)::int`,
      uniqueSubjects: sql<number>`count(distinct ${securityEvents.subjectHash})::int`,
    })
    .from(securityEvents)
    .where(gte(securityEvents.createdAt, since));
  const recent = await db
    .select()
    .from(securityEvents)
    .where(gte(securityEvents.createdAt, since))
    .orderBy(desc(securityEvents.createdAt))
    .limit(50);
  return {
    total: summary?.total ?? 0,
    failedLogins: summary?.failedLogins ?? 0,
    rateLimited: summary?.rateLimited ?? 0,
    critical: summary?.critical ?? 0,
    uniqueSubjects: summary?.uniqueSubjects ?? 0,
    recent,
  };
}

export async function createPrivacyRequest(
  db: Database,
  input: {
    requesterId: string;
    targetUserId: string;
    requestType: "export" | "delete";
    reason?: string;
    retentionDueAt?: Date | null;
  },
): Promise<PrivacyRequest> {
  const [created] = await db
    .insert(privacyRequests)
    .values({
      ...input,
      reason: input.reason?.trim() || null,
      retentionDueAt: input.retentionDueAt ?? null,
    })
    .returning();
  if (!created) throw new Error("createPrivacyRequest returned no row");
  return created;
}

export async function listPrivacyRequests(
  db: Database,
  filter: { targetUserId?: string; status?: string } = {},
) {
  const conditions = [];
  if (filter.targetUserId) conditions.push(eq(privacyRequests.targetUserId, filter.targetUserId));
  if (filter.status) conditions.push(eq(privacyRequests.status, filter.status));
  return db
    .select({ request: privacyRequests, targetName: users.name, targetEmail: users.email })
    .from(privacyRequests)
    .innerJoin(users, eq(users.id, privacyRequests.targetUserId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(privacyRequests.createdAt));
}

export async function resolvePrivacyRequest(
  db: Database,
  input: {
    id: string;
    status: "in_progress" | "completed" | "rejected";
    resolvedBy: string;
    resolutionNote: string;
  },
): Promise<PrivacyRequest | undefined> {
  const [updated] = await db
    .update(privacyRequests)
    .set({
      status: input.status,
      resolvedBy: input.resolvedBy,
      resolutionNote: input.resolutionNote.trim(),
      ...(input.status === "completed" || input.status === "rejected"
        ? { resolvedAt: new Date() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(privacyRequests.id, input.id))
    .returning();
  return updated;
}

export async function getProductionQueue(db: Database, now: Date = new Date()) {
  const rows = await db
    .select({
      order: customerOrders,
      sellerName: resellerProfiles.agencyName,
      assigneeName: users.name,
    })
    .from(customerOrders)
    .innerJoin(resellerProfiles, eq(resellerProfiles.id, customerOrders.sellerId))
    .leftJoin(users, eq(users.id, customerOrders.assignedTo))
    .where(
      and(
        eq(customerOrders.orderStatus, "accepted"),
        or(
          eq(customerOrders.productionStatus, "awaiting_client"),
          eq(customerOrders.productionStatus, "in_production"),
          eq(customerOrders.productionStatus, "client_review"),
          eq(customerOrders.productionStatus, "revision_requested"),
          eq(customerOrders.productionStatus, "approved"),
        ),
      ),
    )
    .orderBy(asc(customerOrders.dueAt), asc(customerOrders.createdAt));

  const dueSoonAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    rows,
    total: rows.length,
    unassigned: rows.filter((row) => !row.order.assignedTo).length,
    overdue: rows.filter((row) => row.order.dueAt && row.order.dueAt < now).length,
    dueSoon: rows.filter(
      (row) => row.order.dueAt && row.order.dueAt >= now && row.order.dueAt <= dueSoonAt,
    ).length,
    bottlenecks: Object.entries(
      rows.reduce<Record<string, number>>((result, row) => {
        result[row.order.productionStatus] = (result[row.order.productionStatus] ?? 0) + 1;
        return result;
      }, {}),
    ).sort((a, b) => b[1] - a[1]),
  };
}

export async function createRecoveryDrill(
  db: Database,
  input: Omit<RecoveryDrill, "id" | "createdAt" | "updatedAt">,
): Promise<RecoveryDrill> {
  const [created] = await db.insert(recoveryDrills).values(input).returning();
  if (!created) throw new Error("createRecoveryDrill returned no row");
  return created;
}

export async function listRecoveryDrills(db: Database): Promise<RecoveryDrill[]> {
  return db.select().from(recoveryDrills).orderBy(desc(recoveryDrills.createdAt)).limit(50);
}

export async function listManagedDomains(db: Database) {
  return db
    .select({
      profileId: resellerProfiles.id,
      agencyName: resellerProfiles.agencyName,
      domain: resellerProfiles.customDomain,
      domainStatus: resellerProfiles.domainStatus,
      tlsStatus: resellerProfiles.tlsStatus,
      verifiedAt: resellerProfiles.domainVerifiedAt,
    })
    .from(resellerProfiles)
    .where(sql`${resellerProfiles.customDomain} is not null`)
    .orderBy(asc(resellerProfiles.domainStatus), asc(resellerProfiles.agencyName));
}
