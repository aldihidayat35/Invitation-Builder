// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ForbiddenError } from "@/lib/auth/errors";
import { seedDev } from "@/lib/db/seed";
import { templates } from "@/lib/db/schema";
import { createCustomerOrder, listOrderWorkflowEvents } from "@/lib/db/repositories/orders";
import { findResellerProfileByUserId } from "@/lib/db/repositories/resellers";
import { listMemberships, getMemberRole } from "@/lib/db/repositories/workspaces";
import { getTemplate, publishTemplate } from "@/features/templates/service";
import { InvitationInputError, saveInvitationData } from "@/features/invitations/service";
import {
  adminApproveOrderProduction,
  adminSendOrderToReview,
  assertApprovedForPublish,
  configureOrderProduction,
  createProjectForOrder,
  getInvitationReviewState,
  OrderWorkflowError,
  submitClientDecision,
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

describe("Fase 1 order-to-production workflow", () => {
  it("enforces ownership, pins a template version, and requires client approval", async () => {
    const seed = await seedDev(db());
    if (!seed.resellerUserId || !seed.clientUserId) throw new Error("Demo actors missing");
    const seller = await findResellerProfileByUserId(db(), seed.resellerUserId);
    if (!seller) throw new Error("Seller profile missing");

    const owner = { userId: seed.userId, systemRole: "owner" };
    const sellerActor = { userId: seed.resellerUserId, systemRole: "reseller" };
    const client = { userId: seed.clientUserId, systemRole: "client" };
    const template = await getTemplate(db(), owner, seed.templateId);
    const published = await publishTemplate(db(), owner, {
      templateId: template.id,
      expectedRevision: template.revision,
    });
    await db().update(templates).set({ isPublic: true }).where(eq(templates.id, template.id));

    const order = await createCustomerOrder(db(), {
      sellerId: seller.id,
      templateId: template.id,
      customerName: "Klien Fase Satu",
      customerEmail: "fase1@example.test",
      customerWhatsapp: "08123456789",
      groomBrideNames: "Alya & Bima",
    });

    const qualified = await transitionOrder(db(), sellerActor, order.id, "qualified");
    expect(qualified.orderStatus).toBe("qualified");
    await expect(transitionOrder(db(), sellerActor, order.id, "accepted")).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    const accepted = await transitionOrder(db(), owner, order.id, "accepted");
    expect(accepted.acceptedAt).toBeInstanceOf(Date);
    const [clientMembership] = await listMemberships(db(), seed.clientUserId);
    if (!clientMembership) throw new Error("Client workspace missing");

    const configured = await configureOrderProduction(db(), owner, {
      orderId: order.id,
      clientUserId: seed.clientUserId,
      workspaceId: clientMembership.workspace.id,
      assigneeId: seed.userId,
      templateId: template.id,
      dueAt: new Date(Date.now() + 86_400_000),
      adminNotes: "Prioritas normal",
    });
    expect(configured.templateVersionId).toBe(published.id);
    expect(await getMemberRole(db(), clientMembership.workspace.id, seed.userId)).toBe("admin");

    const project = await createProjectForOrder(db(), owner, order.id);
    expect(project.order.productionStatus).toBe("in_production");
    await transitionProduction(db(), owner, order.id, "client_review");

    const review = await getInvitationReviewState(db(), client, project.invitationId);
    expect(review).toMatchObject({ productionStatus: "client_review", isClientReviewer: true });
    await expect(
      saveInvitationData(db(), owner, { invitationId: project.invitationId, values: {} }),
    ).rejects.toBeInstanceOf(InvitationInputError);
    await expect(
      submitClientDecision(db(), client, project.invitationId, "request_revision"),
    ).rejects.toBeInstanceOf(OrderWorkflowError);
    const revision = await submitClientDecision(
      db(),
      client,
      project.invitationId,
      "request_revision",
      "Perbaiki ejaan nama keluarga.",
    );
    expect(revision.productionStatus).toBe("revision_requested");
    await expect(
      saveInvitationData(db(), owner, { invitationId: project.invitationId, values: {} }),
    ).resolves.toBeDefined();
    await transitionProduction(db(), owner, order.id, "client_review");
    const approved = await submitClientDecision(db(), client, project.invitationId, "approve");
    expect(approved.productionStatus).toBe("approved");
    await expect(
      saveInvitationData(db(), owner, { invitationId: project.invitationId, values: {} }),
    ).rejects.toBeInstanceOf(InvitationInputError);

    const events = await listOrderWorkflowEvents(db(), order.id);
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "order.transition",
        "order.configure_production",
        "order.assign_invitation",
        "production.transition",
        "order.client_approve",
      ]),
    );
  });

  it("supports admin manual approval and enforces publish approval gate", async () => {
    const seed = await seedDev(db());
    const owner = { userId: seed.userId, systemRole: "owner" as const };
    const [clientMembership] = await listMemberships(db(), seed.clientUserId!);
    if (!clientMembership) throw new Error("Client workspace missing");
    const [template] = await db()
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.isPublic, true))
      .limit(1);
    if (!template) throw new Error("Template missing");

    const order = await createCustomerOrder(db(), {
      customerName: "Tes Admin Approval",
      customerWhatsapp: "081234567890",
      templateId: template.id,
    });
    await transitionOrder(db(), owner, order.id, "accepted");
    const project = await createProjectForOrder(db(), owner, order.id);

    // Initial state: in_production -> assertApprovedForPublish must throw
    await expect(assertApprovedForPublish(db(), owner, project.invitationId)).rejects.toThrow(
      "Undangan order belum disetujui oleh klien.",
    );

    // Admin sends to client review
    const inReview = await adminSendOrderToReview(db(), owner, order.id, "Kirim review ke klien");
    expect(inReview.productionStatus).toBe("client_review");
    await expect(assertApprovedForPublish(db(), owner, project.invitationId)).rejects.toThrow(
      "Undangan order belum disetujui oleh klien.",
    );

    // Admin manually approves (e.g. client confirmed via WhatsApp)
    const approved = await adminApproveOrderProduction(
      db(),
      owner,
      order.id,
      "Klien konfirmasi via WhatsApp",
    );
    expect(approved.productionStatus).toBe("approved");

    // Once approved, publish gate allows proceeding
    await expect(assertApprovedForPublish(db(), owner, project.invitationId)).resolves.toBeDefined();
  });
});
