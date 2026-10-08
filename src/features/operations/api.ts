import "server-only";

import { requireOwner, requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { listPrivacyRequests } from "@/lib/db/repositories/operations";
import type { AuditSearchFilter } from "@/lib/db/repositories/operations";
import * as service from "./service";

export async function getAdminOperations(filter: AuditSearchFilter = {}) {
  await requireOwner();
  return service.getOperationsDashboard(await getDb(), filter);
}

export async function getMyPrivacyRequests() {
  const user = await requireUser();
  return listPrivacyRequests(await getDb(), { targetUserId: user.id });
}

export async function submitMyPrivacyRequest(input: {
  requestType: "export" | "delete";
  reason?: string;
}) {
  const user = await requireUser();
  return service.requestPrivacyAction(
    await getDb(),
    { userId: user.id, systemRole: user.systemRole },
    input,
  );
}

export async function resolveAdminPrivacyRequest(input: {
  id: string;
  status: "in_progress" | "completed" | "rejected";
  resolutionNote: string;
}) {
  const user = await requireOwner();
  return service.resolvePrivacyAction(
    await getDb(),
    { userId: user.id, systemRole: user.systemRole },
    input,
  );
}

export async function recordAdminRecoveryDrill(input: {
  drillType: "backup" | "restore" | "failover";
  status: "planned" | "running" | "passed" | "failed";
  environment: string;
  backupReference?: string;
  measuredRpoMinutes?: number;
  measuredRtoMinutes?: number;
  notes?: string;
}) {
  const user = await requireOwner();
  return service.recordRecoveryDrill(
    await getDb(),
    { userId: user.id, systemRole: user.systemRole },
    input,
  );
}

export async function activateAdminDomainTls(profileId: string) {
  const user = await requireOwner();
  return service.activateDomainTls(
    await getDb(),
    { userId: user.id, systemRole: user.systemRole },
    profileId,
  );
}
