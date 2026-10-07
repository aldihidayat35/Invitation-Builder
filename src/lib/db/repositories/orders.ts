import { desc, eq, sql } from "drizzle-orm";
import type { CustomerOrderStatus } from "../../schema/domain";
import {
  customerOrders,
  invitations,
  resellerProfiles,
  templates,
  users,
  type CustomerOrder,
  type ResellerProfile,
} from "../schema";
import type { Database } from "../types";

export interface CreateCustomerOrderInput {
  sellerId: string;
  templateId?: string | null;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  groomBrideNames?: string | null;
  eventDate?: Date | null;
  eventLocation?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerOrderInput {
  status?: CustomerOrderStatus;
  invitationId?: string | null;
  clientUserId?: string | null;
  adminNotes?: string | null;
}

export interface CustomerOrderItemWithDetails {
  order: CustomerOrder;
  seller: ResellerProfile;
  templateTitle?: string | null;
  invitationSlug?: string | null;
}

/** Inserts a new customer order originating from a seller's storefront. */
export async function createCustomerOrder(
  db: Database,
  input: CreateCustomerOrderInput,
): Promise<CustomerOrder> {
  const [created] = await db
    .insert(customerOrders)
    .values({
      sellerId: input.sellerId,
      templateId: input.templateId ?? null,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerWhatsapp: input.customerWhatsapp.trim(),
      groomBrideNames: input.groomBrideNames?.trim() ?? null,
      eventDate: input.eventDate ?? null,
      eventLocation: input.eventLocation?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      status: "new",
    })
    .returning();

  if (!created) {
    throw new Error("createCustomerOrder: failed to insert order");
  }

  return created;
}

/** Finds a specific customer order by ID. */
export async function findCustomerOrderById(
  db: Database,
  orderId: string,
): Promise<CustomerOrder | undefined> {
  const [order] = await db
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.id, orderId))
    .limit(1);

  return order;
}

/** Lists all customer orders submitted via a specific seller's storefront. */
export async function listOrdersBySeller(
  db: Database,
  sellerId: string,
  limit: number = 100,
): Promise<CustomerOrder[]> {
  return db
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.sellerId, sellerId))
    .orderBy(desc(customerOrders.createdAt))
    .limit(limit);
}

/** Lists all customer orders across all sellers for the Super Admin management dashboard. */
export async function listAllOrders(
  db: Database,
  limit: number = 100,
  filterStatus?: CustomerOrderStatus,
): Promise<CustomerOrderItemWithDetails[]> {
  const query = db
    .select({
      order: customerOrders,
      seller: resellerProfiles,
      templateTitle: templates.name,
      invitationSlug: invitations.slug,
    })
    .from(customerOrders)
    .innerJoin(resellerProfiles, eq(customerOrders.sellerId, resellerProfiles.id))
    .leftJoin(templates, eq(customerOrders.templateId, templates.id))
    .leftJoin(invitations, eq(customerOrders.invitationId, invitations.id));

  const rows = filterStatus
    ? await query.where(eq(customerOrders.status, filterStatus)).orderBy(desc(customerOrders.createdAt)).limit(limit)
    : await query.orderBy(desc(customerOrders.createdAt)).limit(limit);

  return rows;
}

/** Updates an order status, invitation linkage, or admin notes. */
export async function updateCustomerOrder(
  db: Database,
  orderId: string,
  input: UpdateCustomerOrderInput,
): Promise<CustomerOrder> {
  const [updated] = await db
    .update(customerOrders)
    .set({
      ...(input.status !== undefined && { status: input.status }),
      ...(input.invitationId !== undefined && { invitationId: input.invitationId }),
      ...(input.clientUserId !== undefined && { clientUserId: input.clientUserId }),
      ...(input.adminNotes !== undefined && { adminNotes: input.adminNotes }),
      updatedAt: new Date(),
    })
    .where(eq(customerOrders.id, orderId))
    .returning();

  if (!updated) {
    throw new Error(`Customer order not found: ${orderId}`);
  }

  return updated;
}

/** Summary statistics for a single seller. */
export async function getSellerOrderStats(
  db: Database,
  sellerId: string,
): Promise<{
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
}> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newCount: sql<number>`count(case when ${customerOrders.status} = 'new' then 1 end)::int`,
      inProgressCount: sql<number>`count(case when ${customerOrders.status} = 'in_progress' or ${customerOrders.status} = 'in_review' then 1 end)::int`,
      completedCount: sql<number>`count(case when ${customerOrders.status} = 'completed' then 1 end)::int`,
    })
    .from(customerOrders)
    .where(eq(customerOrders.sellerId, sellerId));

  return {
    totalOrders: row?.total ?? 0,
    newOrders: row?.newCount ?? 0,
    inProgressOrders: row?.inProgressCount ?? 0,
    completedOrders: row?.completedCount ?? 0,
  };
}

/** Platform-wide summary statistics for Super Admin. */
export async function getGlobalOrderStats(db: Database): Promise<{
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
}> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newCount: sql<number>`count(case when ${customerOrders.status} = 'new' then 1 end)::int`,
      inProgressCount: sql<number>`count(case when ${customerOrders.status} = 'in_progress' or ${customerOrders.status} = 'in_review' then 1 end)::int`,
      completedCount: sql<number>`count(case when ${customerOrders.status} = 'completed' then 1 end)::int`,
    })
    .from(customerOrders);

  return {
    totalOrders: row?.total ?? 0,
    newOrders: row?.newCount ?? 0,
    inProgressOrders: row?.inProgressCount ?? 0,
    completedOrders: row?.completedCount ?? 0,
  };
}
