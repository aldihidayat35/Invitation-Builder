/**
 * Guest CSV import service (FR-GST-001): parse -> preview (dryRun) -> commit.
 * Duplicates (case-insensitive, within the file and against existing guests)
 * are skipped, invalid rows are reported, valid rows are inserted atomically.
 */
import "server-only";
import type { Actor } from "@/lib/auth/authorization";
import { generateGuestTokenId } from "@/lib/db/guest-token";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { insertGuest, listGuests } from "@/lib/db/repositories/invitations";
import type { Database } from "@/lib/db/types";
import { planGuestImport, type ColumnMapping, type ImportPlan } from "./csv";
import {
  assertInvitationWorkflowMutable,
  assertInvitationWritable,
  requireInvitationAccess,
} from "./service";

export interface ImportGuestsResult {
  readonly plan: ImportPlan;
  /** Number of guests actually created (0 for a dry run). */
  readonly created: number;
}

export async function importGuests(
  db: Database,
  actor: Actor,
  input: {
    invitationId: string;
    csv: string;
    mapping?: ColumnMapping;
    dryRun?: boolean;
  },
): Promise<ImportGuestsResult> {
  const row = await requireInvitationAccess(
    db,
    actor,
    input.invitationId,
    "invitation:guest_manage",
  );
  assertInvitationWritable(row);

  const existing = (await listGuests(db, row.id)).map((g) => g.name);
  const plan = planGuestImport(input.csv, existing, input.mapping);
  if (input.dryRun !== false || plan.fatal) return { plan, created: 0 };

  await assertInvitationWorkflowMutable(db, row.id);

  const valid = plan.rows.filter((r) => r.status === "ok");
  if (valid.length === 0) return { plan, created: 0 };

  await db.transaction(async (tx) => {
    for (const r of valid) {
      await insertGuest(tx, {
        invitationId: row.id,
        name: r.name,
        tokenId: generateGuestTokenId(),
        maxParty: r.maxParty,
      });
    }
    await insertAuditLog(tx, {
      workspaceId: row.workspaceId,
      actorId: actor.userId,
      action: "guest.import",
      entityType: "invitation",
      entityId: row.id,
      metadata: { ...plan.summary, created: valid.length },
    });
  });
  return { plan, created: valid.length };
}
