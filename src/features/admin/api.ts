import "server-only";

import { requireOwner } from "@/lib/auth/server";
import { assertPasswordPolicy, hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  createBankAccount as repoCreateBankAccount,
  deleteBankAccount as repoDeleteBankAccount,
  listBankAccounts as repoListBankAccounts,
  toggleBankAccountStatus as repoToggleBankAccount,
  updateBankAccount as repoUpdateBankAccount,
  type CreateBankAccountInput,
  type UpdateBankAccountInput,
} from "@/lib/db/repositories/bank-accounts";
import {
  adjustResellerCredit as repoAdjustCredit,
  createResellerWithProfile as repoCreateReseller,
  getAdminResellerStats as repoGetStats,
  listAllCreditTransactions as repoListAllTx,
  listResellers as repoListResellers,
  updateResellerStatus as repoUpdateStatus,
} from "@/lib/db/repositories/resellers";
import {
  approveTopupRequest as repoApproveTopup,
  getTopupFinancialRecap as repoGetFinancialRecap,
  listTopupRequests as repoListTopupRequests,
  rejectTopupRequest as repoRejectTopup,
} from "@/lib/db/repositories/topup-requests";
import type { BankAccount } from "@/lib/db/schema";
import type { Database } from "@/lib/db/types";
import type { CreditTransactionType, TopupRequestStatus } from "@/lib/schema/domain";
import type {
  AdminResellerItem,
  AdminStats,
  AdminTopupFinancialRecap,
  AdminTopupRequestItem,
  AdminTransactionItem,
} from "./types";

export interface CreateResellerServiceInput {
  name: string;
  email: string;
  password?: string;
  agencyName: string;
  slug: string;
  whatsappContact: string;
  initialCredits?: number;
}

export interface AdjustCreditServiceInput {
  resellerProfileId: string;
  amount: number;
  type: CreditTransactionType;
  referenceId?: string;
  notes?: string;
}

/** Fetches platform statistics for the Admin dashboard. */
export async function getAdminStats(): Promise<AdminStats> {
  await requireOwner();
  const db = await getDb();
  return repoGetStats(db);
}

/** Lists all registered resellers with profiles. */
export async function getAdminResellers(): Promise<AdminResellerItem[]> {
  await requireOwner();
  const db = await getDb();
  return repoListResellers(db);
}

/** Lists all credit ledger transactions across all resellers. */
export async function getAdminTransactions(limit: number = 100): Promise<AdminTransactionItem[]> {
  await requireOwner();
  const db = await getDb();
  return repoListAllTx(db, limit);
}

/** Provisions a new reseller with workspace, profile, and initial credits. */
export async function createReseller(input: CreateResellerServiceInput) {
  const actor = await requireOwner();
  const db = await getDb();

  const effectivePassword =
    input.password && input.password.trim().length > 0 ? input.password.trim() : "reseller12345#";
  assertPasswordPolicy(effectivePassword);
  const passwordHash = await hashPassword(effectivePassword);

  const result = await repoCreateReseller(db, {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    agencyName: input.agencyName.trim(),
    slug: input.slug.trim().toLowerCase(),
    whatsappContact: input.whatsappContact.trim(),
    initialCredits: input.initialCredits ?? 10,
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
      initialCredits: input.initialCredits ?? 10,
    },
  });

  return result;
}

