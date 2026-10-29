import "server-only";

import { randomBytes } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import type { Actor } from "@/lib/auth/authorization";
import { ForbiddenError } from "@/lib/auth/errors";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { generateGuestTokenId } from "@/lib/db/guest-token";
import {
  archiveGuestRow,
  findInvitationByClientToken,
  findInvitationById,
  findInvitationBySlug,
  findTemplateVersionWithWorkspace,
  insertGuest,
  insertInvitation,
  updateInvitationData,
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
import { getAppSettings } from "@/lib/db/repositories/settings";
import { listMasterBanks, DEFAULT_MASTER_BANKS } from "@/lib/db/repositories/master-banks";
import { listMessageTemplatesForCategory } from "@/lib/db/repositories/message-templates";
import { findUserById } from "@/lib/db/repositories/users";
import {
  ensureWorkspaceMember,
  findWorkspaceById,
  getMemberRole,
} from "@/lib/db/repositories/workspaces";
import { guests, invitations, publishedSnapshots, rsvps, users } from "@/lib/db/schema";
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
import {
  type ClassifiedSection,
  classifyAllSections,
} from "@/features/invitations/sections-classifier";
import {
  applyDefaults,
  buildFormFields,
  createVariableRegistry,
  formatFormValue,
  groupFormFields,
  parseFormSubmission,
  validateInvitationData,
  isGiftAccountVariableKey,
  getBankVerificationMeta,
  extractBankAccountsFromRecord,
  resolveFallbackBankLogo,
  BANK_VERIFICATION_KEY,
  type DataIssue,
  type FormField,
  type FormGroup,
  type BankVerificationMeta,
  type BankAccountDetails,
  type MasterBankItem,
} from "@/lib/engine";
import { createInvitation } from "@/features/invitations/service";
import { normalizeWhatsAppNumber } from "./platform-order";

export class OrderWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderWorkflowError";
  }
}

const ORDER_TRANSITIONS: Readonly<Record<CustomerOrderStatus, readonly CustomerOrderStatus[]>> = {
  new: ["qualified", "accepted", "cancelled"],
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

export interface OrderClientVariablesSummary {
  hasData: boolean;
  filledCount: number;
  totalCount: number;
  lastUpdated: Date | null;
  groups: FormGroup[];
  values: Record<string, string>;
  errors: Record<string, string>;
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
  variables: OrderClientVariablesSummary | null;
  bankVerification?: BankVerificationMeta;
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

  let variablesSummary: OrderClientVariablesSummary | null = null;
  let docVariables: FormField[] = [];
  let variableGroups: FormGroup[] = [];
  const variableValues: Record<string, string> = {};
  const variableErrors: Record<string, string> = {};

  if (invitation) {
    const foundVersion = await findTemplateVersionWithWorkspace(db, invitation.templateVersionId);
    if (foundVersion) {
      const doc = parseDocumentOrThrow(migrateDocument(foundVersion.version.document));
      const fields = buildFormFields(doc.variables);
      variableGroups = groupFormFields(fields);
      for (const field of fields) {
        variableValues[field.key] = formatFormValue(field, invitation.data[field.key]);
      }
      const issues = validateInvitationData(
        createVariableRegistry(doc.variables),
        invitation.data,
      ).filter((i) => i.code !== "unknown_key");
      for (const issue of issues) {
        if (!(issue.key in variableErrors)) {
          variableErrors[issue.key] = issue.message;
        }
      }
      docVariables = fields;
    }
  } else if (order.templateId) {
    const tmpl = await findTemplateById(db, order.templateId);
    if (tmpl && tmpl.publishedVersionNo !== null) {
      const ver = await findTemplateVersion(db, tmpl.id, tmpl.publishedVersionNo);
      if (ver) {
        const doc = parseDocumentOrThrow(migrateDocument(ver.document));
        const fields = buildFormFields(doc.variables);
        variableGroups = groupFormFields(fields);
        for (const field of fields) {
          variableValues[field.key] = formatFormValue(field, undefined);
        }
        docVariables = fields;
      }
    }
  }

  if (docVariables.length > 0) {
    const filledCount = docVariables.filter((f) => {
      const val = variableValues[f.key];
      return typeof val === "string" && val.trim().length > 0;
    }).length;

    const portalUpdateEvent = events.find((e) => e.eventType === "portal_data_update");
    const lastUpdated = portalUpdateEvent?.createdAt ?? (filledCount > 0 && invitation ? invitation.updatedAt : null);

    variablesSummary = {
      hasData: filledCount > 0,
      filledCount,
      totalCount: docVariables.length,
      lastUpdated,
      groups: variableGroups,
      values: variableValues,
      errors: variableErrors,
    };
  }

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
    variables: variablesSummary,
    bankVerification: invitation
      ? getBankVerificationMeta(invitation.data)
      : { status: "unconfigured" },
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
    if (current.workspaceId) {
      await insertAuditLog(tx, {
        workspaceId: current.workspaceId,
        actorId: actor.userId,
        action: "order.transition",
        entityType: "customer_order",
        entityId: orderId,
        metadata: { from: current.orderStatus, to: nextStatus },
      });
    }
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
        action: "order.transition",
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
    const ws =
      (await db.query.workspaces.findFirst({
        where: (w, { eq }) => eq(w.slug, "dev-workspace"),
      })) ??
      (await db.query.workspaces.findFirst({
        orderBy: (w, { asc }) => [asc(w.name)],
      }));
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

export async function adminApproveOrderProduction(
  db: Database,
  actor: Actor,
  orderId: string,
  note?: string,
): Promise<CustomerOrder> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  if (order.productionStatus === "approved" || order.productionStatus === "published") {
    return order;
  }
  return db.transaction(async (tx) => {
    const updated = await transitionCustomerOrderProduction(
      tx,
      order.id,
      order.productionStatus,
      "approved",
    );
    if (!updated) {
      throw new OrderWorkflowError("Status produksi telah berubah. Muat ulang halaman.");
    }
    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: "order.admin_manual_approve",
      fromValue: order.productionStatus,
      toValue: "approved",
      note: note?.trim() || "Disetujui manual oleh Admin",
    });
    await insertAuditLog(tx, {
      workspaceId: order.workspaceId,
      actorId: actor.userId,
      action: "order.client_approve",
      entityType: "customer_order",
      entityId: order.id,
      metadata: { note: note?.trim() || "Disetujui manual oleh Admin" },
    });
    return updated;
  });
}

