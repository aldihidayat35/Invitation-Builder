import "server-only";

import { eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/authorization";
import { ForbiddenError } from "@/lib/auth/errors";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { findInvitationById } from "@/lib/db/repositories/invitations";
import {
  findCustomerOrderById,
  findCustomerOrderByInvitationId,
  insertOrderWorkflowEvent,
  linkCustomerOrderInvitation,
  listOrderWorkflowEvents,
  transitionCustomerOrderProduction,
  transitionCustomerOrderStatus,
  updateCustomerOrder,
} from "@/lib/db/repositories/orders";
import {
  findResellerProfileById,
  findResellerProfileByUserId,
} from "@/lib/db/repositories/resellers";
import { findTemplateById, findTemplateVersion } from "@/lib/db/repositories/templates";
import { findUserById } from "@/lib/db/repositories/users";
import {
  ensureWorkspaceMember,
  findWorkspaceById,
  getMemberRole,
} from "@/lib/db/repositories/workspaces";
import { users } from "@/lib/db/schema";
import type { CustomerOrder, OrderWorkflowEvent } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import type { CustomerOrderStatus, PaymentStatus, ProductionStatus } from "@/lib/schema/domain";
import { createInvitation } from "@/features/invitations/service";

export class OrderWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderWorkflowError";
  }
}

const ORDER_TRANSITIONS: Readonly<Record<CustomerOrderStatus, readonly CustomerOrderStatus[]>> = {
  new: ["qualified", "cancelled"],
  qualified: ["accepted", "rejected", "cancelled"],
  accepted: ["cancelled"],
  rejected: [],
  cancelled: [],
  completed: [],
};

const PRODUCTION_TRANSITIONS: Readonly<Record<ProductionStatus, readonly ProductionStatus[]>> = {
  awaiting_client: ["in_production"],
  in_production: ["client_review"],
  client_review: [],
  revision_requested: ["in_production", "client_review"],
  approved: [],
  published: [],
};

async function assertOrderAccess(db: Database, actor: Actor, order: CustomerOrder): Promise<void> {
  if (actor.systemRole === "owner") return;
  if (actor.systemRole === "client" && order.clientUserId === actor.userId) return;
  if (actor.systemRole === "reseller") {
    const profile = await findResellerProfileByUserId(db, actor.userId);
    if (profile?.id === order.sellerId && profile.isActive) return;
  }
  throw new ForbiddenError("Pesanan tidak tersedia untuk akun ini.");
}

function requirePlatformOwner(actor: Actor): void {
  if (actor.systemRole !== "owner") {
    throw new ForbiddenError("Tindakan produksi hanya dapat dilakukan oleh tim produksi.");
  }
}

export interface OrderDetailModel {
  order: CustomerOrder;
  seller: { id: string; agencyName: string; slug: string };
  client: { id: string; name: string; email: string } | null;
  workspace: { id: string; name: string; slug: string } | null;
  assignee: { id: string; name: string; email: string } | null;
  template: { id: string; name: string; versionNo: number | null } | null;
  invitation: { id: string; title: string; slug: string; status: string } | null;
  events: OrderWorkflowEvent[];
}

