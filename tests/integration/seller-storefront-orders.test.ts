// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeUser } from "../helpers/world";
import { createWorkspaceWithOwner } from "@/lib/db/repositories/workspaces";
import {
  createResellerWithProfile,
  findResellerProfileBySlug,
  findResellerProfileByCustomDomain,
} from "@/lib/db/repositories/resellers";
import {
  createCustomerOrder,
  listOrdersBySeller,
  listAllOrders,
  updateCustomerOrder,
} from "@/lib/db/repositories/orders";
import {
  createInvitation,
  invitationPermissions,
  publishInvitation,
  saveInvitationData,
} from "@/features/invitations/service";
import {
  archiveTemplate,
  createTemplate,
  publishTemplate,
  templatePermissions,
} from "@/features/templates/service";
import { ForbiddenError } from "@/lib/auth/errors";
import {
  activateResellerDomainTls,
  DOMAIN_TXT_PREFIX,
  verifyResellerDomain,
} from "@/features/reseller/domain-service";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Seller Storefront, Order Intake & Admin Authority Lock", () => {
  it("resolves seller profile by slug or custom domain for public storefront", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "storefront-owner@agency.test",
      name: "Storefront Owner",
      agencyName: "Berkah Wedding Store",
      slug: "berkah-store",
      whatsappContact: "628123456789",
      customDomain: "undangan.berkahwedding.com",
    });

    // Lookup by slug
    const bySlug = await findResellerProfileBySlug(db(), "berkah-store");
    expect(bySlug).toBeDefined();
    expect(bySlug?.agencyName).toBe("Berkah Wedding Store");

    // Domain is intentionally unavailable until ownership and TLS are verified.
    expect(
      await findResellerProfileByCustomDomain(db(), "undangan.berkahwedding.com"),
    ).toBeUndefined();
    const verified = await verifyResellerDomain(
      db(),
      { userId: reseller.user.id, systemRole: "reseller" },
      reseller.profile.id,
      {
        resolveTxt: async () => [
          [`${DOMAIN_TXT_PREFIX}${reseller.profile.domainVerificationToken}`],
        ],
      },
    );
    expect(verified.domainStatus).toBe("verified");
    await activateResellerDomainTls(
      db(),
      { userId: crypto.randomUUID(), systemRole: "owner" },
      reseller.profile.id,
    );

    // Lookup by custom domain after controlled activation.
    const byDomain = await findResellerProfileByCustomDomain(db(), "undangan.berkahwedding.com");
    expect(byDomain).toBeDefined();
    expect(byDomain?.id).toBe(reseller.profile.id);
  });

  it("records customer order through storefront and allows Admin to process it", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "order-flow@agency.test",
      name: "Order Flow Seller",
      agencyName: "Flow Wedding",
      slug: "flow-wedding",
      whatsappContact: "62899887766",
    });

    // 1. Customer submits order via seller's storefront
    const order = await createCustomerOrder(db(), {
      sellerId: reseller.profile.id,
      customerName: "Ananda Pratama",
      customerEmail: "ananda@test.com",
      customerWhatsapp: "081234567890",
      groomBrideNames: "Ananda & Dinda",
      eventDate: new Date("2026-11-20"),
      eventLocation: "Gedung Pernikahan Jakarta",
      notes: "Tolong font bernuansa emas",
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("new");
    expect(order.customerName).toBe("Ananda Pratama");
    expect(order.groomBrideNames).toBe("Ananda & Dinda");

    // 2. Seller sees order in their list
    const sellerOrders = await listOrdersBySeller(db(), reseller.profile.id);
    expect(sellerOrders.length).toBe(1);
    expect(sellerOrders[0]?.id).toBe(order.id);

    // 3. Admin queries all orders and changes status to in_progress
    const allOrders = await listAllOrders(db());
    expect(allOrders.some((item) => item.order.id === order.id)).toBe(true);

    const updated = await updateCustomerOrder(db(), order.id, {
      status: "in_progress",
      adminNotes: "Desain sedang dibuat di kanvas visual",
    });
    expect(updated.status).toBe("in_progress");

    // 4. Admin links created invitation and marks completed
    const completed = await updateCustomerOrder(db(), order.id, {
      status: "completed",
    });
    expect(completed.status).toBe("completed");
  });

  it("enforces Admin Authority Lock: Seller is strictly read-only on invitations and templates", async () => {
    const adminUser = await makeUser(db(), "super-admin");
    const adminWs = await createWorkspaceWithOwner(db(), {
      name: "Admin Platform Workspace",
      slug: "admin-platform-ws",
      ownerUserId: adminUser.id,
    });

    const template = await createTemplate(
      db(),
      { userId: adminUser.id },
      {
        workspaceId: adminWs.id,
        name: "Platform Template",
        document: fullDocument(),
      },
    );
    await publishTemplate(
      db(),
      { userId: adminUser.id },
      {
        templateId: template.id,
        expectedRevision: template.revision,
      },
    );

    const reseller = await createResellerWithProfile(db(), {
      email: "mitra-lock@test.com",
      name: "Mitra Lock",
      agencyName: "Lock Wedding",
      slug: "lock-wedding",
      whatsappContact: "62811122233",
    });

    // 1. Admin creates invitation in workspace
    const invitation = await createInvitation(
      db(),
      { userId: adminUser.id, systemRole: "owner" },
      {
        workspaceId: template.workspaceId,
        templateId: template.id,
        title: "Pernikahan Ananda & Dinda",
      },
    );

    expect(invitation.id).toBeDefined();

    // 2. Verify reseller has write: false in invitationPermissions
    const resellerPerms = await invitationPermissions(
      db(),
      { userId: reseller.user.id, systemRole: "reseller" },
      template.workspaceId,
    );
    expect(resellerPerms.write).toBe(false);

    // 3. Verify reseller has write/publish/archive: false in templatePermissions
    const tplPerms = await templatePermissions(
      db(),
      { userId: reseller.user.id, systemRole: "reseller" },
      template.workspaceId,
    );
    expect(tplPerms.write).toBe(false);
    expect(tplPerms.publish).toBe(false);
    expect(tplPerms.archive).toBe(false);

    const sellerOwnedTemplate = await createTemplate(
      db(),
      { userId: reseller.user.id },
      {
        workspaceId: reseller.workspace.id,
        name: "Seller Owned Template",
        document: fullDocument(),
      },
    );
    await expect(
      archiveTemplate(
        db(),
        { userId: reseller.user.id, systemRole: "reseller" },
        sellerOwnedTemplate.id,
      ),
    ).rejects.toThrow(ForbiddenError);

    // 4. Verify reseller trying to update invitation data is blocked by ForbiddenError
    await expect(
      saveInvitationData(
        db(),
        { userId: reseller.user.id, systemRole: "reseller" },
        {
          invitationId: invitation.id,
          values: { couple_names: "Hacked by Seller" },
        },
      ),
    ).rejects.toThrow(ForbiddenError);

    // 5. Verify Admin can update and publish without quota restriction
    const REQUIRED_DATA = {
      "couple.bride.fullName": "Siti Nurhaliza",
      "couple.groom.fullName": "Ahmad Fauzi",
      "event.ceremony.startAt": "2027-05-20T09:00",
      "venue.name": "Grand Ballroom Hotel Harmoni",
      "venue.address": "Jl. Gatot Subroto No. 45, Jakarta",
    };

    const adminSaved = await saveInvitationData(
      db(),
      { userId: adminUser.id, systemRole: "owner" },
      {
        invitationId: invitation.id,
        values: REQUIRED_DATA,
      },
    );
    expect(adminSaved.invitation).toBeDefined();

    const published = await publishInvitation(
      db(),
      { userId: adminUser.id, systemRole: "owner" },
      invitation.id,
    );
    expect(published.active).toBe(true);
    expect(published.revisionNo).toBe(1);
  });
});
