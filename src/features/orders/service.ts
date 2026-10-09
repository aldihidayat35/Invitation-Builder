import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import type { Actor } from "@/lib/auth/authorization";
import { ForbiddenError } from "@/lib/auth/errors";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { generateGuestTokenId } from "@/lib/db/guest-token";
import {
  archiveGuestRow,
  findInvitationByClientToken,
  findInvitationById,
  insertGuest,
} from "@/lib/db/repositories/invitations";
import {
  findCustomerOrderById,
  findCustomerOrderByClientToken,
  findCustomerOrderByInvitationId,
  insertOrderWorkflowEvent,
  linkCustomerOrderInvitation,
  listOrderWorkflowEvents,
  regenerateCustomerOrderClientToken,
  transitionCustomerOrderProduction,
  transitionCustomerOrderStatus,
  updateCustomerOrder,
} from "@/lib/db/repositories/orders";
import {
  findResellerProfileById,
  findResellerProfileByUserId,
} from "@/lib/db/repositories/resellers";
import {
  findTemplateById,
  findTemplateVersion,
  insertTemplateVersion,
} from "@/lib/db/repositories/templates";
import { findUserById } from "@/lib/db/repositories/users";
import {
  ensureWorkspaceMember,
  findWorkspaceById,
  getMemberRole,
} from "@/lib/db/repositories/workspaces";
import { guests, invitations, rsvps, users } from "@/lib/db/schema";
import type {
  CustomerOrder,
  GuestRow,
  InvitationRow,
  OrderWorkflowEvent,
  RsvpRow,
} from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import type { CustomerOrderStatus, PaymentStatus, ProductionStatus } from "@/lib/schema/domain";
import { createEmptyDocument, migrateDocument, parseDocumentOrThrow } from "@/lib/schema";
import { applyDefaults, createVariableRegistry } from "@/lib/engine";
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
    order.sellerId ? findResellerProfileById(db, order.sellerId) : undefined,
    order.clientUserId ? findUserById(db, order.clientUserId) : undefined,
    order.workspaceId ? findWorkspaceById(db, order.workspaceId) : undefined,
    order.assignedTo ? findUserById(db, order.assignedTo) : undefined,
    order.templateId ? findTemplateById(db, order.templateId) : undefined,
    order.invitationId ? findInvitationById(db, order.invitationId) : undefined,
    listOrderWorkflowEvents(db, order.id),
  ]);

  return {
    order,
    seller: seller
      ? { id: seller.id, agencyName: seller.agencyName, slug: seller.slug }
      : {
          id: order.sellerId ?? "direct",
          agencyName: order.sellerId ? "Mitra Seller" : "Platform Langsung (Website)",
          slug: order.sellerId ? "reseller" : "direct",
        },
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
    clientUserId?: string | null;
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
    input.clientUserId ? findUserById(db, input.clientUserId) : undefined,
    findUserById(db, input.assigneeId),
    findWorkspaceById(db, input.workspaceId),
    input.clientUserId ? getMemberRole(db, input.workspaceId, input.clientUserId) : "member",
    findTemplateById(db, input.templateId),
  ]);
  if (input.clientUserId && (!client || client.status !== "active")) {
    throw new OrderWorkflowError("Pilih akun klien aktif yang valid.");
  }
  if (!workspace) {
    throw new OrderWorkflowError("Workspace tidak ditemukan.");
  }
  if (input.clientUserId && !clientRole) {
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
      clientUserId: client?.id ?? null,
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
        clientUserId: client?.id ?? null,
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

export async function changeOrderTemplate(
  db: Database,
  actor: Actor,
  orderId: string,
  newTemplateId: string,
): Promise<CustomerOrder> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");

  const template = await findTemplateById(db, newTemplateId);
  if (!template || template.publishedVersionNo === null) {
    throw new OrderWorkflowError("Master template tidak ditemukan atau belum dipublikasikan.");
  }

  let version =
    template.publishedVersionNo !== null
      ? await findTemplateVersion(db, template.id, template.publishedVersionNo)
      : undefined;

  if (!version) {
    version = await insertTemplateVersion(db, {
      templateId: template.id,
      versionNo: template.publishedVersionNo ?? 1,
      schemaVersion: 1,
      document: template.draftDocument ?? createEmptyDocument(),
      note: "Versi master template otomatis",
      createdBy: actor.userId,
    });
  }

  return db.transaction(async (tx) => {
    const updated = await updateCustomerOrder(tx, order.id, {
      templateId: template.id,
      templateVersionId: version.id,
    });

    if (order.invitationId) {
      const inv = await findInvitationById(tx, order.invitationId);
      if (inv) {
        let mergedData = (inv.data ?? {}) as Record<string, unknown>;
        try {
          const doc = parseDocumentOrThrow(migrateDocument(version.document));
          const defaults = applyDefaults(createVariableRegistry(doc.variables), {});
          mergedData = { ...defaults, ...mergedData };
        } catch {
          // Keep existing data if template document parse fails
        }

        await tx
          .update(invitations)
          .set({
            templateVersionId: version.id,
            data: mergedData,
            updatedAt: new Date(),
          })
          .where(eq(invitations.id, inv.id));
      }
    }

    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: "order.change_template",
      fromValue: order.templateId,
      toValue: template.id,
      note: `Master template desain diubah ke "${template.name}"`,
    });

    if (order.workspaceId) {
      await insertAuditLog(tx, {
        workspaceId: order.workspaceId,
        actorId: actor.userId,
        action: "order.change_template",
        entityType: "customer_order",
        entityId: order.id,
        metadata: { templateId: template.id, templateVersionId: version.id },
      });
    }

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

  // Selesaikan konfigurasi secara otomatis jika belum diisi manual
  let workspaceId = order.workspaceId;
  if (!workspaceId) {
    const ws = await db.query.workspaces.findFirst({
      orderBy: (w, { asc }) => [asc(w.name)],
    });
    if (!ws) throw new OrderWorkflowError("Tidak ada workspace yang tersedia di sistem.");
    workspaceId = ws.id;
  }

  const assignedTo = order.assignedTo ?? actor.userId;

  let templateId = order.templateId;
  let templateVersionId = order.templateVersionId;
  if (!templateId || !templateVersionId) {
    const defaultTemplate = templateId
      ? await findTemplateById(db, templateId)
      : await db.query.templates.findFirst({
          where: (t, { eq, and, isNotNull }) =>
            and(eq(t.isPublic, true), isNotNull(t.publishedVersionNo)),
        });
    if (!defaultTemplate || defaultTemplate.publishedVersionNo === null) {
      throw new OrderWorkflowError("Tidak ada master template terbit yang tersedia.");
    }
    let version =
      defaultTemplate.publishedVersionNo !== null
        ? await findTemplateVersion(db, defaultTemplate.id, defaultTemplate.publishedVersionNo)
        : undefined;
    if (!version) {
      version = await insertTemplateVersion(db, {
        templateId: defaultTemplate.id,
        versionNo: defaultTemplate.publishedVersionNo ?? 1,
        schemaVersion: 1,
        document: defaultTemplate.draftDocument ?? createEmptyDocument(),
        note: "Versi master template otomatis",
        createdBy: actor.userId,
      });
    }
    templateId = defaultTemplate.id;
    templateVersionId = version.id;
  }

  const dueAt = order.dueAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return db.transaction(async (tx) => {
    await ensureWorkspaceMember(tx, {
      workspaceId: workspaceId!,
      userId: assignedTo,
      role: "admin",
    });

    await updateCustomerOrder(tx, order.id, {
      orderStatus:
        order.orderStatus === "new" || order.orderStatus === "qualified"
          ? "accepted"
          : order.orderStatus,
      workspaceId,
      assignedTo,
      templateId,
      templateVersionId,
      dueAt,
    });

    const invitation = await createInvitation(tx, actor, {
      workspaceId: workspaceId!,
      templateId: templateId!,
      templateVersionId: templateVersionId!,
      title: order.groomBrideNames?.trim() || `Undangan ${order.customerName}`,
      clientAccessToken: order.clientAccessToken ?? undefined,
    });

    const next = await linkCustomerOrderInvitation(tx, order.id, invitation.id);
    if (!next) {
      throw new OrderWorkflowError(
        "Proyek order telah dibuat oleh proses lain. Muat ulang halaman.",
      );
    }
    if (!next.clientAccessToken && invitation.clientAccessToken) {
      await updateCustomerOrder(tx, order.id, { clientAccessToken: invitation.clientAccessToken });
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

export async function submitClientDecisionByToken(
  db: Database,
  token: string,
  decision: "approve" | "request_revision",
  note?: string,
): Promise<CustomerOrder> {
  const order = await findCustomerOrderByClientToken(db, token);
  if (!order) {
    throw new ForbiddenError("Akses token tidak valid atau pesanan tidak ditemukan.");
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
      actorId: null,
      eventType: action,
      fromValue: order.productionStatus,
      toValue: nextStatus,
      note,
    });
    await insertAuditLog(tx, {
      workspaceId: order.workspaceId,
      actorId: null,
      action,
      entityType: "customer_order",
      entityId: order.id,
      metadata: { token, invitationId: order.invitationId },
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

export interface ClientPortalData {
  order: CustomerOrder;
  invitation: InvitationRow | null;
  guests: GuestRow[];
  rsvps: RsvpRow[];
  templateTitle: string | null;
  previewUrl: string | null;
  shareableUrl: string | null;
}

export async function getClientPortalDataByToken(
  db: Database,
  token: string,
): Promise<ClientPortalData | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  let order = await findCustomerOrderByClientToken(db, cleanToken);
  let invitation: InvitationRow | undefined;

  if (order && order.invitationId) {
    invitation = await findInvitationById(db, order.invitationId);
  } else if (!order) {
    invitation = await findInvitationByClientToken(db, cleanToken);
    if (invitation) {
      order = await findCustomerOrderByInvitationId(db, invitation.id);
    }
  }

  if (!order && !invitation) {
    return null;
  }

  const invitationId = invitation?.id ?? order?.invitationId;
  let guestList: GuestRow[] = [];
  let rsvpList: RsvpRow[] = [];

  if (invitationId) {
    guestList = await db
      .select()
      .from(guests)
      .where(and(eq(guests.invitationId, invitationId), ne(guests.status, "archived")))
      .orderBy(desc(guests.createdAt));

    rsvpList = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.invitationId, invitationId))
      .orderBy(desc(rsvps.createdAt));
  }

  let templateTitle: string | null = null;
  if (order?.templateId) {
    const tmpl = await findTemplateById(db, order.templateId);
    templateTitle = tmpl?.name ?? null;
  }

  const slug = invitation?.slug;
  const shareableUrl = slug ? `/i/${slug}` : null;
  const previewUrl = slug
    ? `/i/${slug}`
    : order?.templateId
      ? `/dashboard/templates/${order.templateId}/preview`
      : null;

  return {
    order: order!,
    invitation: invitation ?? null,
    guests: guestList,
    rsvps: rsvpList,
    templateTitle,
    previewUrl,
    shareableUrl,
  };
}

export async function addGuestByClientToken(
  db: Database,
  token: string,
  input: { name: string; maxParty?: number },
): Promise<GuestRow> {
  const portal = await getClientPortalDataByToken(db, token);
  if (!portal || !portal.invitation) {
    throw new Error("Undangan belum diterbitkan atau token akses tidak valid.");
  }
  const name = input.name.trim();
  if (!name) throw new Error("Nama tamu tidak boleh kosong.");
  const maxParty = Math.min(Math.max(input.maxParty ?? 1, 1), 20);
  const guest = await insertGuest(db, {
    invitationId: portal.invitation.id,
    name,
    tokenId: generateGuestTokenId(),
    maxParty,
  });
  return guest;
}

export async function archiveGuestByClientToken(
  db: Database,
  token: string,
  guestId: string,
): Promise<void> {
  const portal = await getClientPortalDataByToken(db, token);
  if (!portal || !portal.invitation) {
    throw new Error("Undangan tidak ditemukan atau token akses tidak valid.");
  }
  await archiveGuestRow(db, portal.invitation.id, guestId);
}

export async function regenerateOrderClientToken(
  db: Database,
  actor: Actor,
  orderId: string,
): Promise<string> {
  requirePlatformOwner(actor);
  const updated = await regenerateCustomerOrderClientToken(db, orderId);
  if (!updated || !updated.clientAccessToken) {
    throw new OrderWorkflowError("Gagal memperbarui token akses order.");
  }
  return updated.clientAccessToken;
}