export async function getOrderDetail(
  db: Database,
  actor: Actor,
  orderId: string,
): Promise<OrderDetailModel> {
  const order = await findCustomerOrderById(db, orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  await assertOrderAccess(db, actor, order);

  const [seller, client, workspace, assignee, template, invitation, events] = await Promise.all([
    findResellerProfileById(db, order.sellerId),
    order.clientUserId ? findUserById(db, order.clientUserId) : undefined,
    order.workspaceId ? findWorkspaceById(db, order.workspaceId) : undefined,
    order.assignedTo ? findUserById(db, order.assignedTo) : undefined,
    order.templateId ? findTemplateById(db, order.templateId) : undefined,
    order.invitationId ? findInvitationById(db, order.invitationId) : undefined,
    listOrderWorkflowEvents(db, order.id),
  ]);
  if (!seller) throw new OrderWorkflowError("Seller pesanan tidak ditemukan.");

  return {
    order,
    seller: { id: seller.id, agencyName: seller.agencyName, slug: seller.slug },
    client: client ? { id: client.id, name: client.name, email: client.email } : null,
    workspace: workspace ? { id: workspace.id, name: workspace.name, slug: workspace.slug } : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
    template: template
      ? { id: template.id, name: template.name, versionNo: template.publishedVersionNo }
      : null,
    invitation: invitation
      ? {
          id: invitation.id,
          title: invitation.title,
          slug: invitation.slug,
          status: invitation.status,
        }
      : null,
    events,
  };
}

export async function transitionOrder(
  db: Database,
  actor: Actor,
  orderId: string,
  nextStatus: CustomerOrderStatus,
  note?: string,
): Promise<CustomerOrder> {
  const current = await findCustomerOrderById(db, orderId);
  if (!current) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  await assertOrderAccess(db, actor, current);
  if (actor.systemRole === "client") throw new ForbiddenError();
  if (
    actor.systemRole === "reseller" &&
    !(current.orderStatus === "new" && nextStatus === "qualified")
  ) {
    throw new ForbiddenError("Seller hanya dapat menandai pesanan baru sebagai terkualifikasi.");
  }
  if (!ORDER_TRANSITIONS[current.orderStatus].includes(nextStatus)) {
    throw new OrderWorkflowError(
      `Transisi ${current.orderStatus} ke ${nextStatus} tidak diperbolehkan.`,
    );
  }
  if ((nextStatus === "rejected" || nextStatus === "cancelled") && !note?.trim()) {
    throw new OrderWorkflowError("Alasan wajib diisi untuk penolakan atau pembatalan.");
  }

  return db.transaction(async (tx) => {
    const updated = await transitionCustomerOrderStatus(
      tx,
      orderId,
      current.orderStatus,
      nextStatus,
    );
    if (!updated) {
      throw new OrderWorkflowError("Status order telah berubah. Muat ulang halaman dan coba lagi.");
    }
    await insertOrderWorkflowEvent(tx, {
      orderId,
      actorId: actor.userId,
      eventType: "order.transition",
      fromValue: current.orderStatus,
      toValue: nextStatus,
      note,
    });
    await insertAuditLog(tx, {
      workspaceId: current.workspaceId,
      actorId: actor.userId,
      action: "order.transition",
      entityType: "customer_order",
      entityId: orderId,
      metadata: { from: current.orderStatus, to: nextStatus },
    });
    return updated;
  });
}

export async function getInvitationReviewState(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<{
  orderId: string;
  productionStatus: ProductionStatus;
  isClientReviewer: boolean;
} | null> {
  const order = await findCustomerOrderByInvitationId(db, invitationId);
  if (!order) return null;
  const isClientReviewer = actor.systemRole === "client" && order.clientUserId === actor.userId;
  if (actor.systemRole !== "owner" && !isClientReviewer) return null;
  return {
    orderId: order.id,
    productionStatus: order.productionStatus,
    isClientReviewer,
  };
}

export async function configureOrderProduction(
  db: Database,
  actor: Actor,
  input: {
    orderId: string;
    clientUserId: string;
    workspaceId: string;
    assigneeId: string;
    templateId: string;
    dueAt: Date;
    adminNotes?: string;
  },
): Promise<CustomerOrder> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, input.orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  if (order.orderStatus !== "accepted") {
    throw new OrderWorkflowError("Pesanan harus diterima sebelum produksi dikonfigurasi.");
  }
  const [client, assignee, workspace, clientRole, template] = await Promise.all([
    findUserById(db, input.clientUserId),
    findUserById(db, input.assigneeId),
    findWorkspaceById(db, input.workspaceId),
    getMemberRole(db, input.workspaceId, input.clientUserId),
    findTemplateById(db, input.templateId),
  ]);
  if (!client || client.systemRole !== "client" || client.status !== "active") {
    throw new OrderWorkflowError("Pilih akun klien aktif yang valid.");
  }
  if (!workspace || !clientRole) {
    throw new OrderWorkflowError("Workspace harus dimiliki atau diikuti oleh klien terpilih.");
  }
  if (!assignee || assignee.systemRole !== "owner" || assignee.status !== "active") {
    throw new OrderWorkflowError("Assignee produksi harus merupakan akun owner aktif.");
  }
  if (!template || !template.isPublic || template.publishedVersionNo === null) {
    throw new OrderWorkflowError("Pesanan belum memiliki master template publik yang terbit.");
  }
  const version = await findTemplateVersion(db, template.id, template.publishedVersionNo);
  if (!version) throw new OrderWorkflowError("Versi template terbit tidak ditemukan.");
  if (input.dueAt.getTime() <= Date.now()) {
    throw new OrderWorkflowError("Target produksi harus berada di masa mendatang.");
  }

  return db.transaction(async (tx) => {
    await ensureWorkspaceMember(tx, {
      workspaceId: workspace.id,
      userId: assignee.id,
      role: "admin",
    });
    const updated = await updateCustomerOrder(tx, order.id, {
      clientUserId: client.id,
      workspaceId: workspace.id,
      assignedTo: assignee.id,
      templateId: template.id,
      templateVersionId: version.id,
      dueAt: input.dueAt,
      adminNotes: input.adminNotes?.trim() || null,
    });
    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: "order.configure_production",
      toValue: "configured",
      metadata: {
        clientUserId: client.id,
        workspaceId: workspace.id,
        assigneeId: assignee.id,
        templateVersionId: version.id,
      },
    });
    await insertAuditLog(tx, {
      workspaceId: workspace.id,
      actorId: actor.userId,
      action: "order.configure_production",
      entityType: "customer_order",
      entityId: order.id,
      metadata: { assigneeId: assignee.id, templateVersionId: version.id },
    });
    return updated;
  });
}

