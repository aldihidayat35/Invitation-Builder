import "server-only";

import { requireOwner } from "@/lib/auth/server";
import { assertPasswordPolicy, hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  createResellerWithProfile as repoCreateReseller,
  getAdminResellerStats as repoGetResellerStats,
  getTopResellersByOrders as repoGetTopResellers,
  listResellers as repoListResellers,
  updateResellerStatus as repoUpdateStatus,
} from "@/lib/db/repositories/resellers";
import {
  listAllOrders,
  updateCustomerOrder,
  findCustomerOrderById,
  getOrderTrends,
  getMonthlyOrderTrends,
  getGlobalOrderStats,
} from "@/lib/db/repositories/orders";
import { getAppSettings, updateAppSettings } from "@/lib/db/repositories/settings";
import type { AppSettingRow, NewAppSettingRow } from "@/lib/db/schema";
import type { CustomerOrderStatus } from "@/lib/schema/domain";
import type {
  AdminOrderItem,
  AdminOrderStats,
  AdminResellerItem,
  AdminResellerStats,
  AdminStats,
  TopResellerTrendItem,
} from "./types";

export interface CreateResellerServiceInput {
  name: string;
  email: string;
  password: string;
  agencyName: string;
  slug: string;
  whatsappContact: string;
  customDomain?: string;
}

/** Fetches platform statistics for backward compatibility. */
export async function getAdminStats(): Promise<AdminStats> {
  await requireOwner();
  const db = await getDb();
  const res = await repoGetResellerStats(db);
  return {
    totalResellers: res.totalResellers,
    activeResellers: res.activeResellers,
    totalOrders: res.totalOrders,
    newOrders: res.newOrders,
    completedOrders: res.completedOrders,
  };
}

/** Fetches order-specific statistics for the Admin Orders dashboard (maximal 4 KPIs). */
export async function getAdminOrderStats(): Promise<AdminOrderStats> {
  await requireOwner();
  const db = await getDb();
  return getGlobalOrderStats(db);
}

/** Fetches reseller-specific statistics for the Admin Resellers dashboard (maximal 4 KPIs). */
export async function getAdminResellerStats(): Promise<AdminResellerStats> {
  await requireOwner();
  const db = await getDb();
  return repoGetResellerStats(db);
}

/** Fetches top resellers ranked by order volume for the seller trend chart. */
export async function getAdminTopResellers(limit: number = 8): Promise<TopResellerTrendItem[]> {
  await requireOwner();
  const db = await getDb();
  return repoGetTopResellers(db, limit);
}

/** Fetches platform order volume trends for the Admin dashboard. */
export async function getAdminOrderTrends(days: number = 30) {
  await requireOwner();
  const db = await getDb();
  return getOrderTrends(db, { days });
}

/** Fetches monthly order volume trends for the Admin platform dashboard (Bulan ke Bulan). */
export async function getAdminMonthlyOrderTrends(year?: number) {
  await requireOwner();
  const db = await getDb();
  return getMonthlyOrderTrends(db, { year });
}

/** Lists all registered resellers with profiles. */
export async function getAdminResellers(): Promise<AdminResellerItem[]> {
  await requireOwner();
  const db = await getDb();
  return repoListResellers(db);
}

/** Lists all customer orders across all sellers. */
export async function getAdminOrders(
  status?: CustomerOrderStatus,
  limit: number = 100,
): Promise<AdminOrderItem[]> {
  await requireOwner();
  const db = await getDb();
  const items = await listAllOrders(db, limit, status);
  return items.map(({ order, seller, templateTitle, invitationSlug }) => ({
    id: order.id,
    sellerId: seller.id,
    sellerName: seller.agencyName,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerWhatsapp: order.customerWhatsapp,
    groomBrideNames: order.groomBrideNames,
    templateId: order.templateId,
    templateTitle,
    invitationId: order.invitationId,
    invitationSlug,
    eventDate: order.eventDate,
    eventLocation: order.eventLocation,
    notes: order.notes,
    adminNotes: order.adminNotes,
    status: order.status,
    createdAt: order.createdAt,
  }));
}

/** Provisions a new reseller with workspace and profile. */
export async function createReseller(input: CreateResellerServiceInput) {
  const actor = await requireOwner();
  const db = await getDb();

  const effectivePassword = input.password.trim();
  assertPasswordPolicy(effectivePassword);
  const passwordHash = await hashPassword(effectivePassword);

  const result = await repoCreateReseller(db, {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    agencyName: input.agencyName.trim(),
    slug: input.slug.trim().toLowerCase(),
    whatsappContact: input.whatsappContact.trim(),
    customDomain: input.customDomain?.trim() || null,
    performedBy: actor.id,
  });

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "reseller.create",
    entityType: "reseller_profile",
    entityId: result.profile.id,
    metadata: {
      agencyName: result.profile.agencyName,
      slug: result.profile.slug,
      email: result.user.email,
    },
  });

  return result;
}

/** Toggles reseller account active status. */
export async function toggleResellerStatus(profileId: string, isActive: boolean) {
  const actor = await requireOwner();
  const db = await getDb();

  const result = await repoUpdateStatus(db, profileId, isActive);

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "reseller.update",
    entityType: "reseller_profile",
    entityId: profileId,
    metadata: { isActive },
  });

  return result;
}

/** Updates order status, links created invitation, or saves admin notes. */
export async function updateAdminOrderStatus(
  orderId: string,
  input: {
    status?: CustomerOrderStatus;
    invitationId?: string;
    adminNotes?: string;
  },
) {
  const actor = await requireOwner();
  const db = await getDb();

  const current = await findCustomerOrderById(db, orderId);
  if (!current) throw new Error("Pesanan tidak ditemukan");

  const updated = await updateCustomerOrder(db, orderId, {
    ...(input.status && { status: input.status }),
    ...(input.invitationId !== undefined && { invitationId: input.invitationId }),
    ...(input.adminNotes !== undefined && { adminNotes: input.adminNotes }),
  });

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "order.update_status",
    entityType: "customer_order",
    entityId: orderId,
    metadata: {
      previousStatus: current.status,
      newStatus: updated.status,
      invitationId: input.invitationId,
    },
  });

  return updated;
}

/** Fetches application branding and general settings. */
export async function getAdminAppSettings(): Promise<AppSettingRow> {
  await requireOwner();
  const db = await getDb();
  return getAppSettings(db);
}

/** Saves application branding and general settings. */
export async function saveAdminAppSettings(
  input: Partial<Omit<NewAppSettingRow, "id" | "createdAt" | "updatedAt">>,
): Promise<AppSettingRow> {
  const actor = await requireOwner();
  const db = await getDb();

  const updated = await updateAppSettings(db, input);

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "settings.update",
    entityType: "app_settings",
    entityId: "global",
    metadata: {
      appName: updated.appName,
      companyName: updated.companyName,
    },
  });

  return updated;
}
