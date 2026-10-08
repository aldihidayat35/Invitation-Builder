// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  createResellerWithProfile,
  getAdminResellerStats,
  updateResellerStatus,
} from "@/lib/db/repositories/resellers";
import {
  createCustomerOrder,
  listAllOrders,
  updateCustomerOrder,
} from "@/lib/db/repositories/orders";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { getActorRole } from "@/lib/auth/server";
import { seedDev } from "@/lib/db/seed";
import { auditLogs, sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Super Admin & Order Authority Portal", () => {
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
    });

    expect(res.profile.isActive).toBe(true);

    await db()
      .insert(sessions)
      .values({
        userId: res.user.id,
        tokenHash: "seller-status-session",
        expiresAt: new Date(Date.now() + 60_000),
      });

    // Deactivate
    const deactivated = await updateResellerStatus(db(), res.profile.id, false);
    expect(deactivated.isActive).toBe(false);
    const [disabledUser] = await db().select().from(users).where(eq(users.id, res.user.id));
    expect(disabledUser?.status).toBe("disabled");
    expect(await db().select().from(sessions).where(eq(sessions.userId, res.user.id))).toHaveLength(
      0,
    );

    // Reactivate
    const reactivated = await updateResellerStatus(db(), res.profile.id, true);
    expect(reactivated.isActive).toBe(true);
    const [activeUser] = await db().select().from(users).where(eq(users.id, res.user.id));
    expect(activeUser?.status).toBe("active");
  });

  it("aggregates platform statistics for admin dashboard", async () => {
    // Seed dev first
    await seedDev(db());

    const stats = await getAdminResellerStats(db());
    expect(stats.totalResellers).toBeGreaterThanOrEqual(1);
    expect(stats.activeResellers).toBeGreaterThanOrEqual(1);
    expect(stats.totalOrders).toBeGreaterThanOrEqual(0);
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

    const logs = await db().select().from(auditLogs).where(eq(auditLogs.action, "reseller.create"));

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[logs.length - 1];
    expect(log?.actorId).toBe(seed.userId);
    expect(log?.entityType).toBe("reseller_profile");
  });

  it("processes customer orders: Admin lists orders and updates order status", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "orders-admin-test@agency.test",
      name: "Orders Agency Owner",
      agencyName: "Orders Agency",
      slug: "orders-agency-test",
      whatsappContact: "628991234567",
    });

    // 1. Customer submits order via seller
    const order1 = await createCustomerOrder(db(), {
      sellerId: reseller.profile.id,
      customerName: "Budi Santoso",
      customerEmail: "budi@test.com",
      customerWhatsapp: "081234567890",
      notes: "Tolong dibuatkan tema elegan",
    });

    expect(order1.status).toBe("new");

    // 2. Admin queries all orders
    const allOrders = await listAllOrders(db());
    expect(allOrders.some((item) => item.order.id === order1.id)).toBe(true);

    // 3. Admin updates status to in_progress
    const inProgressOrder = await updateCustomerOrder(db(), order1.id, {
      status: "in_progress",
      adminNotes: "Sedang dikerjakan oleh designer",
    });

    expect(inProgressOrder.status).toBe("in_progress");
    expect(inProgressOrder.adminNotes).toBe("Sedang dikerjakan oleh designer");

    // 4. Admin finishes order
    const completedOrder = await updateCustomerOrder(db(), order1.id, {
      status: "completed",
    });

    expect(completedOrder.status).toBe("completed");
  });
});
