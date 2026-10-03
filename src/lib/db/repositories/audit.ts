import { and, desc, eq } from "drizzle-orm";
import type { AuditAction } from "../../schema/domain";
import { auditLogs, type AuditLogRow } from "../schema";
import type { Database } from "../types";

export interface AuditEntry {
  workspaceId: string | null;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}

/** Append-only (DB trigger forbids UPDATE/DELETE). Pass a transaction to commit atomically. */
export async function insertAuditLog(db: Database, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({ ...entry, metadata: entry.metadata ?? {} });
}

export async function listAuditLogs(
  db: Database,
  workspaceId: string,
  filter: { entityType?: string; entityId?: string } = {},
): Promise<AuditLogRow[]> {
  const conditions = [eq(auditLogs.workspaceId, workspaceId)];
  if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType));
  if (filter.entityId) conditions.push(eq(auditLogs.entityId, filter.entityId));
  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt));
}
