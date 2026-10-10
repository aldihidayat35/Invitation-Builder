import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  customerOrders,
  resellerProfiles,
  sessions,
  users,
  workspaceMembers,
  workspaces,
  type ResellerProfile,
  type User,
  type Workspace,
} from "../schema";
import type { Database } from "../types";

export interface CreateResellerInput {
  email: string;
  name: string;
  passwordHash?: string | null;
  agencyName: string;
  slug: string;
  whatsappContact: string;
  logoUrl?: string | null;
  customDomain?: string | null;
  performedBy?: string;
  isActive?: boolean;
}

export interface CreateResellerClientInput {
  resellerUserId: string;
  clientName: string;
  clientEmail: string;
  passwordHash?: string | null;
  workspaceName?: string;
  workspaceSlug: string;
}

export async function findResellerProfileByUserId(
  db: Database,
  userId: string,
): Promise<ResellerProfile | undefined> {
  const [row] = await db
    .select()
    .from(resellerProfiles)
    .where(eq(resellerProfiles.userId, userId))
    .limit(1);
  return row;
}

export async function findResellerProfileById(
  db: Database,
  id: string,
): Promise<ResellerProfile | undefined> {
  const [row] = await db
    .select()
    .from(resellerProfiles)
    .where(eq(resellerProfiles.id, id))
    .limit(1);
  return row;
}

export async function findResellerProfileBySlug(
  db: Database,
  slug: string,
): Promise<ResellerProfile | undefined> {
  const [row] = await db
    .select()
    .from(resellerProfiles)
    .where(eq(resellerProfiles.slug, slug))
    .limit(1);
  return row;
}

export async function findResellerProfileByCustomDomain(
  db: Database,
  customDomain: string,
): Promise<ResellerProfile | undefined> {
  const [row] = await db
    .select()
    .from(resellerProfiles)
    .where(
      and(
        eq(resellerProfiles.customDomain, customDomain),
        eq(resellerProfiles.domainStatus, "active"),
        eq(resellerProfiles.tlsStatus, "active"),
      ),
    )
    .limit(1);
  return row;
}

/** Atomically provisions a Reseller user, their dedicated agency workspace, and profile. */
export async function createResellerWithProfile(
  db: Database,
  input: CreateResellerInput,
): Promise<{ user: User; profile: ResellerProfile; workspace: Workspace }> {
  return db.transaction(async (tx) => {
    const isActive = input.isActive ?? true;
    const [user] = await tx
      .insert(users)
      .values({
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: input.passwordHash ?? null,
        systemRole: "reseller",
        status: isActive ? "active" : "disabled",
      })
      .returning();
    if (!user) throw new Error("createResellerWithProfile: failed to insert user");

    const workspaceSlug = `agency-${input.slug}`;
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: input.agencyName,
        slug: workspaceSlug,
      })
      .returning();
    if (!workspace) throw new Error("createResellerWithProfile: failed to insert workspace");

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    const [profile] = await tx
      .insert(resellerProfiles)
      .values({
        userId: user.id,
        agencyName: input.agencyName.trim(),
        slug: input.slug.trim().toLowerCase(),
        whatsappContact: input.whatsappContact.trim(),
        logoUrl: input.logoUrl ?? null,
        customDomain: input.customDomain?.trim().toLowerCase() || null,
        domainStatus: input.customDomain ? "pending" : "unconfigured",
        domainVerificationToken: input.customDomain ? randomBytes(18).toString("base64url") : null,
        tlsStatus: input.customDomain ? "pending" : "unconfigured",
        isActive,
      })
      .returning();
    if (!profile) throw new Error("createResellerWithProfile: failed to insert profile");

    return { user, profile, workspace };
  });
}

/** Provisions an end-user client associated with a Reseller agency. */
export async function createResellerClient(
  db: Database,
  input: CreateResellerClientInput,
): Promise<{ clientUser: User; workspace: Workspace }> {
  return db.transaction(async (tx) => {
    const [resellerUser] = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, input.resellerUserId), eq(users.systemRole, "reseller")))
      .limit(1);

    if (!resellerUser) {
      throw new Error(`Invalid reseller: ${input.resellerUserId}`);
    }

    const [clientUser] = await tx
      .insert(users)
      .values({
        email: input.clientEmail.trim().toLowerCase(),
        name: input.clientName.trim(),
        passwordHash: input.passwordHash ?? null,
        systemRole: "client",
        resellerId: resellerUser.id,
      })
      .returning();

    if (!clientUser) throw new Error("createResellerClient: failed to insert client user");

    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: input.workspaceName ?? `${input.clientName}'s Workspace`,
        slug: input.workspaceSlug.trim().toLowerCase(),
      })
      .returning();

    if (!workspace) throw new Error("createResellerClient: failed to insert client workspace");

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: clientUser.id,
      role: "owner",
    });

    return { clientUser, workspace };
  });
}

