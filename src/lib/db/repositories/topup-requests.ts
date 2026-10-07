import { and, desc, eq, sql } from "drizzle-orm";
import type { TopupRequestStatus } from "../../schema/domain";
import {
  bankAccounts,
  creditTransactions,
  resellerProfiles,
  topupRequests,
  users,
  type BankAccount,
  type CreditTransaction,
  type ResellerProfile,
  type TopupRequest,
  type User,
} from "../schema";
import type { Database } from "../types";

export interface CreateTopupRequestInput {
  resellerId: string;
  creditAmount: number;
  amountPaid: number;
  bankAccountId?: string | null;
  senderBank: string;
  senderAccountName: string;
  proofFileUrl: string;
  notes?: string | null;
}

export interface ApproveTopupRequestInput {
  requestId: string;
  reviewedBy: string;
  notes?: string | null;
}

export interface RejectTopupRequestInput {
  requestId: string;
  rejectionReason: string;
  reviewedBy: string;
}

export interface EnrichedTopupRequestItem {
  request: TopupRequest;
  reseller: ResellerProfile;
  user: User;
  bankAccount: BankAccount | null;
}

export async function listTopupRequests(
  db: Database,
  filterStatus?: TopupRequestStatus,
  limit: number = 50,
): Promise<EnrichedTopupRequestItem[]> {
  const query = db
    .select({
      request: topupRequests,
      reseller: resellerProfiles,
      user: users,
      bankAccount: bankAccounts,
    })
    .from(topupRequests)
    .innerJoin(resellerProfiles, eq(topupRequests.resellerId, resellerProfiles.id))
    .innerJoin(users, eq(resellerProfiles.userId, users.id))
    .leftJoin(bankAccounts, eq(topupRequests.bankAccountId, bankAccounts.id));

  if (filterStatus) {
    return query
      .where(eq(topupRequests.status, filterStatus))
      .orderBy(desc(topupRequests.createdAt))
      .limit(limit);
  }

  return query.orderBy(desc(topupRequests.createdAt)).limit(limit);
}

export async function listResellerTopupRequests(
  db: Database,
  resellerProfileId: string,
  limit: number = 50,
): Promise<EnrichedTopupRequestItem[]> {
  return db
    .select({
      request: topupRequests,
      reseller: resellerProfiles,
      user: users,
      bankAccount: bankAccounts,
    })
    .from(topupRequests)
    .innerJoin(resellerProfiles, eq(topupRequests.resellerId, resellerProfiles.id))
    .innerJoin(users, eq(resellerProfiles.userId, users.id))
    .leftJoin(bankAccounts, eq(topupRequests.bankAccountId, bankAccounts.id))
    .where(eq(topupRequests.resellerId, resellerProfileId))
    .orderBy(desc(topupRequests.createdAt))
    .limit(limit);
}

export async function findTopupRequestById(
  db: Database,
  id: string,
): Promise<EnrichedTopupRequestItem | undefined> {
  const [row] = await db
    .select({
      request: topupRequests,
      reseller: resellerProfiles,
      user: users,
      bankAccount: bankAccounts,
    })
    .from(topupRequests)
    .innerJoin(resellerProfiles, eq(topupRequests.resellerId, resellerProfiles.id))
    .innerJoin(users, eq(resellerProfiles.userId, users.id))
    .leftJoin(bankAccounts, eq(topupRequests.bankAccountId, bankAccounts.id))
    .where(eq(topupRequests.id, id))
    .limit(1);

  return row;
}

export async function createTopupRequest(
  db: Database,
  input: CreateTopupRequestInput,
): Promise<TopupRequest> {
  const [created] = await db
    .insert(topupRequests)
    .values({
      resellerId: input.resellerId,
      creditAmount: input.creditAmount,
      amountPaid: input.amountPaid,
      bankAccountId: input.bankAccountId ?? null,
      senderBank: input.senderBank.trim(),
      senderAccountName: input.senderAccountName.trim(),
      proofFileUrl: input.proofFileUrl.trim(),
      notes: input.notes?.trim() ?? null,
      status: "pending",
    })
    .returning();

  if (!created) throw new Error("createTopupRequest: failed to insert topup request");
  return created;
}

/** Atomically approves a pending topup request, increments reseller quota, and logs credit transaction. */
export async function approveTopupRequest(
  db: Database,
  input: ApproveTopupRequestInput,
): Promise<{
  request: TopupRequest;
  profile: ResellerProfile;
  transaction: CreditTransaction;
}> {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(topupRequests)
      .where(and(eq(topupRequests.id, input.requestId), eq(topupRequests.status, "pending")))
      .limit(1);

    if (!request) {
      throw new Error(`Topup request not found or not in pending state: ${input.requestId}`);
    }

    const [profile] = await tx
      .select()
      .from(resellerProfiles)
      .where(eq(resellerProfiles.id, request.resellerId))
      .limit(1);

    if (!profile) {
      throw new Error(`Reseller profile not found: ${request.resellerId}`);
    }

    const balanceBefore = profile.creditQuota;
    const balanceAfter = balanceBefore + request.creditAmount;

    // 1. Update reseller credit quota
    const [updatedProfile] = await tx
      .update(resellerProfiles)
      .set({
        creditQuota: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(resellerProfiles.id, profile.id))
      .returning();

    if (!updatedProfile) throw new Error("approveTopupRequest: failed to update reseller quota");

    // 2. Insert credit transaction ledger
    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        resellerId: profile.id,
        type: "owner_grant",
        amount: request.creditAmount,
        balanceBefore,
        balanceAfter,
        referenceId: request.id,
        notes:
          input.notes ??
          `Persetujuan transfer manual via ${request.senderBank} a.n. ${request.senderAccountName}`,
        performedBy: input.reviewedBy,
      })
      .returning();

    if (!transaction) {
      throw new Error("approveTopupRequest: failed to insert credit transaction");
    }

    // 3. Mark topup request as approved
    const [updatedRequest] = await tx
      .update(topupRequests)
      .set({
        status: "approved",
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(topupRequests.id, request.id))
      .returning();

    if (!updatedRequest) throw new Error("approveTopupRequest: failed to update request status");

    return {
      request: updatedRequest,
      profile: updatedProfile,
      transaction,
    };
  });
}

/** Rejects a pending topup request with a reason. */
export async function rejectTopupRequest(
  db: Database,
  input: RejectTopupRequestInput,
): Promise<TopupRequest> {
  const [updated] = await db
    .update(topupRequests)
    .set({
      status: "rejected",
      rejectionReason: input.rejectionReason.trim(),
      reviewedBy: input.reviewedBy,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(topupRequests.id, input.requestId), eq(topupRequests.status, "pending")))
    .returning();

  if (!updated) {
    throw new Error(`Topup request not found or already processed: ${input.requestId}`);
  }

  return updated;
}

/** Gets the count of currently pending top-up requests for badge display. */
export async function getPendingTopupCount(db: Database): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(topupRequests)
    .where(eq(topupRequests.status, "pending"));

  return row?.count ?? 0;
}
