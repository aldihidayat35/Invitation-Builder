import { and, desc, eq, sql } from "drizzle-orm";
import type { CreditTransactionType } from "../../schema/domain";
import {
  creditTransactions,
  resellerProfiles,
  users,
  workspaceMembers,
  workspaces,
  type CreditTransaction,
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
  initialCredits?: number;
  performedBy?: string;
}

export interface AdjustCreditInput {
  resellerProfileId: string;
  amount: number;
  type: CreditTransactionType;
  referenceId?: string | null;
  notes?: string | null;
  performedBy?: string | null;
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

    const initialCredits = Math.max(0, input.initialCredits ?? 0);
    const [profile] = await tx
      .insert(resellerProfiles)
      .values({
        userId: user.id,
        agencyName: input.agencyName.trim(),
        slug: input.slug.trim().toLowerCase(),
        whatsappContact: input.whatsappContact.trim(),
        logoUrl: input.logoUrl ?? null,
        creditQuota: initialCredits,
      })
      .returning();
    if (!profile) throw new Error("createResellerWithProfile: failed to insert profile");

    if (initialCredits > 0) {
      await tx.insert(creditTransactions).values({
        resellerId: profile.id,
        type: "owner_grant",
        amount: initialCredits,
        balanceBefore: 0,
        balanceAfter: initialCredits,
        notes: "Initial grant on reseller provisioning",
        performedBy: input.performedBy ?? null,
      });
    }

    return { user, profile, workspace };
  });
}

/** Atomically adjusts a reseller's credit quota and writes to the audit ledger. */
export async function adjustResellerCredit(
  db: Database,
  input: AdjustCreditInput,
): Promise<{ profile: ResellerProfile; transaction: CreditTransaction }> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select()
      .from(resellerProfiles)
      .where(eq(resellerProfiles.id, input.resellerProfileId))
      .limit(1);

    if (!profile) {
      throw new Error(`Reseller profile not found: ${input.resellerProfileId}`);
    }

    const balanceBefore = profile.creditQuota;
    const balanceAfter = balanceBefore + input.amount;

    if (balanceAfter < 0) {
      throw new Error(
        `Insufficient credit quota: current balance is ${balanceBefore}, cannot deduct ${Math.abs(input.amount)}`,
      );
    }

    const [updatedProfile] = await tx
      .update(resellerProfiles)
      .set({ creditQuota: balanceAfter })
      .where(eq(resellerProfiles.id, profile.id))
      .returning();

    if (!updatedProfile) throw new Error("adjustResellerCredit: failed to update quota");

    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        resellerId: profile.id,
        type: input.type,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        referenceId: input.referenceId ?? null,
        notes: input.notes ?? null,
        performedBy: input.performedBy ?? null,
      })
      .returning();

    if (!transaction) throw new Error("adjustResellerCredit: failed to insert transaction ledger");

    return { profile: updatedProfile, transaction };
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

/** Lists all credit ledger transactions for a specific reseller profile. */
export async function listCreditTransactions(
  db: Database,
  resellerProfileId: string,
  limit: number = 50,
): Promise<CreditTransaction[]> {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.resellerId, resellerProfileId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}
