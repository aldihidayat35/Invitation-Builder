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
  createCustomerOrder,
  listOrdersBySeller,
} from "@/lib/db/repositories/orders";
import { listUsersByReseller } from "@/lib/db/repositories/users";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Reseller Agency Portal & Storefront Orders", () => {
  it("provisions reseller and queries profile", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "reseller-p3@agency.test",
      name: "Reseller P3",
      agencyName: "Berkah Agency P3",
      slug: "berkah-agency-p3",
      whatsappContact: "628123456789",
    });

    expect(res.user.systemRole).toBe("reseller");

    const fetched = await findResellerProfileByUserId(db(), res.user.id);
    expect(fetched).toBeDefined();
    expect(fetched?.agencyName).toBe("Berkah Agency P3");
  });

  it("submits customer order requests and isolates by reseller", async () => {
    // 1. Create 2 separate resellers
    const resellerA = await createResellerWithProfile(db(), {
      email: "agency-a@test.com",
      name: "Agency A",
      agencyName: "Agency A",
      slug: "agency-a",
      whatsappContact: "6281111111",
    });

    const resellerB = await createResellerWithProfile(db(), {
      email: "agency-b@test.com",
      name: "Agency B",
      agencyName: "Agency B",
      slug: "agency-b",
      whatsappContact: "6282222222",
    });

    // 2. Customer submits order via Storefront A
    const orderA = await createCustomerOrder(db(), {
      sellerId: resellerA.profile.id,
      customerName: "Customer A",
      customerEmail: "cust-a@test.com",
      customerWhatsapp: "6281234444",
      notes: "Paket Tema Elegant",
    });

    expect(orderA.status).toBe("new");

    // 3. Customer submits order via Storefront B
    const orderB = await createCustomerOrder(db(), {
      sellerId: resellerB.profile.id,
      customerName: "Customer B",
      customerEmail: "cust-b@test.com",
      customerWhatsapp: "6285678888",
    });

    // 4. Query customer orders for Reseller A only
    const ordersA = await listOrdersBySeller(db(), resellerA.profile.id);
    expect(ordersA.length).toBe(1);
    expect(ordersA[0]?.id).toBe(orderA.id);
    expect(ordersA[0]?.customerName).toBe("Customer A");

    // Query for Reseller B only
    const ordersB = await listOrdersBySeller(db(), resellerB.profile.id);
    expect(ordersB.length).toBe(1);
    expect(ordersB[0]?.id).toBe(orderB.id);
    expect(ordersB[0]?.customerName).toBe("Customer B");
  });

  it("creates clients under reseller and enforces agency affiliation", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "agency-clients@test.com",
      name: "Agency Clients",
      agencyName: "Agency Clients",
      slug: "agency-clients",
      whatsappContact: "6283333333",
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
    });

    const updated = await updateResellerBranding(db(), reseller.profile.id, {
      agencyName: "Branding Agency New",
      whatsappContact: "6289999999",
      logoUrl: "https://example.com/new-logo.png",
      brandColor: "#10b981",
      customDomain: "undangan.brandingnew.com",
    });

    expect(updated.agencyName).toBe("Branding Agency New");
    expect(updated.whatsappContact).toBe("6289999999");
    expect(updated.logoUrl).toBe("https://example.com/new-logo.png");
    expect(updated.brandColor).toBe("#10b981");
    expect(updated.customDomain).toBe("undangan.brandingnew.com");
  });
});