export async function createProjectForOrder(
  db: Database,
  actor: Actor,
  orderId: string,
): Promise<{ order: CustomerOrder; invitationId: string }> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  if (order.invitationId) throw new OrderWorkflowError("Pesanan sudah memiliki proyek undangan.");
  if (
    order.orderStatus !== "accepted" ||
    !order.workspaceId ||
    !order.templateId ||
    !order.templateVersionId ||
    !order.assignedTo
  ) {
    throw new OrderWorkflowError("Konfigurasi produksi belum lengkap.");
  }
  if (order.assignedTo !== actor.userId) {
    throw new ForbiddenError("Hanya assignee produksi yang dapat membuat proyek order ini.");
  }

  return db.transaction(async (tx) => {
    const invitation = await createInvitation(tx, actor, {
      workspaceId: order.workspaceId!,
      templateId: order.templateId!,
      templateVersionId: order.templateVersionId!,
      title: order.groomBrideNames?.trim() || `Undangan ${order.customerName}`,
    });
    const next = await linkCustomerOrderInvitation(tx, order.id, invitation.id);
    if (!next) {
      throw new OrderWorkflowError(
        "Proyek order telah dibuat oleh proses lain. Muat ulang halaman.",
      );
    }
    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: "order.assign_invitation",
      fromValue: order.productionStatus,
      toValue: "in_production",
      metadata: { invitationId: invitation.id },
    });
    return { order: next, invitationId: invitation.id };
  });
}

