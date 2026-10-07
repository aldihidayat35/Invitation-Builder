// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  createResellerClient,
  createResellerWithProfile,
  findResellerProfileByUserId,
  updateResellerBranding,
} from "@/lib/db/repositories/resellers";
import {
  createTopupRequest,
  listResellerTopupRequests,
} from "@/lib/db/repositories/topup-requests";
import { listUsersByReseller } from "@/lib/db/repositories/users";
import { createBankAccount } from "@/lib/db/repositories/bank-accounts";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Reseller Agency Portal (Phase 3)", () => {
  it("provisions reseller with initial credit and queries profile", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "reseller-p3@agency.test",
      name: "Reseller P3",
      agencyName: "Berkah Agency P3",
      slug: "berkah-agency-p3",
      whatsappContact: "628123456789",
      initialCredits: 30,
    });

    expect(res.user.systemRole).toBe("reseller");
    expect(res.profile.creditQuota).toBe(30);

    const fetched = await findResellerProfileByUserId(db(), res.user.id);
    expect(fetched).toBeDefined();
    expect(fetched?.agencyName).toBe("Berkah Agency P3");
  });

  it("submits manual transfer top-up request and isolates by reseller", async () => {
    // 1. Create bank account
    const bank = await createBankAccount(db(), {
      bankName: "BCA",
      accountNumber: "123456789",
      accountHolder: "Owner",
    });

    // 2. Create 2 separate resellers
    const resellerA = await createResellerWithProfile(db(), {
      email: "agency-a@test.com",
      name: "Agency A",
      agencyName: "Agency A",
      slug: "agency-a",
      whatsappContact: "6281111111",
      initialCredits: 10,
    });

    const resellerB = await createResellerWithProfile(db(), {
      email: "agency-b@test.com",
      name: "Agency B",
      agencyName: "Agency B",
      slug: "agency-b",
      whatsappContact: "6282222222",
      initialCredits: 5,
    });

    // 3. Reseller A submits topup request
    const reqA = await createTopupRequest(db(), {
      resellerId: resellerA.profile.id,
      creditAmount: 25,
      amountPaid: 325000,
      bankAccountId: bank.id,
      senderBank: "BCA",
      senderAccountName: "Owner Agency A",
      proofFileUrl: "https://example.com/proof-a.jpg",
      notes: "Paket Agensi 25 Undangan",
    });

    expect(reqA.status).toBe("pending");

    // 4. Reseller B submits topup request
    const reqB = await createTopupRequest(db(), {
      resellerId: resellerB.profile.id,
      creditAmount: 10,
      amountPaid: 150000,
      bankAccountId: bank.id,
      senderBank: "Mandiri",
      senderAccountName: "Owner Agency B",
      proofFileUrl: "https://example.com/proof-b.jpg",
    });

    // 5. Query topup requests for Reseller A only
    const requestsA = await listResellerTopupRequests(db(), resellerA.profile.id);
    expect(requestsA.length).toBe(1);
    expect(requestsA[0]?.request.id).toBe(reqA.id);
    expect(requestsA[0]?.bankAccount?.bankName).toBe("BCA");

    // Query for Reseller B only
    const requestsB = await listResellerTopupRequests(db(), resellerB.profile.id);
    expect(requestsB.length).toBe(1);
    expect(requestsB[0]?.request.id).toBe(reqB.id);
  });

  it("creates clients under reseller and enforces agency affiliation", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "agency-clients@test.com",
      name: "Agency Clients",
      agencyName: "Agency Clients",
      slug: "agency-clients",
      whatsappContact: "6283333333",
      initialCredits: 10,
    });

    // Create client 1
    const c1 = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Klien Rama & Shinta",
      clientEmail: "rama.shinta@test.com",
      workspaceSlug: "ws-rama-shinta",
    });

    expect(c1.clientUser.systemRole).toBe("client");
    expect(c1.clientUser.resellerId).toBe(reseller.user.id);

    // Create client 2
    const c2 = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Klien Budi & Ani",
      clientEmail: "budi.ani@test.com",
      workspaceSlug: "ws-budi-ani",
    });

    expect(c2.clientUser.resellerId).toBe(reseller.user.id);

    // List clients for reseller
    const clients = await listUsersByReseller(db(), reseller.user.id);
    expect(clients.length).toBe(2);
    expect(clients.map((c) => c.email)).toContain("rama.shinta@test.com");
    expect(clients.map((c) => c.email)).toContain("budi.ani@test.com");
  });

  it("updates reseller agency branding settings", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "agency-branding@test.com",
      name: "Branding Agency",
      agencyName: "Branding Agency Old",
      slug: "branding-agency",
      whatsappContact: "6284444444",
      initialCredits: 10,
    });

    const updated = await updateResellerBranding(db(), reseller.profile.id, {
      agencyName: "Branding Agency New",
      whatsappContact: "6289999999",
      logoUrl: "https://example.com/new-logo.png",
      brandColor: "#10b981",
    });

    expect(updated.agencyName).toBe("Branding Agency New");
    expect(updated.whatsappContact).toBe("6289999999");
    expect(updated.logoUrl).toBe("https://example.com/new-logo.png");
    expect(updated.brandColor).toBe("#10b981");
  });
});
