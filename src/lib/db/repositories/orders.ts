import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type {
  CustomerOrderStatus,
  LegacyCustomerOrderStatus,
  PaymentStatus,
  ProductionStatus,
} from "../../schema/domain";
import {
  customerOrders,
  invitations,
  orderWorkflowEvents,
  resellerProfiles,
  templates,
  type CustomerOrder,
  type OrderWorkflowEvent,
  type ResellerProfile,
} from "../schema";
import type { Database } from "../types";

export function generateClientAccessToken(): string {
  return "c_" + randomBytes(12).toString("hex");
}

export interface CreateCustomerOrderInput {
  sellerId: string;
  idempotencyKey?: string | null;
  templateId?: string | null;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  groomBrideNames?: string | null;
  eventDate?: Date | null;
  eventLocation?: string | null;
  notes?: string | null;
  clientAccessToken?: string | null;
}

export interface UpdateCustomerOrderInput {
  /** @deprecated Compatibility only while legacy callers migrate to orderStatus. */
  status?: LegacyCustomerOrderStatus;
  orderStatus?: CustomerOrderStatus;
  productionStatus?: ProductionStatus;
  paymentStatus?: PaymentStatus;
  templateId?: string | null;
  invitationId?: string | null;
  clientUserId?: string | null;
  clientAccessToken?: string | null;
  workspaceId?: string | null;
  templateVersionId?: string | null;
  assignedTo?: string | null;
  dueAt?: Date | null;
  acceptedAt?: Date | null;
  completedAt?: Date | null;
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
      idempotencyKey: input.idempotencyKey ?? null,
      templateId: input.templateId ?? null,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerWhatsapp: input.customerWhatsapp.trim(),
      groomBrideNames: input.groomBrideNames?.trim() ?? null,
      eventDate: input.eventDate ?? null,
      eventLocation: input.eventLocation?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      clientAccessToken: input.clientAccessToken ?? generateClientAccessToken(),
      status: "new",
    })
    .returning();

  if (!created) {
    throw new Error("createCustomerOrder: failed to insert order");
  }

  return created;
}

export async function findCustomerOrderByIdempotencyKey(
  db: Database,
  idempotencyKey: string,
): Promise<CustomerOrder | undefined> {
  const [order] = await db
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.idempotencyKey, idempotencyKey))
    .limit(1);
  return order;
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

export async function findCustomerOrderByInvitationId(
  db: Database,
  invitationId: string,
): Promise<CustomerOrder | undefined> {
  const [order] = await db
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.invitationId, invitationId))
    .limit(1);
  return order;
}

export async function findCustomerOrderByClientToken(
  db: Database,
  token: string,
): Promise<CustomerOrder | undefined> {
  const [order] = await db
    .select()
    .from(customerOrders)
    .where(eq(customerOrders.clientAccessToken, token))
    .limit(1);
  return order;
}

export async function regenerateCustomerOrderClientToken(
  db: Database,
  orderId: string,
): Promise<CustomerOrder | undefined> {
  const newToken = generateClientAccessToken();
  const [updated] = await db
    .update(customerOrders)
    .set({ clientAccessToken: newToken, updatedAt: new Date() })
    .where(eq(customerOrders.id, orderId))
    .returning();
  if (updated && updated.invitationId) {
    await db
      .update(invitations)
      .set({ clientAccessToken: newToken, updatedAt: new Date() })
      .where(eq(invitations.id, updated.invitationId));
  }
  return updated;
}

