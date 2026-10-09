// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { seedDev } from "@/lib/db/seed";
import { templates } from "@/lib/db/schema";
import { createCustomerOrder } from "@/lib/db/repositories/orders";
import { findResellerProfileByUserId } from "@/lib/db/repositories/resellers";
import { getTemplate, publishTemplate } from "@/features/templates/service";
import {
  addGuestByClientToken,
  archiveGuestByClientToken,
  configureOrderProduction,
  createProjectForOrder,
  getClientPortalDataByToken,
  regenerateOrderClientToken,
  submitClientDecisionByToken,
  transitionOrder,
  transitionProduction,
} from "@/features/orders/service";
import { createMigratedDb } from "../helpers/db";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Client Portal Token Architecture (No Login Required)", () => {
  it("provides full portal workflow for couples using unguessable token", async () => {
    const seed = await seedDev(db());
    if (!seed.resellerUserId) throw new Error("Reseller actor missing");
    const seller = await findResellerProfileByUserId(db(), seed.resellerUserId);
    if (!seller) throw new Error("Seller profile missing");

    const owner = { userId: seed.userId, systemRole: "owner" as const };
    const sellerActor = { userId: seed.resellerUserId, systemRole: "reseller" as const };

    const template = await getTemplate(db(), owner, seed.templateId);
    await publishTemplate(db(), owner, {
      templateId: template.id,
      expectedRevision: template.revision,
    });
    await db().update(templates).set({ isPublic: true }).where(eq(templates.id, template.id));

    // 1. Order created with auto-generated clientAccessToken
    const order = await createCustomerOrder(db(), {
      sellerId: seller.id,
      templateId: template.id,
      customerName: "Rian & Maya",
      customerEmail: "rian.maya@example.test",
      customerWhatsapp: "081299988877",
      groomBrideNames: "Rian & Maya",
    });

    expect(order.clientAccessToken).toBeDefined();
    expect(order.clientAccessToken).toMatch(/^c_[a-f0-9]{24}$/);

    const initialToken = order.clientAccessToken!;

    // 2. Fetch portal via token (no user session required)
    const portalInitial = await getClientPortalDataByToken(db(), initialToken);
    expect(portalInitial).not.toBeNull();
    expect(portalInitial?.order.customerName).toBe("Rian & Maya");
    expect(portalInitial?.invitation).toBeNull();

    // 3. Admin accepts and configures order for production without requiring client account
    await transitionOrder(db(), sellerActor, order.id, "qualified");
    await transitionOrder(db(), owner, order.id, "accepted");

    await configureOrderProduction(db(), owner, {
      orderId: order.id,
      workspaceId: seed.workspaceId,
      assigneeId: seed.userId,
      templateId: template.id,
      dueAt: new Date(Date.now() + 86_400_000),
      adminNotes: "Siapkan paket floral terracotta",
    });

    // 4. Create project -> invitation receives same clientAccessToken
    const project = await createProjectForOrder(db(), owner, order.id);
    expect(project.invitationId).toBeDefined();

    const portalWithProject = await getClientPortalDataByToken(db(), initialToken);
    expect(portalWithProject?.invitation).not.toBeNull();
    expect(portalWithProject?.invitation?.id).toBe(project.invitationId);
    expect(portalWithProject?.shareableUrl).toContain(portalWithProject?.invitation?.slug);

    // 5. Client adds guests via portal token
    const guest = await addGuestByClientToken(db(), initialToken, {
      name: "Bapak Surya & Keluarga",
      maxParty: 3,
    });
    expect(guest.name).toBe("Bapak Surya & Keluarga");
    expect(guest.maxParty).toBe(3);
    expect(guest.tokenId).toBeDefined();

    const portalWithGuest = await getClientPortalDataByToken(db(), initialToken);
    expect(portalWithGuest?.guests.length).toBe(1);
    expect(portalWithGuest?.guests[0]?.name).toBe("Bapak Surya & Keluarga");

    // 6. Client archives guest via portal token
    await archiveGuestByClientToken(db(), initialToken, guest.id);
    const portalAfterArchive = await getClientPortalDataByToken(db(), initialToken);
    expect(portalAfterArchive?.guests.length).toBe(0);

    // 7. Client review workflow
    await transitionProduction(db(), owner, order.id, "client_review");

    // Request revision via token
    const revOrder = await submitClientDecisionByToken(
      db(),
      initialToken,
      "request_revision",
      "Mohon ubah jam akad nikah menjadi 09:00 WIB",
    );
    expect(revOrder.productionStatus).toBe("revision_requested");

    // Resume production and send back to review
    await transitionProduction(db(), owner, order.id, "in_production");
    await transitionProduction(db(), owner, order.id, "client_review");

    // Approve via token
    const appOrder = await submitClientDecisionByToken(db(), initialToken, "approve");
    expect(appOrder.productionStatus).toBe("approved");

    // 8. Admin regenerates token
    const newToken = await regenerateOrderClientToken(db(), owner, order.id);
    expect(newToken).not.toBe(initialToken);
    expect(newToken).toMatch(/^c_[a-f0-9]{24}$/);

    // Old token is now invalid
    const oldPortal = await getClientPortalDataByToken(db(), initialToken);
    expect(oldPortal).toBeNull();

    // New token works and accesses the same project
    const newPortal = await getClientPortalDataByToken(db(), newToken);
    expect(newPortal).not.toBeNull();
    expect(newPortal?.order.id).toBe(order.id);
    expect(newPortal?.invitation?.id).toBe(project.invitationId);
  });
});
