import "server-only";

import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  createPrivacyRequest,
  createRecoveryDrill,
  getProductionQueue,
  getSecuritySummary,
  listPrivacyRequests,
  listRecoveryDrills,
  listManagedDomains,
  resolvePrivacyRequest,
  searchGlobalAuditLogs,
  type AuditSearchFilter,
} from "@/lib/db/repositories/operations";
import type { Database } from "@/lib/db/types";
import { activateResellerDomainTls } from "@/features/reseller/domain-service";
import type { Actor } from "@/lib/auth/authorization";
import { ForbiddenError } from "@/lib/auth/errors";

export async function getOperationsDashboard(
  db: Database,
  filter: AuditSearchFilter = {},
  now: Date = new Date(),
) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [audit, security, privacy, queue, drills, domains] = await Promise.all([
    searchGlobalAuditLogs(db, filter),
    getSecuritySummary(db, since),
    listPrivacyRequests(db),
    getProductionQueue(db, now),
    listRecoveryDrills(db),
    listManagedDomains(db),
  ]);
  return { audit, security, privacy, queue, drills, domains, generatedAt: now };
}

export async function requestPrivacyAction(
  db: Database,
  actor: Actor,
  input: { requestType: "export" | "delete"; reason?: string },
) {
  const existing = await listPrivacyRequests(db, {
    targetUserId: actor.userId,
    status: "pending",
  });
  if (existing.some((row) => row.request.requestType === input.requestType)) {
    throw new Error("Permintaan sejenis masih menunggu pemeriksaan.");
  }
  const created = await createPrivacyRequest(db, {
    requesterId: actor.userId,
    targetUserId: actor.userId,
    requestType: input.requestType,
    reason: input.reason,
    retentionDueAt:
      input.requestType === "delete" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
  });
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.userId,
    action: "privacy.request",
    entityType: "privacy_request",
    entityId: created.id,
    metadata: { requestType: input.requestType },
  });
  return created;
}

export async function resolvePrivacyAction(
  db: Database,
  actor: Actor,
  input: {
    id: string;
    status: "in_progress" | "completed" | "rejected";
    resolutionNote: string;
  },
) {
  if (actor.systemRole !== "owner") throw new ForbiddenError();
  const updated = await resolvePrivacyRequest(db, { ...input, resolvedBy: actor.userId });
  if (!updated) throw new Error("Permintaan privasi tidak ditemukan.");
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.userId,
    action: "privacy.resolve",
    entityType: "privacy_request",
    entityId: updated.id,
    metadata: { status: updated.status },
  });
  return updated;
}

export async function recordRecoveryDrill(
  db: Database,
  actor: Actor,
  input: {
    drillType: "backup" | "restore" | "failover";
    status: "planned" | "running" | "passed" | "failed";
    environment: string;
    backupReference?: string;
    measuredRpoMinutes?: number;
    measuredRtoMinutes?: number;
    notes?: string;
  },
) {
  if (actor.systemRole !== "owner") throw new ForbiddenError();
  const now = new Date();
  const created = await createRecoveryDrill(db, {
    ...input,
    performedBy: actor.userId,
    backupReference: input.backupReference ?? null,
    measuredRpoMinutes: input.measuredRpoMinutes ?? null,
    measuredRtoMinutes: input.measuredRtoMinutes ?? null,
    notes: input.notes ?? null,
    startedAt: input.status === "planned" ? null : now,
    completedAt: input.status === "passed" || input.status === "failed" ? now : null,
  });
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.userId,
    action: "operations.recovery_drill",
    entityType: "recovery_drill",
    entityId: created.id,
    metadata: { drillType: created.drillType, status: created.status },
  });
  return created;
}

export async function activateDomainTls(db: Database, actor: Actor, profileId: string) {
  const updated = await activateResellerDomainTls(db, actor, profileId);
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.userId,
    action: "domain.tls_activate",
    entityType: "reseller_domain",
    entityId: profileId,
    metadata: { domain: updated.customDomain, tlsStatus: updated.tlsStatus },
  });
  return updated;
}