export async function insertOrderWorkflowEvent(
  db: Database,
  input: {
    orderId: string;
    actorId?: string | null;
    eventType: string;
    fromValue?: string | null;
    toValue?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<OrderWorkflowEvent> {
  const [event] = await db
    .insert(orderWorkflowEvents)
    .values({
      orderId: input.orderId,
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue ?? null,
      note: input.note?.trim() || null,
      metadata: input.metadata ?? {},
    })
    .returning();
  if (!event) throw new Error("insertOrderWorkflowEvent returned no row");
  return event;
}

export async function listOrderWorkflowEvents(
  db: Database,
  orderId: string,
): Promise<OrderWorkflowEvent[]> {
  return db
    .select()
    .from(orderWorkflowEvents)
    .where(eq(orderWorkflowEvents.orderId, orderId))
    .orderBy(desc(orderWorkflowEvents.createdAt));
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
    ? await query
        .where(eq(customerOrders.orderStatus, filterStatus))
        .orderBy(desc(customerOrders.createdAt))
        .limit(limit)
    : await query.orderBy(desc(customerOrders.createdAt)).limit(limit);

  return rows;
}

/** Updates an order status, invitation linkage, or admin notes. */
export async function updateCustomerOrder(
  db: Database,
  orderId: string,
  input: UpdateCustomerOrderInput,
): Promise<CustomerOrder> {
  const legacyBusinessStatus =
    input.status === undefined
      ? undefined
      : (
          {
            new: "new",
            in_review: "qualified",
            in_progress: "accepted",
            completed: "completed",
            cancelled: "cancelled",
          } as const
        )[input.status];
  const [updated] = await db
    .update(customerOrders)
    .set({
      ...(input.status !== undefined && { status: input.status }),
      ...((input.orderStatus !== undefined || legacyBusinessStatus !== undefined) && {
        orderStatus: input.orderStatus ?? legacyBusinessStatus,
      }),
      ...(input.productionStatus !== undefined && { productionStatus: input.productionStatus }),
      ...(input.paymentStatus !== undefined && { paymentStatus: input.paymentStatus }),
      ...(input.templateId !== undefined && { templateId: input.templateId }),
      ...(input.invitationId !== undefined && { invitationId: input.invitationId }),
      ...(input.clientUserId !== undefined && { clientUserId: input.clientUserId }),
      ...(input.clientAccessToken !== undefined && { clientAccessToken: input.clientAccessToken }),
      ...(input.workspaceId !== undefined && { workspaceId: input.workspaceId }),
      ...(input.templateVersionId !== undefined && {
        templateVersionId: input.templateVersionId,
      }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.dueAt !== undefined && { dueAt: input.dueAt }),
      ...(input.acceptedAt !== undefined && { acceptedAt: input.acceptedAt }),
      ...(input.completedAt !== undefined && { completedAt: input.completedAt }),
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

/** Atomic compare-and-set used by workflow transitions to prevent double processing. */
export async function transitionCustomerOrderStatus(
  db: Database,
  orderId: string,
  fromStatus: CustomerOrderStatus,
  toStatus: CustomerOrderStatus,
): Promise<CustomerOrder | undefined> {
  const [updated] = await db
    .update(customerOrders)
    .set({
      orderStatus: toStatus,
      ...(toStatus === "accepted" && { acceptedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(and(eq(customerOrders.id, orderId), eq(customerOrders.orderStatus, fromStatus)))
    .returning();
  return updated;
}

export async function transitionCustomerOrderProduction(
  db: Database,
  orderId: string,
  fromStatus: ProductionStatus,
  toStatus: ProductionStatus,
): Promise<CustomerOrder | undefined> {
  const [updated] = await db
    .update(customerOrders)
    .set({ productionStatus: toStatus, updatedAt: new Date() })
    .where(and(eq(customerOrders.id, orderId), eq(customerOrders.productionStatus, fromStatus)))
    .returning();
  return updated;
}

export async function linkCustomerOrderInvitation(
  db: Database,
  orderId: string,
  invitationId: string,
): Promise<CustomerOrder | undefined> {
  const [updated] = await db
    .update(customerOrders)
    .set({ invitationId, productionStatus: "in_production", updatedAt: new Date() })
    .where(and(eq(customerOrders.id, orderId), isNull(customerOrders.invitationId)))
    .returning();
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
      newCount: sql<number>`count(case when ${customerOrders.orderStatus} = 'new' then 1 end)::int`,
      inProgressCount: sql<number>`count(case when ${customerOrders.orderStatus} in ('qualified', 'accepted') then 1 end)::int`,
      completedCount: sql<number>`count(case when ${customerOrders.orderStatus} = 'completed' then 1 end)::int`,
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
      newCount: sql<number>`count(case when ${customerOrders.orderStatus} = 'new' then 1 end)::int`,
      inProgressCount: sql<number>`count(case when ${customerOrders.orderStatus} in ('qualified', 'accepted') then 1 end)::int`,
      completedCount: sql<number>`count(case when ${customerOrders.orderStatus} = 'completed' then 1 end)::int`,
    })
    .from(customerOrders);

  return {
    totalOrders: row?.total ?? 0,
    newOrders: row?.newCount ?? 0,
    inProgressOrders: row?.inProgressCount ?? 0,
    completedOrders: row?.completedCount ?? 0,
  };
}

/** Computes daily order volume trends for the last N days. */
export async function getOrderTrends(
  db: Database,
  options: { sellerId?: string; days?: number } = {},
): Promise<Array<{ date: string; label: string; count: number; value: number }>> {
  const days = options.days ?? 14;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [gte(customerOrders.createdAt, since)];
  if (options.sellerId) {
    conditions.push(eq(customerOrders.sellerId, options.sellerId));
  }

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${customerOrders.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(customerOrders)
    .where(and(...conditions))
    .groupBy(sql`date_trunc('day', ${customerOrders.createdAt})`)
    .orderBy(sql`date_trunc('day', ${customerOrders.createdAt})`);

  const countMap = new Map<string, number>();
  for (const r of rows) {
    countMap.set(r.day, r.count);
  }

  // Generate continuous timeline of days
  const result: Array<{ date: string; label: string; count: number; value: number }> = [];
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const count = countMap.get(dateStr) ?? 0;
    result.push({
      date: dateStr,
      label: formatter.format(d),
      count,
      value: count,
    });
  }

  return result;
}

/** Computes monthly order/invitation volume trends for a given year (Jan - Dec). */
export async function getMonthlyOrderTrends(
  db: Database,
  options: { year?: number; sellerId?: string; workspaceId?: string } = {},
): Promise<Array<{ month: number; label: string; count: number; value: number }>> {
  const year = options.year ?? new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const monthCounts = new Map<number, number>();

  if (options.workspaceId) {
    // Workspace-level: count invitations created per month
    const rows = await db
      .select({
        monthNum: sql<number>`extract(month from ${invitations.createdAt})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, options.workspaceId),
          gte(invitations.createdAt, startOfYear),
          lte(invitations.createdAt, endOfYear),
        ),
      )
      .groupBy(sql`extract(month from ${invitations.createdAt})`);

    for (const r of rows) {
      monthCounts.set(r.monthNum, r.count);
    }
  } else {
    // Platform or Seller-level: count customer orders
    const conditions = [
      gte(customerOrders.createdAt, startOfYear),
      lte(customerOrders.createdAt, endOfYear),
    ];
    if (options.sellerId) {
      conditions.push(eq(customerOrders.sellerId, options.sellerId));
    }

    const rows = await db
      .select({
        monthNum: sql<number>`extract(month from ${customerOrders.createdAt})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(customerOrders)
      .where(and(...conditions))
      .groupBy(sql`extract(month from ${customerOrders.createdAt})`);

    for (const r of rows) {
      monthCounts.set(r.monthNum, r.count);
    }
  }

  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return MONTH_NAMES.map((label, idx) => {
    const month = idx + 1;
    const count = monthCounts.get(month) ?? 0;
    return {
      month,
      label,
      count,
      value: count,
    };
  });
}
