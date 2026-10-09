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
  clientUserId?: string | null;
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

export async function changeOrderTemplate(orderId: string, templateId: string) {
  const user = await requireOwner();
  return service.changeOrderTemplate(await getDb(), actorOf(user), orderId, templateId);
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
  const [allWorkspaces, assignees, templates] = await Promise.all([
    db.query.workspaces.findMany({ orderBy: (w, { asc }) => [asc(w.name)] }),
    service.listProductionUsers(db),
    listPublicTemplates(db),
  ]);
  return {
    workspaces: allWorkspaces.map((w) => ({ id: w.id, name: w.name })),
    clients: [] as Array<{ id: string; name: string; email: string; workspaces: Array<{ id: string; name: string }> }>,
    assignees,
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      versionNo: template.publishedVersionNo,
    })),
  };
}

export async function getClientPortal(token: string) {
  return service.getClientPortalDataByToken(await getDb(), token);
}

export async function submitPortalDecision(
  token: string,
  decision: "approve" | "request_revision",
  note?: string,
) {
  return service.submitClientDecisionByToken(await getDb(), token, decision, note);
}

export async function addPortalGuest(
  token: string,
  input: { name: string; maxParty?: number },
) {
  return service.addGuestByClientToken(await getDb(), token, input);
}

export async function archivePortalGuest(
  token: string,
  guestId: string,
) {
  return service.archiveGuestByClientToken(await getDb(), token, guestId);
}

export async function regenerateOrderClientToken(orderId: string) {
  const user = await requireUser();
  return service.regenerateOrderClientToken(await getDb(), actorOf(user), orderId);
}

export { OrderWorkflowError } from "./service";
export type { ClientPortalData } from "./service";