/** Lists all resellers with their profile information and user credentials. */
export async function listResellers(
  db: Database,
): Promise<Array<{ profile: ResellerProfile; user: User }>> {
  const rows = await db
    .select({
      profile: resellerProfiles,
      user: users,
    })
    .from(resellerProfiles)
    .innerJoin(users, eq(users.id, resellerProfiles.userId))
    .orderBy(desc(resellerProfiles.createdAt));

  return rows;
}

/** Toggles active status of a reseller agency profile. */
export async function updateResellerStatus(
  db: Database,
  resellerProfileId: string,
  isActive: boolean,
): Promise<ResellerProfile> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(resellerProfiles)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(resellerProfiles.id, resellerProfileId))
      .returning();
    if (!updated) throw new Error(`Reseller profile not found: ${resellerProfileId}`);

    await tx
      .update(users)
      .set({ status: isActive ? "active" : "disabled", updatedAt: new Date() })
      .where(eq(users.id, updated.userId));
    await tx.delete(sessions).where(eq(sessions.userId, updated.userId));

    return updated;
  });
}

export interface UpdateResellerBrandingInput {
  agencyName?: string;
  whatsappContact?: string;
  logoUrl?: string | null;
  brandColor?: string;
  customDomain?: string | null;
  domainStatus?: "unconfigured" | "pending" | "verified" | "active" | "failed";
  domainVerificationToken?: string | null;
  domainVerifiedAt?: Date | null;
  domainLastCheckedAt?: Date | null;
  tlsStatus?: "unconfigured" | "pending" | "active" | "failed";
  tlsActivatedAt?: Date | null;
  heroImageUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroBadge?: string | null;
}

export async function updateResellerBranding(
  db: Database,
  resellerProfileId: string,
  input: UpdateResellerBrandingInput,
): Promise<ResellerProfile> {
  const [updated] = await db
    .update(resellerProfiles)
    .set({
      ...(input.agencyName !== undefined && { agencyName: input.agencyName.trim() }),
      ...(input.whatsappContact !== undefined && { whatsappContact: input.whatsappContact.trim() }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.brandColor !== undefined && { brandColor: input.brandColor.trim() }),
      ...(input.customDomain !== undefined && { customDomain: input.customDomain }),
      ...(input.domainStatus !== undefined && { domainStatus: input.domainStatus }),
      ...(input.domainVerificationToken !== undefined && {
        domainVerificationToken: input.domainVerificationToken,
      }),
      ...(input.domainVerifiedAt !== undefined && { domainVerifiedAt: input.domainVerifiedAt }),
      ...(input.domainLastCheckedAt !== undefined && {
        domainLastCheckedAt: input.domainLastCheckedAt,
      }),
      ...(input.tlsStatus !== undefined && { tlsStatus: input.tlsStatus }),
      ...(input.tlsActivatedAt !== undefined && { tlsActivatedAt: input.tlsActivatedAt }),
      ...(input.heroImageUrl !== undefined && { heroImageUrl: input.heroImageUrl }),
      ...(input.heroTitle !== undefined && { heroTitle: input.heroTitle }),
      ...(input.heroSubtitle !== undefined && { heroSubtitle: input.heroSubtitle }),
      ...(input.heroBadge !== undefined && { heroBadge: input.heroBadge }),
      updatedAt: new Date(),
    })
    .where(eq(resellerProfiles.id, resellerProfileId))
    .returning();
  if (!updated) throw new Error(`Reseller profile not found: ${resellerProfileId}`);
  return updated;
}

export interface TopResellerTrendItem {
  sellerId: string;
  agencyName: string;
  slug: string;
  logoUrl: string | null;
  whatsappContact: string;
  customDomain: string | null;
  isActive: boolean;
  ownerName: string;
  ownerEmail: string;
  totalOrders: number;
  completedOrders: number;
  newOrders: number;
  inProgressOrders: number;
  percentageOfTotal: number;
}