export async function transitionProduction(
  db: Database,
  actor: Actor,
  orderId: string,
  nextStatus: ProductionStatus,
  note?: string,
): Promise<CustomerOrder> {
  requirePlatformOwner(actor);
  const current = await findCustomerOrderById(db, orderId);
  if (!current) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  if (!PRODUCTION_TRANSITIONS[current.productionStatus].includes(nextStatus)) {
    throw new OrderWorkflowError(
      `Transisi produksi ${current.productionStatus} ke ${nextStatus} tidak diperbolehkan.`,
    );
  }
  return db.transaction(async (tx) => {
    const updated = await transitionCustomerOrderProduction(
      tx,
      orderId,
      current.productionStatus,
      nextStatus,
    );
    if (!updated) {
      throw new OrderWorkflowError(
        "Status produksi telah berubah. Muat ulang halaman dan coba lagi.",
      );
    }
    await insertOrderWorkflowEvent(tx, {
      orderId,
      actorId: actor.userId,
      eventType: "production.transition",
      fromValue: current.productionStatus,
      toValue: nextStatus,
      note,
    });
    return updated;
  });
}

export async function submitClientDecision(
  db: Database,
  actor: Actor,
  invitationId: string,
  decision: "approve" | "request_revision",
  note?: string,
): Promise<CustomerOrder> {
  const order = await findCustomerOrderByInvitationId(db, invitationId);
  if (!order || order.clientUserId !== actor.userId || actor.systemRole !== "client") {
    throw new ForbiddenError("Keputusan hanya dapat diberikan oleh klien pemilik order.");
  }
  if (order.productionStatus !== "client_review") {
    throw new OrderWorkflowError("Undangan belum berada pada tahap review klien.");
  }
  if (decision === "request_revision" && !note?.trim()) {
    throw new OrderWorkflowError("Catatan revisi wajib diisi.");
  }
  const nextStatus: ProductionStatus = decision === "approve" ? "approved" : "revision_requested";
  return db.transaction(async (tx) => {
    const updated = await transitionCustomerOrderProduction(
      tx,
      order.id,
      order.productionStatus,
      nextStatus,
    );
    if (!updated) {
      throw new OrderWorkflowError(
        "Status review telah berubah. Muat ulang halaman dan coba lagi.",
      );
    }
    const action = decision === "approve" ? "order.client_approve" : "order.revision_requested";
    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: action,
      fromValue: order.productionStatus,
      toValue: nextStatus,
      note,
    });
    await insertAuditLog(tx, {
      workspaceId: order.workspaceId,
      actorId: actor.userId,
      action,
      entityType: "customer_order",
      entityId: order.id,
      metadata: { invitationId },
    });
    return updated;
  });
}

export async function updatePaymentStatus(
  db: Database,
  actor: Actor,
  orderId: string,
  paymentStatus: PaymentStatus,
  note?: string,
): Promise<CustomerOrder> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  return db.transaction(async (tx) => {
    const updated = await updateCustomerOrder(tx, orderId, { paymentStatus });
    await insertOrderWorkflowEvent(tx, {
      orderId,
      actorId: actor.userId,
      eventType: "order.payment_update",
      fromValue: order.paymentStatus,
      toValue: paymentStatus,
      note,
    });
    return updated;
  });
}

export async function assertApprovedForPublish(
  db: Database,
  actor: Actor,
  invitationId: string,
): Promise<CustomerOrder | undefined> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderByInvitationId(db, invitationId);
  if (order && order.productionStatus !== "approved" && order.productionStatus !== "published") {
    throw new OrderWorkflowError("Undangan order belum disetujui oleh klien.");
  }
  return order;
}

export async function markOrderPublished(
  db: Database,
  actor: Actor,
  order: CustomerOrder,
): Promise<void> {
  await db.transaction(async (tx) => {
    await updateCustomerOrder(tx, order.id, {
      productionStatus: "published",
      orderStatus: "completed",
      completedAt: new Date(),
    });
    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: "production.published",
      fromValue: order.productionStatus,
      toValue: "published",
    });
  });
}

export async function listProductionUsers(
  db: Database,
): Promise<Array<{ id: string; name: string; email: string }>> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.systemRole, "owner"));
}