export async function adminSendOrderToReview(
  db: Database,
  actor: Actor,
  orderId: string,
  note?: string,
): Promise<CustomerOrder> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");
  if (order.productionStatus === "client_review") {
    return order;
  }
  return db.transaction(async (tx) => {
    const updated = await transitionCustomerOrderProduction(
      tx,
      order.id,
      order.productionStatus,
      "client_review",
    );
    if (!updated) {
      throw new OrderWorkflowError("Status produksi telah berubah. Muat ulang halaman.");
    }
    await insertOrderWorkflowEvent(tx, {
      orderId: order.id,
      actorId: actor.userId,
      eventType: "order.send_client_review",
      fromValue: order.productionStatus,
      toValue: "client_review",
      note: note?.trim() || "Dikirimkan ke klien untuk review",
    });
    await insertAuditLog(tx, {
      workspaceId: order.workspaceId,
      actorId: actor.userId,
      action: "order.transition",
      entityType: "customer_order",
      entityId: order.id,
      metadata: { note, toValue: "client_review" },
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
  let order = await findCustomerOrderByClientToken(db, token);
  if (!order) {
    const inv = await findInvitationByClientToken(db, token);
    if (inv) {
      order = await findCustomerOrderByInvitationId(db, inv.id);
    }
  }
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

export interface ClientCustomizationWhatsAppParams {
  targetPhone: string;
  agencyOrAppName: string;
  orderId: string;
  customerName: string;
  customerWhatsapp?: string;
  groomBrideNames?: string;
  templateTitle?: string;
  portalUrl?: string;
}

/**
 * Builds direct WhatsApp URL with pre-filled message for client customization assistance.
 */
export function buildClientCustomizationWhatsAppUrl(
  params: ClientCustomizationWhatsAppParams,
): string {
  const cleanPhone = normalizeWhatsAppNumber(params.targetPhone);
  const brand = params.agencyOrAppName.trim();

  const lines: string[] = [
    `*KONSULTASI & KUSTOMISASI UNDANGAN - ${brand.toUpperCase()}*`,
    `Halo Admin / Tim ${brand}, saya ingin konfirmasi dan dibantu untuk *Pengisian Data Undangan*:`,
    "",
    `• Nomor Pesanan: #${params.orderId.slice(0, 8)}`,
    `• Nama Pemesan: ${params.customerName.trim()}`,
  ];

  if (params.customerWhatsapp?.trim()) {
    lines.push(`• No. WhatsApp: ${params.customerWhatsapp.trim()}`);
  }

  if (params.groomBrideNames?.trim()) {
    lines.push(`• Nama Mempelai: ${params.groomBrideNames.trim()}`);
  }

  if (params.templateTitle?.trim()) {
    lines.push(`• Tema / Desain: ${params.templateTitle.trim()}`);
  }

  if (params.portalUrl?.trim()) {
    lines.push(`• Link Portal Undangan: ${params.portalUrl.trim()}`);
  }

  lines.push("");
  lines.push("Mohon bantuannya untuk proses input dan penyesuaian data undangan kami melalui WhatsApp. Terima kasih!");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function persistableData(
  data: Readonly<Record<string, unknown>>,
  issues: readonly DataIssue[],
): Record<string, unknown> {
  const rejected = new Set(issues.filter((i) => i.code !== "missing_required").map((i) => i.key));
  return Object.fromEntries(Object.entries(data).filter(([key]) => !rejected.has(key)));
}

function slugifyTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || "undangan";
}

export async function ensureOrderInvitation(
  db: Database,
  order: CustomerOrder,
): Promise<InvitationRow | null> {
  if (order.invitationId) {
    const existing = await findInvitationById(db, order.invitationId);
    if (existing) return existing;
  }
  if (!order.templateId) return null;

  let workspaceId = order.workspaceId;
  if (!workspaceId) {
    const ws =
      (await db.query.workspaces.findFirst({
        where: (w, { eq }) => eq(w.slug, "dev-workspace"),
      })) ??
      (await db.query.workspaces.findFirst({
        orderBy: (w, { asc }) => [asc(w.name)],
      }));
    if (!ws) return null;
    workspaceId = ws.id;
  }

  const defaultTemplate = await findTemplateById(db, order.templateId);
  if (!defaultTemplate || defaultTemplate.publishedVersionNo === null) return null;

  let version = await findTemplateVersion(db, defaultTemplate.id, defaultTemplate.publishedVersionNo);
  if (!version) {
    version = await insertTemplateVersion(db, {
      templateId: defaultTemplate.id,
      versionNo: defaultTemplate.publishedVersionNo ?? 1,
      schemaVersion: 1,
      document: defaultTemplate.draftDocument ?? createEmptyDocument(),
      note: "Versi master template otomatis",
      createdBy: defaultTemplate.createdBy ?? "system",
    });
  }

  const title = order.groomBrideNames?.trim() || `Undangan ${order.customerName}`;
  const baseSlug = slugifyTitle(title);
  let slug = `${baseSlug}-${randomBytes(4).toString("hex")}`;
  for (let attempt = 0; (await findInvitationBySlug(db, slug)) && attempt < 5; attempt += 1) {
    slug = `${baseSlug}-${randomBytes(4).toString("hex")}`;
  }

  const document = parseDocumentOrThrow(migrateDocument(version.document));
  const initialData = applyDefaults(createVariableRegistry(document.variables), {});

  const newInvitation = await insertInvitation(db, {
    workspaceId,
    templateVersionId: version.id,
    slug,
    title,
    data: {
      ...initialData,
      "gallery.items": [],
      "gallery.enabled": true,
    },
    createdBy: order.assignedTo ?? order.clientUserId ?? defaultTemplate.createdBy ?? "system",
    clientAccessToken: order.clientAccessToken ?? undefined,
  });

  await linkCustomerOrderInvitation(db, order.id, newInvitation.id);
  return newInvitation;
}

export interface PortalShareMessageTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
  isDefault: boolean;
}

export interface PortalAudioSettings {
  enabled: boolean;
  src?: string;
  title?: string;
  artist?: string;
  presetId?: string;
  assetId?: string;
}

export interface ClientPortalData {
  order: CustomerOrder;
  invitation: InvitationRow | null;
  guests: GuestRow[];
  rsvps: RsvpRow[];
  templateTitle: string | null;
  previewUrl: string | null;
  shareableUrl: string | null;
  variableGroups: FormGroup[];
  variableValues: Record<string, string>;
  variableErrors: Record<string, string>;
  supportContact: {
    name: string;
    phone: string;
    whatsappUrl: string;
  };
  bankVerification?: BankVerificationMeta;
  galleryItems?: { assetId?: string; src?: string; alt?: string }[];
  galleryEnabled?: boolean;
  audioSettings?: PortalAudioSettings;
  sections?: ClassifiedSection[];
  disabledSections?: string[];
  invitationCategory?: string;
  shareMessageTemplates?: PortalShareMessageTemplate[];
  activeShareMessageTemplate?: string;
  shareImageUrl?: string | null;
  eventDetails?: {
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
  };
  masterBanks?: MasterBankItem[];
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

  if (!order && invitation) {
    const invitationData = (invitation.data || {}) as Record<string, unknown>;
    const groomName = String(
      invitationData["couple.groom.nickname"] ||
      invitationData["couple.groom.fullName"] ||
      invitationData["groom_nickname"] ||
      invitationData["groom_name"] ||
      invitationData["mempelai_pria"] ||
      "",
    );
    const brideName = String(
      invitationData["couple.bride.nickname"] ||
      invitationData["couple.bride.fullName"] ||
      invitationData["bride_nickname"] ||
      invitationData["bride_name"] ||
      invitationData["mempelai_wanita"] ||
      "",
    );
    const groomBrideNames =
      groomName.trim() && brideName.trim()
        ? `${groomName.trim()} & ${brideName.trim()}`
        : invitation.title || "Pengantin";

    const dateVal =
      invitationData["event_date"] ||
      invitationData["akad_date"] ||
      invitationData["resepsi_date"] ||
      invitationData["wedding_date"] ||
      invitationData["event.ceremony.date"] ||
      "";
    let eventDate: Date | null = null;
    if (dateVal) {
      const parsed = new Date(String(dateVal));
      if (!Number.isNaN(parsed.getTime())) {
        eventDate = parsed;
      }
    }

    order = {
      id: invitation.id,
      sellerId: null,
      idempotencyKey: `synth_${invitation.id}`,
      clientUserId: invitation.createdBy ?? null,
      invitationId: invitation.id,
      templateId: null,
      customerName: invitation.title || "Klien Undangan",
      customerEmail: null,
      customerWhatsapp: "",
      groomBrideNames,
      eventDate,
      eventLocation: null,
      notes: null,
      status: "completed",
      orderStatus: "completed",
      productionStatus: invitation.status === "published" ? "published" : "approved",
      paymentStatus: "paid",
      workspaceId: invitation.workspaceId,
      templateVersionId: invitation.templateVersionId,
      assignedTo: null,
      dueAt: null,
      acceptedAt: invitation.createdAt,
      completedAt: invitation.status === "published" ? invitation.updatedAt : null,
      adminNotes: null,
      clientAccessToken: invitation.clientAccessToken ?? cleanToken,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
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
  const templateId = order?.templateId;
  if (templateId) {
    const tmpl = await findTemplateById(db, templateId);
    templateTitle = tmpl?.name ?? null;
  }

  // Resolving variable groups, current values, and validation errors
  let variableGroups: FormGroup[] = [];
  const variableValues: Record<string, string> = {};
  const variableErrors: Record<string, string> = {};

  if (invitation) {
    const foundVersion = await findTemplateVersionWithWorkspace(db, invitation.templateVersionId);
    if (foundVersion) {
      const doc = parseDocumentOrThrow(migrateDocument(foundVersion.version.document));
      const fields = buildFormFields(doc.variables);
      variableGroups = groupFormFields(fields);
      for (const field of fields) {
        variableValues[field.key] = formatFormValue(field, invitation.data[field.key]);
      }
      const issues = validateInvitationData(
        createVariableRegistry(doc.variables),
        invitation.data,
      ).filter((i) => i.code !== "unknown_key");
      for (const issue of issues) {
        if (!(issue.key in variableErrors)) {
          variableErrors[issue.key] = issue.message;
        }
      }
    }
  } else if (order?.templateId) {
    const tmpl = await findTemplateById(db, order.templateId);
    if (tmpl && tmpl.publishedVersionNo !== null) {
      const ver = await findTemplateVersion(db, tmpl.id, tmpl.publishedVersionNo);
      if (ver) {
        const doc = parseDocumentOrThrow(migrateDocument(ver.document));
        const fields = buildFormFields(doc.variables);
        variableGroups = groupFormFields(fields);
        for (const field of fields) {
          variableValues[field.key] = formatFormValue(field, undefined);
        }
      }
    }
  }

  // Resolve support contact: Reseller first, otherwise platform appSettings
  let contactName = "Admin Undangan.id";
  let contactPhone = "6281234567890";

  if (order?.sellerId) {
    const seller = await findResellerProfileById(db, order.sellerId);
    if (seller) {
      contactName = seller.agencyName;
      contactPhone = seller.whatsappContact;
    }
  } else {
    const settings = await getAppSettings(db);
    if (settings) {
      contactName = settings.appName;
      contactPhone = settings.contactWhatsapp;
    }
  }

  const portalUrl = `/c/${cleanToken}`;

  const whatsappUrl = buildClientCustomizationWhatsAppUrl({
    targetPhone: contactPhone,
    agencyOrAppName: contactName,
    orderId: order?.id ?? invitation?.id ?? "",
    customerName: order?.customerName ?? "Klien",
    customerWhatsapp: order?.customerWhatsapp ?? undefined,
    groomBrideNames: order?.groomBrideNames ?? undefined,
    templateTitle: templateTitle ?? undefined,
    portalUrl,
  });

  const bankVerification = invitation
    ? getBankVerificationMeta(invitation.data)
    : { status: "unconfigured" as const };

  // Jika rekening belum diverifikasi tetapi klien memiliki usulan, tampilkan usulan di variableValues portal klien
  if (bankVerification.status !== "verified" && bankVerification.proposedPrimary) {
    if (bankVerification.proposedPrimary.bank) {
      variableValues["gift.bank"] = bankVerification.proposedPrimary.bank;
      variableValues["gift.bank_name"] = bankVerification.proposedPrimary.bank;
      variableValues["gift.bankLogo"] =
        bankVerification.proposedPrimary.bankLogo ||
        resolveFallbackBankLogo(bankVerification.proposedPrimary.bank);
    }
    if (bankVerification.proposedPrimary.accountNumber) {
      variableValues["gift.accountNumber"] = bankVerification.proposedPrimary.accountNumber;
      variableValues["gift.account_number"] = bankVerification.proposedPrimary.accountNumber;
    }
    if (bankVerification.proposedPrimary.accountName) {
      variableValues["gift.accountName"] = bankVerification.proposedPrimary.accountName;
      variableValues["gift.account_holder"] = bankVerification.proposedPrimary.accountName;
    }
    if (bankVerification.proposedSecondary) {
      if (bankVerification.proposedSecondary.bank) {
        variableValues["gift.bank2"] = bankVerification.proposedSecondary.bank;
        variableValues["gift.bankLogo2"] =
          bankVerification.proposedSecondary.bankLogo ||
          resolveFallbackBankLogo(bankVerification.proposedSecondary.bank);
      }
      if (bankVerification.proposedSecondary.accountNumber) {
        variableValues["gift.accountNumber2"] = bankVerification.proposedSecondary.accountNumber;
      }
      if (bankVerification.proposedSecondary.accountName) {
        variableValues["gift.accountName2"] = bankVerification.proposedSecondary.accountName;
      }
    }
  }

  // Resolving gallery items and enabled status for portal (no dummy photos for client)
  let galleryItems: { assetId?: string; src?: string; alt?: string }[] = [];
  let galleryEnabled = true;

  if (invitation) {
    if (Array.isArray(invitation.data["gallery.items"])) {
      galleryItems = (invitation.data["gallery.items"] as { assetId?: string; src?: string; alt?: string }[]).slice(0, 15);
    }
    if (invitation.data["gallery.enabled"] !== undefined) {
      galleryEnabled = invitation.data["gallery.enabled"] !== false;
    }
  }

  // Resolving backsound audio settings for portal
  let audioSettings: PortalAudioSettings = {
    enabled: true,
  };

  const invData = invitation?.data as Record<string, unknown> | undefined;
  if (
    invData &&
    (invData["audio.enabled"] !== undefined ||
      invData["audio.src"] ||
      invData["audio.assetId"])
  ) {
    audioSettings = {
      enabled: invData["audio.enabled"] !== false,
      src: typeof invData["audio.src"] === "string" ? invData["audio.src"] : undefined,
      title: typeof invData["audio.title"] === "string" ? invData["audio.title"] : undefined,
      artist: typeof invData["audio.artist"] === "string" ? invData["audio.artist"] : undefined,
      presetId: typeof invData["audio.presetId"] === "string" ? invData["audio.presetId"] : undefined,
      assetId: typeof invData["audio.assetId"] === "string" ? invData["audio.assetId"] : undefined,
    };
  } else if (invitation) {
    const foundVersion = await findTemplateVersionWithWorkspace(db, invitation.templateVersionId);
    if (foundVersion) {
      const doc = parseDocumentOrThrow(migrateDocument(foundVersion.version.document));
      if (doc.design.audio) {
        audioSettings = {
          enabled: doc.design.audio.enabled,
          src: doc.design.audio.src,
          title: doc.design.audio.title,
        };
      }
    }
  } else if (order?.templateId) {
    const tmpl = await findTemplateById(db, order.templateId);
    if (tmpl && tmpl.publishedVersionNo !== null) {
      const ver = await findTemplateVersion(db, tmpl.id, tmpl.publishedVersionNo);
      if (ver) {
        const doc = parseDocumentOrThrow(migrateDocument(ver.document));
        if (doc.design.audio) {
          audioSettings = {
            enabled: doc.design.audio.enabled,
            src: doc.design.audio.src,
            title: doc.design.audio.title,
          };
        }
      }
    }
  }

  const slug = invitation?.slug;
  const shareableUrl = slug ? `/i/${slug}` : null;
  const previewUrl = slug
    ? `/i/${slug}`
    : order?.templateId
      ? `/dashboard/templates/${order.templateId}/preview`
      : null;

  // Resolve template category for message templates
  let invitationCategory = "wedding";
  if (order?.templateId) {
    const tmpl = await findTemplateById(db, order.templateId);
    if (tmpl?.category) invitationCategory = tmpl.category;
  } else if (invitation) {
    const foundVersion = await findTemplateVersionWithWorkspace(db, invitation.templateVersionId);
    if (foundVersion) {
      const tmpl = await findTemplateById(db, foundVersion.version.templateId);
      if (tmpl?.category) invitationCategory = tmpl.category;
    }
  }

  // Fetch active message templates for this category
  const dbTemplates = await listMessageTemplatesForCategory(db, invitationCategory);
  const shareMessageTemplates: PortalShareMessageTemplate[] = dbTemplates.map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title,
    content: t.content,
    isDefault: t.isDefault,
  }));

  const savedShareTemplate = invitation?.data?.["share_message_template"] as string | undefined;
  const defaultTemplate =
    shareMessageTemplates.find((t) => t.isDefault && t.category === invitationCategory) ||
    shareMessageTemplates.find((t) => t.isDefault) ||
    shareMessageTemplates[0];

  const activeShareMessageTemplate = savedShareTemplate?.trim() || defaultTemplate?.content || "";

  // Resolving sections and disabled status for portal
  let portalSections: ClassifiedSection[] = [];
  const rawDisabled = Array.isArray(invitation?.data?.["sections.disabled"])
    ? (invitation?.data?.["sections.disabled"] as string[])
    : [];
  const disabledSections = rawDisabled.filter((s) => typeof s === "string" && s.trim().length > 0);

  if (invitation) {
    const foundVersion = await findTemplateVersionWithWorkspace(db, invitation.templateVersionId);
    if (foundVersion) {
      const doc = parseDocumentOrThrow(migrateDocument(foundVersion.version.document));
      portalSections = classifyAllSections(doc.sections, disabledSections);
    }
  } else if (order?.templateId) {
    const tmpl = await findTemplateById(db, order.templateId);
    if (tmpl && tmpl.publishedVersionNo !== null) {
      const ver = await findTemplateVersion(db, tmpl.id, tmpl.publishedVersionNo);
      if (ver) {
        const doc = parseDocumentOrThrow(migrateDocument(ver.document));
        portalSections = classifyAllSections(doc.sections, disabledSections);
      }
    }
  }

  // Event details for interpolation
  const coupleOrTitle =
    order?.groomBrideNames?.trim() ||
    (order?.customerName ? `Acara ${order.customerName}` : invitation?.title || "Undangan");
  const eventDateFormatted = order?.eventDate
    ? new Date(order.eventDate).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const eventLocation =
    order?.eventLocation ||
    (invitation?.data?.["event.location"] as string) ||
    (invitation?.data?.["location"] as string) ||
    "";

  const activeMasterBanks = await listMasterBanks(db, { onlyActive: true }).catch(() =>
    DEFAULT_MASTER_BANKS.map((b, idx) => ({
      ...b,
      id: `default-${idx}`,
      category: b.category ?? "bank",
      isActive: b.isActive ?? true,
      sortOrder: b.sortOrder ?? idx,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

  return {
    order: order!,
    invitation: invitation ?? null,
    guests: guestList,
    rsvps: rsvpList,
    templateTitle,
    previewUrl,
    shareableUrl,
    variableGroups,
    variableValues,
    variableErrors,
    supportContact: {
      name: contactName,
      phone: contactPhone,
      whatsappUrl,
    },
    bankVerification,
    galleryItems,
    galleryEnabled,
    audioSettings,
    sections: portalSections,
    disabledSections,
    invitationCategory,
    shareMessageTemplates,
    activeShareMessageTemplate,
    shareImageUrl:
      (typeof invitation?.data?.["whatsapp_share_image"] === "string" && (invitation.data["whatsapp_share_image"] as string).trim()) ||
      (typeof invitation?.data?.["share_image"] === "string" && (invitation.data["share_image"] as string).trim()) ||
      (typeof invitation?.data?.["cover_photo"] === "string" && (invitation.data["cover_photo"] as string).trim()) ||
      null,
    eventDetails: {
      eventTitle: coupleOrTitle,
      eventDate: eventDateFormatted,
      eventLocation,
    },
    masterBanks: activeMasterBanks,
  };
}

/** Saves custom message template and optional custom share image for client invitation. */
export async function saveClientShareMessageTemplate(
  db: Database,
  token: string,
  templateText: string,
  shareImageUrl?: string | null,
): Promise<{ ok: boolean; message: string; template: string; shareImageUrl?: string | null; slug?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error("Token tidak valid.");

  const order = await findCustomerOrderByClientToken(db, cleanToken);
  let invitation: InvitationRow | undefined;

  if (order && order.invitationId) {
    invitation = await findInvitationById(db, order.invitationId);
  } else if (!order) {
    invitation = await findInvitationByClientToken(db, cleanToken);
  }

  if (!invitation && order) {
    invitation = (await ensureOrderInvitation(db, order)) ?? undefined;
  }

  if (!invitation) {
    throw new Error("Undangan tidak ditemukan.");
  }

  const currentData = (invitation.data || {}) as Record<string, unknown>;
  const updatedData: Record<string, unknown> = {
    ...currentData,
    share_message_template: templateText.trim(),
    ...(shareImageUrl !== undefined && {
      whatsapp_share_image: shareImageUrl ? shareImageUrl.trim() : null,
      share_image: shareImageUrl ? shareImageUrl.trim() : null,
      cover_photo: shareImageUrl ? shareImageUrl.trim() : currentData.cover_photo,
    }),
  };

  await db
    .update(invitations)
    .set({
      data: updatedData,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  // If invitation has an active published snapshot, also update snapshot.data so live visitors & crawlers immediately see it
  if (invitation.activePublishedSnapshotId) {
    try {
      const [snapshot] = await db
        .select()
        .from(publishedSnapshots)
        .where(eq(publishedSnapshots.id, invitation.activePublishedSnapshotId))
        .limit(1);

      if (snapshot) {
        const snapData = (snapshot.data || {}) as Record<string, unknown>;
        const updatedSnapData = {
          ...snapData,
          share_message_template: templateText.trim(),
          ...(shareImageUrl !== undefined && {
            whatsapp_share_image: shareImageUrl ? shareImageUrl.trim() : null,
            share_image: shareImageUrl ? shareImageUrl.trim() : null,
            cover_photo: shareImageUrl ? shareImageUrl.trim() : snapData.cover_photo,
          }),
        };
        await db
          .update(publishedSnapshots)
          .set({ data: updatedSnapData })
          .where(eq(publishedSnapshots.id, snapshot.id));
      }
    } catch (err) {
      console.error("Failed to update active snapshot share data:", err);
    }
  }

  return {
    ok: true,
    message: "Format pesan dan foto kartu WhatsApp berhasil disimpan.",
    template: templateText.trim(),
    shareImageUrl: shareImageUrl !== undefined ? shareImageUrl : null,
    slug: invitation.slug,
  };
}

export async function saveClientPortalInvitationData(
  db: Database,
  token: string,
  values: Record<string, string>,
): Promise<{ ok: boolean; issues: readonly DataIssue[]; errors: Record<string, string> }> {
  const portal = await getClientPortalDataByToken(db, token);
  if (!portal) {
    throw new Error("Token akses portal tidak valid.");
  }

  let invitation = portal.invitation;
  if (!invitation) {
    if (portal.order?.templateId) {
      invitation = await ensureOrderInvitation(db, portal.order);
    }
    if (!invitation) {
      throw new Error("Proyek undangan belum siap atau template belum ditentukan.");
    }
  }

  const found = await findTemplateVersionWithWorkspace(db, invitation.templateVersionId);
  if (!found) {
    throw new Error("Versi template tidak ditemukan.");
  }

  const document = parseDocumentOrThrow(migrateDocument(found.version.document));
  const { data, issues } = parseFormSubmission(document.variables, values, {
    timeZone: "Asia/Jakarta",
  });
  const stored = persistableData(data, issues);

  // Kunci Keamanan: Variabel rekening dilindungi dan tidak boleh langsung ditimpa oleh klien
  const existingBankMeta = getBankVerificationMeta(invitation.data);
  const clientBankInput = extractBankAccountsFromRecord(values);

  // Ambil hanya variabel non-rekening dari submission klien
  const safeNonBankStored: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(stored)) {
    if (!isGiftAccountVariableKey(k)) {
      safeNonBankStored[k] = v;
    }
  }

  const updatedData: Record<string, unknown> = {
    ...invitation.data,
    ...safeNonBankStored,
  };

  // Tangani usulan atau permohonan perubahan rekening dari klien
  let hasNewBankProposal = false;
  if (clientBankInput.primary) {
    if (existingBankMeta.status === "verified") {
      const isDifferentFromVerified =
        clientBankInput.primary.bank !== existingBankMeta.verifiedPrimary?.bank ||
        clientBankInput.primary.accountNumber !== existingBankMeta.verifiedPrimary?.accountNumber ||
        clientBankInput.primary.accountName !== existingBankMeta.verifiedPrimary?.accountName;

      if (isDifferentFromVerified || values["_requestBankChange"] === "true") {
        hasNewBankProposal = true;
        updatedData[BANK_VERIFICATION_KEY] = {
          ...existingBankMeta,
          proposedPrimary: clientBankInput.primary,
          proposedSecondary: clientBankInput.secondary,
          proposedAt: new Date().toISOString(),
          clientNote:
            typeof values["_bankChangeNote"] === "string"
              ? values["_bankChangeNote"].trim()
              : "Pengajuan perubahan nomor rekening oleh klien",
        };
      }
    } else {
      hasNewBankProposal = true;
      updatedData[BANK_VERIFICATION_KEY] = {
        ...existingBankMeta,
        status: "pending_review",
        proposedPrimary: clientBankInput.primary,
        proposedSecondary: clientBankInput.secondary,
        proposedAt: new Date().toISOString(),
        clientNote:
          typeof values["_bankChangeNote"] === "string"
            ? values["_bankChangeNote"].trim()
            : undefined,
      };
    }
  }

  const updatedInv = await updateInvitationData(db, {
    invitationId: invitation.id,
    data: updatedData,
  });
  if (!updatedInv) throw new Error("Gagal menyimpan data undangan.");

  // Sinkronisasi otomatis ringkasan mempelai & tanggal acara ke customerOrders jika relevan
  const groomVal =
    values["groom_nickname"] ||
    values["groom_name"] ||
    values["nama_pria"] ||
    values["mempelai_pria"] ||
    "";
  const brideVal =
    values["bride_nickname"] ||
    values["bride_name"] ||
    values["nama_wanita"] ||
    values["mempelai_wanita"] ||
    "";
  const coupleVal = values["couple_names"] || values["nama_mempelai"] || "";

  let syncGroomBrideNames = portal.order.groomBrideNames;
  if (groomVal && brideVal) {
    syncGroomBrideNames = `${groomVal.trim()} & ${brideVal.trim()}`;
  } else if (coupleVal) {
    syncGroomBrideNames = coupleVal.trim();
  }

  const dateVal =
    values["event_date"] ||
    values["akad_date"] ||
    values["resepsi_date"] ||
    values["wedding_date"] ||
    values["tanggal_acara"] ||
    "";
  let syncEventDate = portal.order.eventDate;
  if (dateVal) {
    const parsed = new Date(dateVal);
    if (!Number.isNaN(parsed.getTime())) {
      syncEventDate = parsed;
    }
  }

  const isRealOrder = portal.order && portal.order.id !== invitation.id;
  if (isRealOrder) {
    if (
      syncGroomBrideNames !== portal.order.groomBrideNames ||
      syncEventDate !== portal.order.eventDate
    ) {
      await updateCustomerOrder(db, portal.order.id, {
        ...(syncGroomBrideNames ? { groomBrideNames: syncGroomBrideNames } : {}),
        ...(syncEventDate ? { eventDate: syncEventDate } : {}),
      });
    }
  }

  await insertAuditLog(db, {
    workspaceId: invitation.workspaceId,
    actorId: null,
    action: "order.portal_data_update",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { token, updatedKeys: Object.keys(stored) },
  });

  if (isRealOrder) {
    await insertOrderWorkflowEvent(db, {
      orderId: portal.order.id,
      actorId: null,
      eventType: "portal_data_update",
      note: `Klien memperbarui ${Object.keys(stored).length} data/variabel undangan melalui Portal Mandiri.`,
      metadata: { token, updatedKeys: Object.keys(stored) },
    });

    if (hasNewBankProposal && clientBankInput.primary) {
      await insertOrderWorkflowEvent(db, {
        orderId: portal.order.id,
        actorId: null,
        eventType: "order.bank_proposal",
        note: `Klien mengajukan usulan data rekening (${clientBankInput.primary.bank} - ${clientBankInput.primary.accountNumber} a/n ${clientBankInput.primary.accountName}) untuk diverifikasi Admin.`,
        metadata: { proposed: clientBankInput },
      });
    }
  }

  const errors: Record<string, string> = {};
  for (const issue of issues) {
    if (!(issue.key in errors)) errors[issue.key] = issue.message;
  }

  return { ok: true, issues, errors };
}

export async function saveClientPortalGallery(
  db: Database,
  token: string,
  items: { assetId?: string; src?: string; alt?: string }[],
  enabled?: boolean,
): Promise<{ ok: boolean; count: number; slug?: string; enabled?: boolean }> {
  const portal = await getClientPortalDataByToken(db, token);
  if (!portal) {
    throw new Error("Token akses portal tidak valid.");
  }

  let invitation = portal.invitation;
  if (!invitation) {
    if (portal.order?.templateId) {
      invitation = await ensureOrderInvitation(db, portal.order);
    }
    if (!invitation) {
      throw new Error("Proyek undangan belum siap atau template belum ditentukan.");
    }
  }

  // Batas foto galeri hingga 50 foto
  const cleanItems = (Array.isArray(items) ? items : []).slice(0, 50).map((item) => ({
    ...(item.assetId ? { assetId: item.assetId } : {}),
    ...(item.src ? { src: item.src } : {}),
    alt: typeof item.alt === "string" ? item.alt.slice(0, 100) : "",
  }));

  const updatedData: Record<string, unknown> = {
    ...invitation.data,
    "gallery.items": cleanItems,
    ...(enabled !== undefined ? { "gallery.enabled": enabled } : {}),
  };

  const updatedInv = await updateInvitationData(db, {
    invitationId: invitation.id,
    data: updatedData,
  });
  if (!updatedInv) throw new Error("Gagal menyimpan galeri foto undangan.");

  await insertAuditLog(db, {
    workspaceId: invitation.workspaceId,
    actorId: null,
    action: "order.portal_data_update",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { token, photoCount: cleanItems.length, type: "gallery" },
  });

  const isRealOrder = portal.order && portal.order.id !== invitation.id;
  if (isRealOrder) {
    await insertOrderWorkflowEvent(db, {
      orderId: portal.order.id,
      actorId: null,
      eventType: "portal_data_update",
      note: `Klien memperbarui galeri foto undangan (${cleanItems.length} foto) melalui Portal Mandiri.`,
      metadata: { token, photoCount: cleanItems.length },
    });
  }

  return { ok: true, count: cleanItems.length, slug: invitation.slug };
}

export async function saveClientPortalAudio(
  db: Database,
  token: string,
  audioSettings: PortalAudioSettings,
): Promise<{ ok: boolean; slug?: string; audio: PortalAudioSettings }> {
  const portal = await getClientPortalDataByToken(db, token);
  if (!portal) {
    throw new Error("Token akses portal tidak valid.");
  }

  let invitation = portal.invitation;
  if (!invitation) {
    if (portal.order?.templateId) {
      invitation = await ensureOrderInvitation(db, portal.order);
    }
    if (!invitation) {
      throw new Error("Proyek undangan belum siap atau template belum ditentukan.");
    }
  }

  const updatedData: Record<string, unknown> = {
    ...invitation.data,
    "audio.enabled": audioSettings.enabled,
    ...(audioSettings.src ? { "audio.src": audioSettings.src } : {}),
    ...(audioSettings.title ? { "audio.title": audioSettings.title } : {}),
    ...(audioSettings.artist ? { "audio.artist": audioSettings.artist } : {}),
    ...(audioSettings.presetId ? { "audio.presetId": audioSettings.presetId } : {}),
    ...(audioSettings.assetId ? { "audio.assetId": audioSettings.assetId } : {}),
  };

  const updatedInv = await updateInvitationData(db, {
    invitationId: invitation.id,
    data: updatedData,
  });
  if (!updatedInv) throw new Error("Gagal menyimpan pengaturan musik undangan.");

  await insertAuditLog(db, {
    workspaceId: invitation.workspaceId,
    actorId: null,
    action: "order.portal_data_update",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { token, type: "audio", title: audioSettings.title },
  });

  const isRealOrder = portal.order && portal.order.id !== invitation.id;
  if (isRealOrder) {
    await insertOrderWorkflowEvent(db, {
      orderId: portal.order.id,
      actorId: null,
      eventType: "portal_data_update",
      note: `Klien memperbarui musik latar undangan: "${audioSettings.title || "Lagu Kustom"}" (${audioSettings.enabled ? "Aktif" : "Nonaktif"}).`,
      metadata: { token, type: "audio" },
    });
  }

  return { ok: true, slug: invitation.slug, audio: audioSettings };
}

export async function saveClientPortalSections(
  db: Database,
  token: string,
  disabledSectionIds: string[],
): Promise<{ ok: boolean; slug?: string; disabledSections: string[] }> {
  const portal = await getClientPortalDataByToken(db, token);
  if (!portal) {
    throw new Error("Token akses portal tidak valid.");
  }

  let invitation = portal.invitation;
  if (!invitation) {
    if (portal.order?.templateId) {
      invitation = await ensureOrderInvitation(db, portal.order);
    }
    if (!invitation) {
      throw new Error("Proyek undangan belum siap atau template belum ditentukan.");
    }
  }

  const disabledClean = Array.isArray(disabledSectionIds)
    ? disabledSectionIds.filter((id) => typeof id === "string" && id.trim().length > 0)
    : [];

  const updatedData: Record<string, unknown> = {
    ...invitation.data,
    "sections.disabled": disabledClean,
  };

  const updatedInv = await updateInvitationData(db, {
    invitationId: invitation.id,
    data: updatedData,
  });
  if (!updatedInv) throw new Error("Gagal menyimpan pengaturan section undangan.");

  await insertAuditLog(db, {
    workspaceId: invitation.workspaceId,
    actorId: null,
    action: "order.portal_data_update",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { token, type: "sections", disabled: disabledClean },
  });

  const isRealOrder = portal.order && portal.order.id !== invitation.id;
  if (isRealOrder) {
    await insertOrderWorkflowEvent(db, {
      orderId: portal.order.id,
      actorId: null,
      eventType: "portal_data_update",
      note: `Klien memperbarui section undangan (${disabledClean.length} section dinonaktifkan).`,
      metadata: { token, type: "sections", disabled: disabledClean },
    });
  }

  return { ok: true, slug: invitation.slug, disabledSections: disabledClean };
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

export interface AdminVerifyOrderBankInput {
  orderId: string;
  primary: BankAccountDetails;
  secondary?: BankAccountDetails | null;
  adminNote?: string;
  confirmOrderAccepted?: boolean;
}

export async function adminVerifyOrderBank(
  db: Database,
  actor: Actor,
  input: AdminVerifyOrderBankInput,
): Promise<{ order: CustomerOrder; bankVerification: BankVerificationMeta }> {
  requirePlatformOwner(actor);
  const order = await findCustomerOrderById(db, input.orderId);
  if (!order) throw new OrderWorkflowError("Pesanan tidak ditemukan.");

  let invitation = order.invitationId ? await findInvitationById(db, order.invitationId) : null;
  if (!invitation && order.templateId) {
    invitation = await ensureOrderInvitation(db, order);
  }
  if (!invitation) {
    throw new OrderWorkflowError("Proyek undangan untuk pesanan ini belum disiapkan.");
  }

  const primaryLogo =
    input.primary.bankLogo || resolveFallbackBankLogo(input.primary.bank);
  const secondaryLogo = input.secondary?.bank
    ? input.secondary.bankLogo || resolveFallbackBankLogo(input.secondary.bank)
    : null;

  const verifiedMeta: BankVerificationMeta = {
    status: "verified",
    verifiedAt: new Date().toISOString(),
    verifiedBy: actor.userId,
    verifiedPrimary: {
      ...input.primary,
      bankLogo: primaryLogo,
    },
    verifiedSecondary: input.secondary
      ? {
          ...input.secondary,
          bankLogo: secondaryLogo,
        }
      : null,
    proposedPrimary: null,
    proposedSecondary: null,
    adminNote: input.adminNote?.trim() || null,
  };

  const bankPatch: Record<string, unknown> = {
    "gift.bank": input.primary.bank,
    "gift.accountNumber": input.primary.accountNumber,
    "gift.accountName": input.primary.accountName,
    "gift.bankLogo": primaryLogo,
    "gift.bank_name": input.primary.bank,
    "gift.account_number": input.primary.accountNumber,
    "gift.account_holder": input.primary.accountName,
    [BANK_VERIFICATION_KEY]: verifiedMeta,
  };

  const nextData = {
    ...invitation.data,
    ...bankPatch,
  };

  if (input.secondary?.bank && input.secondary.accountNumber) {
    nextData["gift.bank2"] = input.secondary.bank;
    nextData["gift.accountNumber2"] = input.secondary.accountNumber;
    nextData["gift.accountName2"] = input.secondary.accountName || "";
    nextData["gift.bankLogo2"] = secondaryLogo;
  } else {
    delete nextData["gift.bank2"];
    delete nextData["gift.accountNumber2"];
    delete nextData["gift.accountName2"];
    delete nextData["gift.bankLogo2"];
  }

  const updatedInv = await updateInvitationData(db, {
    invitationId: invitation.id,
    data: nextData,
  });
  if (!updatedInv) throw new OrderWorkflowError("Gagal memperbarui data undangan.");

  await insertOrderWorkflowEvent(db, {
    orderId: order.id,
    actorId: actor.userId,
    eventType: "order.bank_verified",
    note: `Rekening resmi diverifikasi & disuntikkan ke undangan oleh Admin: ${input.primary.bank} - ${input.primary.accountNumber} a/n ${input.primary.accountName}${
      input.adminNote ? ` (${input.adminNote})` : ""
    }`,
    metadata: {
      primary: input.primary,
      secondary: input.secondary,
      note: input.adminNote,
    },
  });

  await insertAuditLog(db, {
    workspaceId: order.workspaceId,
    actorId: actor.userId,
    action: "order.bank_verified",
    entityType: "customer_order",
    entityId: order.id,
    metadata: {
      primary: input.primary,
      secondary: input.secondary,
    },
  });

  let currentOrder = order;
  if (input.confirmOrderAccepted && (order.orderStatus === "new" || order.orderStatus === "qualified")) {
    currentOrder = await transitionOrder(
      db,
      actor,
      order.id,
      "accepted",
      "Dikonfirmasi bersamaan dengan verifikasi rekening oleh Admin",
    );
  }

  return { order: currentOrder, bankVerification: verifiedMeta };
}
