// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  adjustResellerCredit,
  createResellerClient,
  createResellerWithProfile,
  findResellerProfileById,
  findResellerProfileBySlug,
  findResellerProfileByUserId,
  listCreditTransactions,
  listResellers,
} from "@/lib/db/repositories/resellers";
import { findUserByEmail, listUsersByReseller } from "@/lib/db/repositories/users";
import { seedDev } from "@/lib/db/seed";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;

const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Reseller & Credit Management (Phase 1)", () => {
  it("provisions a reseller with dedicated workspace and initial credit grant", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "partner@agency.test",
      name: "Partner Admin",
      agencyName: "Royal Wedding Media",
      slug: "royal-wedding",
      whatsappContact: "62899112233",
      initialCredits: 15,
    });

    expect(res.user.systemRole).toBe("reseller");
    expect(res.profile.agencyName).toBe("Royal Wedding Media");
    expect(res.profile.slug).toBe("royal-wedding");
    expect(res.profile.creditQuota).toBe(15);
    expect(res.workspace.slug).toBe("agency-royal-wedding");

    // Verify lookup helpers
    const byUserId = await findResellerProfileByUserId(db(), res.user.id);
    expect(byUserId?.id).toBe(res.profile.id);

    const bySlug = await findResellerProfileBySlug(db(), "royal-wedding");
    expect(bySlug?.id).toBe(res.profile.id);

    // Verify initial credit transaction recorded
    const history = await listCreditTransactions(db(), res.profile.id);
    expect(history.length).toBe(1);
    expect(history[0]?.type).toBe("owner_grant");
    expect(history[0]?.amount).toBe(15);
    expect(history[0]?.balanceBefore).toBe(0);
    expect(history[0]?.balanceAfter).toBe(15);
  });

  it("adjusts credit quota atomically and writes to ledger", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "credits@agency.test",
      name: "Credits Admin",
      agencyName: "Credits Agency",
      slug: "credits-agency",
      whatsappContact: "62812345678",
      initialCredits: 10,
    });

    // 1. Deduct 1 credit (e.g. publish invitation)
    const deductRes = await adjustResellerCredit(db(), {
      resellerProfileId: res.profile.id,
      amount: -1,
      type: "publish_deduct",
      referenceId: "inv-uuid-1",
      notes: "Publishing invitation #1",
    });

    expect(deductRes.profile.creditQuota).toBe(9);
    expect(deductRes.transaction.amount).toBe(-1);
    expect(deductRes.transaction.balanceBefore).toBe(10);
    expect(deductRes.transaction.balanceAfter).toBe(9);

    // 2. Top-up 5 credits
    const topupRes = await adjustResellerCredit(db(), {
      resellerProfileId: res.profile.id,
      amount: 5,
      type: "purchase_topup",
      referenceId: "topup-invoice-99",
      notes: "Top-up package 5 credits",
    });

    expect(topupRes.profile.creditQuota).toBe(14);
    expect(topupRes.transaction.amount).toBe(5);
    expect(topupRes.transaction.balanceBefore).toBe(9);
    expect(topupRes.transaction.balanceAfter).toBe(14);

    // 3. Verify total ledger entries
    const transactions = await listCreditTransactions(db(), res.profile.id);
    expect(transactions.length).toBe(3); // Initial grant, deduct, top-up
    expect(transactions[0]?.type).toBe("purchase_topup");
    expect(transactions[1]?.type).toBe("publish_deduct");
    expect(transactions[2]?.type).toBe("owner_grant");
  });

  it("blocks credit deduction when balance is insufficient", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "zero@agency.test",
      name: "Zero Admin",
      agencyName: "Zero Credits Agency",
      slug: "zero-agency",
      whatsappContact: "62811122233",
      initialCredits: 2,
    });

    // Attempting to deduct 3 credits when only 2 exist should throw
    await expect(
      adjustResellerCredit(db(), {
        resellerProfileId: res.profile.id,
        amount: -3,
        type: "publish_deduct",
      }),
    ).rejects.toThrow(/Insufficient credit quota/);

    // Quota remains unchanged
    const unchanged = await findResellerProfileById(db(), res.profile.id);
    expect(unchanged?.creditQuota).toBe(2);
  });

  it("creates a client under a reseller with workspace isolation", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "boss@agency.test",
      name: "Boss Reseller",
      agencyName: "Mega Wedding",
      slug: "mega-wedding",
      whatsappContact: "62811111111",
      initialCredits: 5,
    });

    const client = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Budi Santoso",
      clientEmail: "budi@client.test",
      workspaceSlug: "budi-wedding-ws",
    });

    expect(client.clientUser.systemRole).toBe("client");
    expect(client.clientUser.resellerId).toBe(reseller.user.id);
    expect(client.workspace.slug).toBe("budi-wedding-ws");

    // Reseller can list its clients
    const clients = await listUsersByReseller(db(), reseller.user.id);
    expect(clients.length).toBe(1);
    expect(clients[0]?.id).toBe(client.clientUser.id);
  });

  it("seeds dev environment with owner and demo reseller", async () => {
    const seed = await seedDev(db());
    expect(seed.userId).toBeDefined();

    const owner = await findUserByEmail(db(), "dev@example.test");
    expect(owner?.systemRole).toBe("owner");

    const demoReseller = await findUserByEmail(db(), "reseller@example.test");
    expect(demoReseller?.systemRole).toBe("reseller");

    const resellerProfile = await findResellerProfileByUserId(db(), demoReseller!.id);
    expect(resellerProfile?.creditQuota).toBe(20);
    expect(resellerProfile?.slug).toBe("mitra-berkah");
  });
});
