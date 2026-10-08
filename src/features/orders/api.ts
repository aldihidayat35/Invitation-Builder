import "server-only";

import { requireOwner, requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { listPublicTemplates } from "@/lib/db/repositories/templates";
import { listUsersByRole } from "@/lib/db/repositories/users";
import { listMemberships } from "@/lib/db/repositories/workspaces";
import type { CustomerOrderStatus, PaymentStatus, ProductionStatus } from "@/lib/schema/domain";
import * as service from "./service";

function actorOf(user: Awaited<ReturnType<typeof requireUser>>) {
  return { userId: user.id, systemRole: user.systemRole };
}

export async function getOrder(orderId: string) {
  const user = await requireUser();
  return service.getOrderDetail(await getDb(), actorOf(user), orderId);
}

export async function changeOrderStatus(
  orderId: string,
  nextStatus: CustomerOrderStatus,
  note?: string,
) {
  const user = await requireUser();
  return service.transitionOrder(await getDb(), actorOf(user), orderId, nextStatus, note);
}

export async function configureProduction(input: {
  orderId: string;
  clientUserId: string;
  workspaceId: string;
  assigneeId: string;
  templateId: string;
  dueAt: Date;
  adminNotes?: string;
}) {
  const user = await requireOwner();
  return service.configureOrderProduction(await getDb(), actorOf(user), input);
}

export async function createOrderProject(orderId: string) {
  const user = await requireOwner();
  return service.createProjectForOrder(await getDb(), actorOf(user), orderId);
}

export async function changeProductionStatus(
  orderId: string,
  nextStatus: ProductionStatus,
  note?: string,
) {
  const user = await requireOwner();
  return service.transitionProduction(await getDb(), actorOf(user), orderId, nextStatus, note);
}

export async function changePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  note?: string,
) {
  const user = await requireOwner();
  return service.updatePaymentStatus(await getDb(), actorOf(user), orderId, paymentStatus, note);
}

export async function decideInvitationReview(
  invitationId: string,
  decision: "approve" | "request_revision",
  note?: string,
) {
  const user = await requireUser();
  return service.submitClientDecision(await getDb(), actorOf(user), invitationId, decision, note);
}

export async function getInvitationReview(invitationId: string) {
  const user = await requireUser();
  return service.getInvitationReviewState(await getDb(), actorOf(user), invitationId);
}

export async function getProductionSetupOptions() {
  await requireOwner();
  const db = await getDb();
  const [clients, assignees, templates] = await Promise.all([
    listUsersByRole(db, "client"),
    service.listProductionUsers(db),
    listPublicTemplates(db),
  ]);
  const clientOptions = await Promise.all(
    clients
      .filter((client) => client.status === "active")
      .map(async (client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        workspaces: (await listMemberships(db, client.id)).map((membership) => ({
          id: membership.workspace.id,
          name: membership.workspace.name,
        })),
      })),
  );
  return {
    clients: clientOptions,
    assignees,
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      versionNo: template.publishedVersionNo,
    })),
  };
}

export { OrderWorkflowError } from "./service";
