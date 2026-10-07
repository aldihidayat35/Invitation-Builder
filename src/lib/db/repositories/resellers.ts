import { and, desc, eq, sql } from "drizzle-orm";
import {
  resellerProfiles,
  users,
  workspaceMembers,
  workspaces,
  type ResellerProfile,
  type User,
  type Workspace,
} from "../schema";
import type { Database } from "../types";
import { getGlobalOrderStats } from "./orders";

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
    .where(eq(resellerProfiles.customDomain, customDomain))
    .limit(1);
  return row;
}

/** Atomically provisions a Reseller user, their dedicated agency workspace, and profile. */
export async function createResellerWithProfile(
  db: Database,
  input: CreateResellerInput,
): Promise<{ user: User; profile: ResellerProfile; workspace: Workspace }> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: input.passwordHash ?? null,
        systemRole: "reseller",
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
        customDomain: input.customDomain ?? null,
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
  const [updated] = await db
    .update(resellerProfiles)
    .set({ isActive })
    .where(eq(resellerProfiles.id, resellerProfileId))
    .returning();
  if (!updated) throw new Error(`Reseller profile not found: ${resellerProfileId}`);
  return updated;
}

export interface UpdateResellerBrandingInput {
  agencyName?: string;
  whatsappContact?: string;
  logoUrl?: string | null;
  brandColor?: string;
  customDomain?: string | null;
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
      updatedAt: new Date(),
    })
    .where(eq(resellerProfiles.id, resellerProfileId))
    .returning();
  if (!updated) throw new Error(`Reseller profile not found: ${resellerProfileId}`);
  return updated;
}

/** Aggregates platform-wide reseller and order statistics for the Owner dashboard. */
export async function getAdminResellerStats(db: Database): Promise<{
  totalResellers: number;
  activeResellers: number;
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
}> {
  const [resellersRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(case when ${resellerProfiles.isActive} then 1 end)::int`,
    })
    .from(resellerProfiles);

  const orderStats = await getGlobalOrderStats(db);

  return {
    totalResellers: resellersRow?.total ?? 0,
    activeResellers: resellersRow?.active ?? 0,
    totalOrders: orderStats.totalOrders,
    newOrders: orderStats.newOrders,
    completedOrders: orderStats.completedOrders,
  };
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
