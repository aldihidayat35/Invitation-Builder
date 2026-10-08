// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createMigratedDb } from "../helpers/db";
import { seedDev } from "@/lib/db/seed";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { createCustomerOrder } from "@/lib/db/repositories/orders";
import {
  createResellerWithProfile,
  findResellerProfileByCustomDomain,
} from "@/lib/db/repositories/resellers";
import {
  getProductionQueue,
  getSecuritySummary,
  insertSecurityEvent,
  searchGlobalAuditLogs,
} from "@/lib/db/repositories/operations";
import { customerOrders } from "@/lib/db/schema";
import {
  activateResellerDomainTls,
  DOMAIN_TXT_PREFIX,
  verifyResellerDomain,
} from "@/features/reseller/domain-service";
import {
  recordRecoveryDrill,
  requestPrivacyAction,
  resolvePrivacyAction,
} from "@/features/operations/service";
import { ForbiddenError } from "@/lib/auth/errors";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
let ownerId: string;
let seller: Awaited<ReturnType<typeof createResellerWithProfile>>;

beforeAll(async () => {
  conn = await createMigratedDb();
  ownerId = (await seedDev(conn.db)).userId;
  seller = await createResellerWithProfile(conn.db, {
    email: "phase3-seller@example.test",
    name: "Seller Fase 3",
    agencyName: "Operasional Wedding",
    slug: "operasional-wedding",
    whatsappContact: "628123456789",
    customDomain: "invite.operasional.test",
  });
});

afterAll(async () => {
  await conn.close();
});

describe("Fase 3 - operational readiness", () => {
  it("searches global audit history by actor and action", async () => {
    await insertAuditLog(conn.db, {
      workspaceId: null,
      actorId: ownerId,
      action: "operations.recovery_drill",
      entityType: "recovery_drill",
      entityId: crypto.randomUUID(),
    });

    const byActor = await searchGlobalAuditLogs(conn.db, { query: "admin@admin.com" });
    const byAction = await searchGlobalAuditLogs(conn.db, {
      action: "operations.recovery_drill",
    });
    expect(byActor.some((row) => row.audit.action === "operations.recovery_drill")).toBe(true);
    expect(byAction).toHaveLength(1);
  });

  it("aggregates security signals without storing raw identities", async () => {
    await insertSecurityEvent(conn.db, {
      eventType: "auth.login_failed",
      subjectHash: "sha256-subject",
      clientHash: "sha256-client",
    });
    await insertSecurityEvent(conn.db, {
      eventType: "auth.rate_limited",
      severity: "critical",
      subjectHash: "sha256-subject",
    });

    const summary = await getSecuritySummary(conn.db, new Date(Date.now() - 60_000));
    expect(summary).toMatchObject({
      total: 2,
      failedLogins: 1,
      rateLimited: 1,
      critical: 1,
      uniqueSubjects: 1,
    });
    expect(JSON.stringify(summary.recent)).not.toContain("phase3-seller@example.test");
  });

  it("tracks privacy requests and restricts resolution to the platform owner", async () => {
    const actor = { userId: seller.user.id, systemRole: "reseller" as const };
    const request = await requestPrivacyAction(conn.db, actor, {
      requestType: "delete",
      reason: "Akun tidak lagi digunakan",
    });
    expect(request.status).toBe("pending");
    expect(request.retentionDueAt).toBeInstanceOf(Date);
    await expect(requestPrivacyAction(conn.db, actor, { requestType: "delete" })).rejects.toThrow(
      "masih menunggu",
    );
    await expect(
      resolvePrivacyAction(conn.db, actor, {
        id: request.id,
        status: "completed",
        resolutionNote: "Tidak diizinkan",
      }),
    ).rejects.toThrow(ForbiddenError);

    const resolved = await resolvePrivacyAction(
      conn.db,
      { userId: ownerId, systemRole: "owner" },
      {
        id: request.id,
        status: "completed",
        resolutionNote: "Identitas diverifikasi dan prosedur retensi diselesaikan.",
      },
    );
    expect(resolved.status).toBe("completed");
    expect(resolved.resolvedBy).toBe(ownerId);
  });

  it("gates a custom domain behind DNS ownership verification and owner TLS activation", async () => {
    expect(seller.profile.domainStatus).toBe("pending");
    expect(seller.profile.domainVerificationToken).toBeTruthy();
    expect(
      await findResellerProfileByCustomDomain(conn.db, "invite.operasional.test"),
    ).toBeUndefined();

    const verified = await verifyResellerDomain(
      conn.db,
      { userId: seller.user.id, systemRole: "reseller" },
      seller.profile.id,
      {
        resolveTxt: async () => [[`${DOMAIN_TXT_PREFIX}${seller.profile.domainVerificationToken}`]],
      },
    );
    expect(verified.domainStatus).toBe("verified");
    await expect(
      activateResellerDomainTls(
        conn.db,
        { userId: seller.user.id, systemRole: "reseller" },
        seller.profile.id,
      ),
    ).rejects.toThrow(ForbiddenError);

    await activateResellerDomainTls(
      conn.db,
      { userId: ownerId, systemRole: "owner" },
      seller.profile.id,
    );
    expect(
      await findResellerProfileByCustomDomain(conn.db, "invite.operasional.test"),
    ).toMatchObject({ id: seller.profile.id, domainStatus: "active", tlsStatus: "active" });
  });

  it("reports overdue, unassigned production work and its bottleneck", async () => {
    const order = await createCustomerOrder(conn.db, {
      sellerId: seller.profile.id,
      customerName: "Pelanggan SLA",
      customerEmail: "sla@example.test",
      customerWhatsapp: "628987654321",
    });
    const now = new Date("2026-10-09T12:00:00.000Z");
    await conn.db
      .update(customerOrders)
      .set({
        orderStatus: "accepted",
        productionStatus: "in_production",
        dueAt: new Date("2026-10-08T12:00:00.000Z"),
        assignedTo: null,
      })
      .where(eq(customerOrders.id, order.id));

    const queue = await getProductionQueue(conn.db, now);
    expect(queue).toMatchObject({ total: 1, overdue: 1, unassigned: 1 });
    expect(queue.bottlenecks[0]).toEqual(["in_production", 1]);
  });

  it("records measurable recovery drills for owners only", async () => {
    await expect(
      recordRecoveryDrill(
        conn.db,
        { userId: seller.user.id, systemRole: "reseller" },
        { drillType: "restore", status: "passed", environment: "staging" },
      ),
    ).rejects.toThrow(ForbiddenError);

    const drill = await recordRecoveryDrill(
      conn.db,
      { userId: ownerId, systemRole: "owner" },
      {
        drillType: "restore",
        status: "passed",
        environment: "staging",
        backupReference: "backup-2026-10-09.dump",
        measuredRpoMinutes: 10,
        measuredRtoMinutes: 18,
      },
    );
    expect(drill).toMatchObject({
      status: "passed",
      measuredRpoMinutes: 10,
      measuredRtoMinutes: 18,
    });
    expect(drill.completedAt).toBeInstanceOf(Date);
  });
});
