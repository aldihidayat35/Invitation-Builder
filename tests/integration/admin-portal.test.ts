// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  adjustResellerCredit,
  createResellerWithProfile,
  getAdminResellerStats,
  listAllCreditTransactions,
  updateResellerStatus,
} from "@/lib/db/repositories/resellers";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { getActorRole } from "@/lib/auth/server";
import { seedDev } from "@/lib/db/seed";
import { auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Super Admin Reseller Portal (Phase 2)", () => {
  it("getActorRole correctly identifies roles", () => {
    expect(
      getActorRole({
        id: "u1",
        email: "owner@test.com",
        name: "Owner",
        systemRole: "owner",
        resellerId: null,
      }),
    ).toBe("owner");

    expect(
      getActorRole({
        id: "u2",
        email: "reseller@test.com",
        name: "Reseller",
        systemRole: "reseller",
        resellerId: null,
      }),
    ).toBe("reseller");

    expect(
      getActorRole({
        id: "u3",
        email: "client@test.com",
        name: "Client",
        systemRole: "client",
        resellerId: "u2",
      }),
    ).toBe("client");
  });

  it("updates reseller active status", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "status-test@agency.test",
      name: "Status Admin",
      agencyName: "Status Agency",
      slug: "status-agency",
      whatsappContact: "62899001122",
      initialCredits: 10,
    });

    expect(res.profile.isActive).toBe(true);

    // Deactivate
    const deactivated = await updateResellerStatus(db(), res.profile.id, false);
    expect(deactivated.isActive).toBe(false);

    // Reactivate
    const reactivated = await updateResellerStatus(db(), res.profile.id, true);
    expect(reactivated.isActive).toBe(true);
  });

  it("aggregates platform statistics for admin dashboard", async () => {
    // Seed dev first
    await seedDev(db());

    const stats = await getAdminResellerStats(db());
    expect(stats.totalResellers).toBeGreaterThanOrEqual(1);
    expect(stats.activeResellers).toBeGreaterThanOrEqual(1);
    expect(stats.totalQuota).toBeGreaterThanOrEqual(20);
    expect(stats.totalTransactions).toBeGreaterThanOrEqual(1);
  });

  it("lists all credit transactions joined with reseller agency and user details", async () => {
    const resellerA = await createResellerWithProfile(db(), {
      email: "tx-a@agency.test",
      name: "TX Admin A",
      agencyName: "TX Agency A",
      slug: "tx-agency-a",
      whatsappContact: "62811223344",
      initialCredits: 25,
    });

    // Top-up transaction
    await adjustResellerCredit(db(), {
      resellerProfileId: resellerA.profile.id,
      amount: 15,
      type: "purchase_topup",
      referenceId: "INV-TEST-001",
      notes: "Pembelian via Admin",
    });

    const allTx = await listAllCreditTransactions(db(), 100);
    expect(allTx.length).toBeGreaterThanOrEqual(2);

    const latest = allTx[0];
    expect(latest).toBeDefined();
    expect(latest?.reseller.agencyName).toBeDefined();
    expect(latest?.user.email).toBeDefined();
    expect(latest?.transaction.type).toBeDefined();
  });

  it("writes audit logs for reseller administrative actions", async () => {
    const seed = await seedDev(db());

    // Record admin audit log
    await insertAuditLog(db(), {
      workspaceId: null,
      actorId: seed.userId,
      action: "reseller.create",
      entityType: "reseller_profile",
      entityId: "test-profile-id",
      metadata: {
        agencyName: "Audit Test Agency",
        slug: "audit-test",
      },
    });

    const logs = await db()
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "reseller.create"));

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[logs.length - 1];
    expect(log?.actorId).toBe(seed.userId);
    expect(log?.entityType).toBe("reseller_profile");
  });

  it("manages Owner bank accounts for manual transfer", async () => {
    const {
      createBankAccount,
      listBankAccounts,
      toggleBankAccountStatus,
      deleteBankAccount,
    } = await import("@/lib/db/repositories/bank-accounts");

    const created = await createBankAccount(db(), {
      bankName: "BCA",
      accountNumber: "8820192831",
      accountHolder: "PT Undangan Digital",
      qrCodeUrl: "https://example.com/qris.png",
      instructions: "Sertakan nama agensi di berita",
    });

    expect(created.id).toBeDefined();
    expect(created.bankName).toBe("BCA");
    expect(created.isActive).toBe(true);

    const accounts = await listBankAccounts(db());
    expect(accounts.some((a) => a.id === created.id)).toBe(true);

    const toggled = await toggleBankAccountStatus(db(), created.id, false);
    expect(toggled.isActive).toBe(false);

    await deleteBankAccount(db(), created.id);
    const afterDelete = await listBankAccounts(db());
    expect(afterDelete.some((a) => a.id === created.id)).toBe(false);
  });

  it("processes manual transfer top-up requests (approve & reject)", async () => {
    const {
      createTopupRequest,
      listTopupRequests,
      approveTopupRequest,
      rejectTopupRequest,
    } = await import("@/lib/db/repositories/topup-requests");

    const reseller = await createResellerWithProfile(db(), {
      email: "topup-test@agency.test",
      name: "Topup Agency Owner",
      agencyName: "Topup Agency",
      slug: "topup-agency",
      whatsappContact: "628991234567",
      initialCredits: 5,
    });

    // 1. Reseller submits topup request
    const request1 = await createTopupRequest(db(), {
      resellerId: reseller.profile.id,
      creditAmount: 20,
      amountPaid: 200000,
      senderBank: "BCA",
      senderAccountName: "Budi Santoso",
      proofFileUrl: "https://example.test/proof1.jpg",
      notes: "Sudah transfer tadi siang",
    });

    expect(request1.status).toBe("pending");
    expect(request1.creditAmount).toBe(20);

    const pendingList = await listTopupRequests(db(), "pending");
    expect(pendingList.some((i) => i.request.id === request1.id)).toBe(true);

    // 2. Owner approves request1
    const approveResult = await approveTopupRequest(db(), {
      requestId: request1.id,
      reviewedBy: reseller.user.id,
      notes: "Dana masuk terverifikasi di BCA",
    });

    expect(approveResult.request.status).toBe("approved");
    expect(approveResult.profile.creditQuota).toBe(25); // 5 initial + 20 topup
    expect(approveResult.transaction.amount).toBe(20);
    expect(approveResult.transaction.balanceBefore).toBe(5);
    expect(approveResult.transaction.balanceAfter).toBe(25);

    // 3. Reseller submits request2
    const request2 = await createTopupRequest(db(), {
      resellerId: reseller.profile.id,
      creditAmount: 50,
      amountPaid: 500000,
      senderBank: "Mandiri",
      senderAccountName: "Budi Santoso",
      proofFileUrl: "https://example.test/proof2.jpg",
    });

    // 4. Owner rejects request2
    const rejectResult = await rejectTopupRequest(db(), {
      requestId: request2.id,
      rejectionReason: "Mutasi tidak ditemukan di rekening",
      reviewedBy: reseller.user.id,
    });

    expect(rejectResult.status).toBe("rejected");
    expect(rejectResult.rejectionReason).toBe("Mutasi tidak ditemukan di rekening");
  });
});