/** Adjusts credit quota and writes to the audit ledger. */
export async function adjustCredit(input: AdjustCreditServiceInput) {
  const actor = await requireOwner();
  const db = await getDb();

  const result = await repoAdjustCredit(db, {
    resellerProfileId: input.resellerProfileId,
    amount: input.amount,
    type: input.type,
    referenceId: input.referenceId || null,
    notes: input.notes || null,
    performedBy: actor.id,
  });

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "reseller.credit_adjust",
    entityType: "reseller_profile",
    entityId: input.resellerProfileId,
    metadata: {
      amount: input.amount,
      type: input.type,
      balanceBefore: result.transaction.balanceBefore,
      balanceAfter: result.transaction.balanceAfter,
      referenceId: input.referenceId,
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

// ==================== MANUAL TRANSFER & BANK ACCOUNTS ====================

/** Lists all bank accounts managed by the Owner. */
export async function getAdminBankAccounts(): Promise<BankAccount[]> {
  await requireOwner();
  const db = await getDb();
  return repoListBankAccounts(db);
}

/** Creates a new bank account or payment target for manual transfer. */
export async function createAdminBankAccount(input: CreateBankAccountInput) {
  const actor = await requireOwner();
  const db = await getDb();
  const result = await repoCreateBankAccount(db, input);
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "bank_account.create",
    entityType: "bank_account",
    entityId: result.id,
    metadata: { bankName: result.bankName, accountNumber: result.accountNumber },
  });
  return result;
}

/** Updates an existing bank account. */
export async function updateAdminBankAccount(id: string, input: UpdateBankAccountInput) {
  const actor = await requireOwner();
  const db = await getDb();
  const result = await repoUpdateBankAccount(db, id, input);
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "bank_account.update",
    entityType: "bank_account",
    entityId: result.id,
    metadata: { bankName: result.bankName, accountNumber: result.accountNumber },
  });
  return result;
}

/** Toggles active status of a bank account. */
export async function toggleAdminBankAccount(id: string, isActive: boolean) {
  const actor = await requireOwner();
  const db = await getDb();
  const result = await repoToggleBankAccount(db, id, isActive);
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "bank_account.update",
    entityType: "bank_account",
    entityId: result.id,
    metadata: { isActive },
  });
  return result;
}

/** Deletes a bank account. */
export async function deleteAdminBankAccount(id: string) {
  const actor = await requireOwner();
  const db = await getDb();
  await repoDeleteBankAccount(db, id);
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "bank_account.delete",
    entityType: "bank_account",
    entityId: id,
    metadata: {},
  });
}

/** Lists all top-up requests with reseller details and proof images. */
export async function getAdminTopupRequests(
  status?: TopupRequestStatus,
  limit: number = 50,
): Promise<AdminTopupRequestItem[]> {
  await requireOwner();
  const db = await getDb();
  return repoListTopupRequests(db, status, limit);
}

/** Fetches financial and volume recap for top-up requests. */
export async function getAdminTopupFinancialRecap(
  dbOverride?: Database,
): Promise<AdminTopupFinancialRecap> {
  if (!dbOverride) {
    await requireOwner();
  }
  const db = dbOverride ?? (await getDb());
  return repoGetFinancialRecap(db);
}

/** Atomically approves a manual transfer top-up request. */
export async function approveTopup(requestId: string, notes?: string) {
  const actor = await requireOwner();
  const db = await getDb();
  const result = await repoApproveTopup(db, {
    requestId,
    reviewedBy: actor.id,
    notes: notes ?? null,
  });
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "topup_request.approve",
    entityType: "topup_request",
    entityId: requestId,
    metadata: {
      resellerId: result.profile.id,
      creditsGranted: result.request.creditAmount,
      amountPaid: result.request.amountPaid,
      newQuota: result.profile.creditQuota,
    },
  });
  return result;
}

/** Rejects a manual transfer top-up request with explanation. */
export async function rejectTopup(requestId: string, reason: string) {
  const actor = await requireOwner();
  const db = await getDb();
  const result = await repoRejectTopup(db, {
    requestId,
    rejectionReason: reason,
    reviewedBy: actor.id,
  });
  await insertAuditLog(db, {
    workspaceId: null,
    actorId: actor.id,
    action: "topup_request.reject",
    entityType: "topup_request",
    entityId: requestId,
    metadata: {
      resellerId: result.resellerId,
      rejectionReason: reason,
    },
  });
  return result;
}
