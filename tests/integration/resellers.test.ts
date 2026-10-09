// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  createResellerClient,
  createResellerWithProfile,
  findResellerProfileBySlug,
  findResellerProfileByUserId,
  updateResellerStatus,
  updateResellerBranding,
} from "@/lib/db/repositories/resellers";
import {
  createCustomerOrder,
  listOrdersBySeller,
  getSellerOrderStats,
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

describe("Reseller & Order Management Model", () => {
  it("provisions a reseller with dedicated workspace and profile", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "partner@agency.test",
      name: "Partner Admin",
      agencyName: "Royal Wedding Media",
      slug: "royal-wedding",
      whatsappContact: "62899112233",
    });

    expect(res.user.systemRole).toBe("reseller");
    expect(res.profile.agencyName).toBe("Royal Wedding Media");
    expect(res.profile.slug).toBe("royal-wedding");
    expect(res.workspace.slug).toBe("agency-royal-wedding");

    // Verify lookup helpers
    const byUserId = await findResellerProfileByUserId(db(), res.user.id);
    expect(byUserId?.id).toBe(res.profile.id);

    const bySlug = await findResellerProfileBySlug(db(), "royal-wedding");
    expect(bySlug?.id).toBe(res.profile.id);
  });

  it("receives customer orders and calculates seller order stats", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "orders@agency.test",
      name: "Orders Admin",
      agencyName: "Orders Agency",
      slug: "orders-agency",
      whatsappContact: "62812345678",
    });

    // 1. Submit order 1
    const order1 = await createCustomerOrder(db(), {
      sellerId: res.profile.id,
      customerName: "Rian Syahputra",
      customerEmail: "rian@example.com",
      customerWhatsapp: "08123456789",
      groomBrideNames: "Rian & Aisyah",
      notes: "Tema adat Sunda",
    });

    expect(order1.status).toBe("new");
    expect(order1.customerName).toBe("Rian Syahputra");

    // 2. Submit order 2
    const order2 = await createCustomerOrder(db(), {
      sellerId: res.profile.id,
      customerName: "Budi Santoso",
      customerEmail: "budi@example.com",
      customerWhatsapp: "08987654321",
    });

    expect(order2.status).toBe("new");

    // 3. List orders for seller
    const sellerOrders = await listOrdersBySeller(db(), res.profile.id);
    expect(sellerOrders.length).toBe(2);

    // 4. Check statistics
    const stats = await getSellerOrderStats(db(), res.profile.id);
    expect(stats.totalOrders).toBe(2);
    expect(stats.newOrders).toBe(2);
    expect(stats.inProgressOrders).toBe(0);
    expect(stats.completedOrders).toBe(0);
  });

  it("provisions end-user clients under a reseller and verifies affiliation", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "host@agency.test",
      name: "Host Admin",
      agencyName: "Host Agency",
      slug: "host-agency",
      whatsappContact: "62855566677",
    });

    const clientRes = await createResellerClient(db(), {
      resellerUserId: res.user.id,
      clientName: "Budi Santoso",
      clientEmail: "budi@client.test",
      workspaceName: "Budi & Ani Wedding",
      workspaceSlug: "budi-ani-wedding",
    });

    expect(clientRes.clientUser.systemRole).toBe("client");
    expect(clientRes.clientUser.resellerId).toBe(res.user.id);
    expect(clientRes.workspace.name).toBe("Budi & Ani Wedding");

    // Verify lookup by reseller
    const clients = await listUsersByReseller(db(), res.user.id);
    expect(clients.length).toBe(1);
    expect(clients[0]?.id).toBe(clientRes.clientUser.id);
    expect(clients[0]?.name).toBe("Budi Santoso");
  });

  it("updates reseller branding and toggles status", async () => {
    const res = await createResellerWithProfile(db(), {
      email: "branding@agency.test",
      name: "Branding Admin",
      agencyName: "Branding Agency",
      slug: "branding-agency",
      whatsappContact: "62811122233",
    });

    const updated = await updateResellerBranding(db(), res.profile.id, {
      agencyName: "Branding Agency Pro",
      brandColor: "#84633f",
      customDomain: "undangan.brandingpro.com",
    });

    expect(updated.agencyName).toBe("Branding Agency Pro");
    expect(updated.brandColor).toBe("#84633f");
    expect(updated.customDomain).toBe("undangan.brandingpro.com");

    const toggled = await updateResellerStatus(db(), res.profile.id, false);
    expect(toggled.isActive).toBe(false);
  });
});