/** Aggregates platform-wide reseller statistics for the Admin Resellers dashboard. */
export async function getAdminResellerStats(db: Database): Promise<{
  totalResellers: number;
  activeResellers: number;
  inactiveResellers: number;
  totalOrders: number;
  resellersWithOrders: number;
  newOrders: number;
  completedOrders: number;
}> {
  const [resellersRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(case when ${resellerProfiles.isActive} then 1 end)::int`,
      inactive: sql<number>`count(case when not ${resellerProfiles.isActive} then 1 end)::int`,
    })
    .from(resellerProfiles);

  const [ordersSummary] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      resellersWithOrders: sql<number>`count(distinct ${customerOrders.sellerId})::int`,
      newOrders: sql<number>`count(case when ${customerOrders.orderStatus} = 'new' then 1 end)::int`,
      completedOrders: sql<number>`count(case when ${customerOrders.orderStatus} = 'completed' then 1 end)::int`,
    })
    .from(customerOrders);

  return {
    totalResellers: resellersRow?.total ?? 0,
    activeResellers: resellersRow?.active ?? 0,
    inactiveResellers: resellersRow?.inactive ?? 0,
    totalOrders: ordersSummary?.totalOrders ?? 0,
    resellersWithOrders: ordersSummary?.resellersWithOrders ?? 0,
    newOrders: ordersSummary?.newOrders ?? 0,
    completedOrders: ordersSummary?.completedOrders ?? 0,
  };
}

/** Queries top sellers ranked by customer order count for performance & trend tracking. */
export async function getTopResellersByOrders(
  db: Database,
  limit: number = 8,
): Promise<TopResellerTrendItem[]> {
  const rows = await db
    .select({
      sellerId: resellerProfiles.id,
      agencyName: resellerProfiles.agencyName,
      slug: resellerProfiles.slug,
      logoUrl: resellerProfiles.logoUrl,
      whatsappContact: resellerProfiles.whatsappContact,
      customDomain: resellerProfiles.customDomain,
      isActive: resellerProfiles.isActive,
      ownerName: users.name,
      ownerEmail: users.email,
      totalOrders: sql<number>`count(${customerOrders.id})::int`,
      completedOrders: sql<number>`count(case when ${customerOrders.orderStatus} = 'completed' then 1 end)::int`,
      newOrders: sql<number>`count(case when ${customerOrders.orderStatus} = 'new' then 1 end)::int`,
      inProgressOrders: sql<number>`count(case when ${customerOrders.orderStatus} in ('qualified', 'accepted') then 1 end)::int`,
    })
    .from(resellerProfiles)
    .innerJoin(users, eq(users.id, resellerProfiles.userId))
    .leftJoin(customerOrders, eq(customerOrders.sellerId, resellerProfiles.id))
    .groupBy(resellerProfiles.id, users.id)
    .orderBy(desc(sql`count(${customerOrders.id})`), desc(resellerProfiles.createdAt))
    .limit(limit);

  const totalAllOrders = rows.reduce((sum, r) => sum + r.totalOrders, 0);

  return rows.map((r) => ({
    sellerId: r.sellerId,
    agencyName: r.agencyName,
    slug: r.slug,
    logoUrl: r.logoUrl,
    whatsappContact: r.whatsappContact,
    customDomain: r.customDomain,
    isActive: r.isActive,
    ownerName: r.ownerName,
    ownerEmail: r.ownerEmail,
    totalOrders: r.totalOrders,
    completedOrders: r.completedOrders,
    newOrders: r.newOrders,
    inProgressOrders: r.inProgressOrders,
    percentageOfTotal: totalAllOrders > 0 ? Math.round((r.totalOrders / totalAllOrders) * 100) : 0,
  }));
}

/**
 * Resolves the ResellerProfile affiliated with a workspace (or actor).
 * Returns undefined if the workspace/actor belongs to a direct platform client or owner.
 */
export async function findAffiliatedResellerProfile(
  db: Database,
  workspaceId: string,
  actorUserId?: string,
): Promise<ResellerProfile | undefined> {
  // 1. Look up the workspace owner
  const [owner] = await db
    .select({
      id: users.id,
      systemRole: users.systemRole,
      resellerId: users.resellerId,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "owner")))
    .limit(1);

  if (owner) {
    if (owner.systemRole === "reseller") {
      return findResellerProfileByUserId(db, owner.id);
    }
    if (owner.resellerId) {
      return findResellerProfileByUserId(db, owner.resellerId);
    }
  }

  // 2. Fallback to actor if owner check did not reveal reseller affiliation
  if (actorUserId) {
    const [actorUser] = await db
      .select({
        id: users.id,
        systemRole: users.systemRole,
        resellerId: users.resellerId,
      })
      .from(users)
      .where(eq(users.id, actorUserId))
      .limit(1);

    if (actorUser) {
      if (actorUser.systemRole === "reseller") {
        return findResellerProfileByUserId(db, actorUser.id);
      }
      if (actorUser.resellerId) {
        return findResellerProfileByUserId(db, actorUser.resellerId);
      }
    }
  }

  return undefined;
}
