import "server-only";

import { requireReseller } from "@/lib/auth/server";
import { assertPasswordPolicy, hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import type { Database } from "@/lib/db/types";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { listBankAccounts } from "@/lib/db/repositories/bank-accounts";
import {
  createResellerClient,
  findResellerProfileByUserId,
  listCreditTransactions,
  updateResellerBranding,
  type UpdateResellerBrandingInput,
} from "@/lib/db/repositories/resellers";
import {
  createTopupRequest,
  listResellerTopupRequests,
} from "@/lib/db/repositories/topup-requests";
import { listUsersByReseller } from "@/lib/db/repositories/users";
import type {
  ResellerBankAccountItem,
  ResellerClientItem,
  ResellerOverviewStats,
  ResellerTopupRequestItem,
} from "./types";

/** Fetches dashboard summary statistics for the authenticated reseller. */
export async function getResellerOverview(): Promise<ResellerOverviewStats> {
  const { profile, user } = await requireReseller();
  const db = await getDb();

  const [clients, txs, topups] = await Promise.all([
    listUsersByReseller(db, user.id),
    listCreditTransactions(db, profile.id, 100),
    listResellerTopupRequests(db, profile.id, 50),
  ]);

  const pendingCount = topups.filter((t) => t.request.status === "pending").length;

  return {
    creditQuota: profile.creditQuota,
    totalClients: clients.length,
    totalTransactions: txs.length,
    pendingTopups: pendingCount,
    agencyName: profile.agencyName,
    slug: profile.slug,
  };
}

/** Fetches active destination bank accounts and recent top-up requests for the top-up page. */
export async function getResellerTopupInfo(): Promise<{
  bankAccounts: ResellerBankAccountItem[];
  recentRequests: ResellerTopupRequestItem[];
}> {
  const { profile } = await requireReseller();
  const db = await getDb();

  const [rawAccounts, rawRequests] = await Promise.all([
    listBankAccounts(db, true), // only active
    listResellerTopupRequests(db, profile.id, 10),
  ]);

  const bankAccounts: ResellerBankAccountItem[] = rawAccounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    accountHolder: a.accountHolder,
    qrCodeUrl: a.qrCodeUrl,
    instructions: a.instructions,
  }));

  const recentRequests: ResellerTopupRequestItem[] = rawRequests.map((r) => ({
    id: r.request.id,
    creditAmount: r.request.creditAmount,
    amountPaid: r.request.amountPaid,
    senderBank: r.request.senderBank,
    senderAccountName: r.request.senderAccountName,
    proofFileUrl: r.request.proofFileUrl,
    notes: r.request.notes,
    status: r.request.status as "pending" | "approved" | "rejected" | "cancelled",
    rejectionReason: r.request.rejectionReason,
    createdAt: r.request.createdAt,
    bankAccount: r.bankAccount
      ? {
          bankName: r.bankAccount.bankName,
          accountNumber: r.bankAccount.accountNumber,
          accountHolder: r.bankAccount.accountHolder,
        }
      : null,
  }));

  return { bankAccounts, recentRequests };
}

/** Submits a manual transfer top-up request with payment proof. */
export async function submitTopupRequest(input: {
  creditAmount: number;
  amountPaid: number;
  bankAccountId?: string;
  senderBank: string;
  senderAccountName: string;
  proofFileUrl: string;
  notes?: string;
}) {
  const { profile, user } = await requireReseller();
  const db = await getDb();

  const created = await createTopupRequest(db, {
    resellerId: profile.id,
    creditAmount: input.creditAmount,
    amountPaid: input.amountPaid,
    bankAccountId: input.bankAccountId || null,
    senderBank: input.senderBank.trim(),
    senderAccountName: input.senderAccountName.trim(),
    proofFileUrl: input.proofFileUrl.trim(),
    notes: input.notes?.trim() || null,
  });

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: user.id,
    action: "reseller.update",
    entityType: "topup_request",
    entityId: created.id,
    metadata: {
      type: "manual_topup_submit",
      creditAmount: input.creditAmount,
      amountPaid: input.amountPaid,
    },
  });

  return created;
}

/** Fetches full transactions history (topup requests and credit ledger) for the reseller. */
export async function getResellerTransactionsHistory(limit: number = 50) {
  const { profile } = await requireReseller();
  const db = await getDb();

  const [rawRequests, rawTxs] = await Promise.all([
    listResellerTopupRequests(db, profile.id, limit),
    listCreditTransactions(db, profile.id, limit),
  ]);

  const requests: ResellerTopupRequestItem[] = rawRequests.map((r) => ({
    id: r.request.id,
    creditAmount: r.request.creditAmount,
    amountPaid: r.request.amountPaid,
    senderBank: r.request.senderBank,
    senderAccountName: r.request.senderAccountName,
    proofFileUrl: r.request.proofFileUrl,
    notes: r.request.notes,
    status: r.request.status as "pending" | "approved" | "rejected" | "cancelled",
    rejectionReason: r.request.rejectionReason,
    createdAt: r.request.createdAt,
    bankAccount: r.bankAccount
      ? {
          bankName: r.bankAccount.bankName,
          accountNumber: r.bankAccount.accountNumber,
          accountHolder: r.bankAccount.accountHolder,
        }
      : null,
  }));

  return { requests, transactions: rawTxs };
}

/** Lists all end-user clients under this reseller agency. */
export async function getResellerClientsList(): Promise<ResellerClientItem[]> {
  const { user } = await requireReseller();
  const db = await getDb();

  const clients = await listUsersByReseller(db, user.id);
  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    status: c.status,
    createdAt: c.createdAt,
  }));
}

/** Creates a client under this reseller. */
export async function createClientForReseller(input: {
  clientName: string;
  clientEmail: string;
  password?: string;
}) {
  const { user } = await requireReseller();
  const db = await getDb();

  const effectivePassword =
    input.password && input.password.trim().length > 0 ? input.password.trim() : "klien12345#";
  assertPasswordPolicy(effectivePassword);
  const passwordHash = await hashPassword(effectivePassword);

  const slug = `client-${Date.now().toString(36)}`;

  const result = await createResellerClient(db, {
    resellerUserId: user.id,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    passwordHash,
    workspaceName: `${input.clientName} Workspace`,
    workspaceSlug: slug,
  });

  await insertAuditLog(db, {
    workspaceId: result.workspace.id,
    actorId: user.id,
    action: "reseller.client_create",
    entityType: "user",
    entityId: result.clientUser.id,
    metadata: {
      clientEmail: result.clientUser.email,
      workspaceSlug: slug,
    },
  });

  return result;
}

/** Fetches reseller profile for branding settings. */
export async function getResellerBrandingProfile() {
  const { profile } = await requireReseller();
  return {
    id: profile.id,
    agencyName: profile.agencyName,
    slug: profile.slug,
    whatsappContact: profile.whatsappContact,
    logoUrl: profile.logoUrl,
    brandColor: profile.brandColor,
    customDomain: profile.customDomain,
  };
}

/** Updates reseller agency branding. */
export async function updateAgencyBranding(input: UpdateResellerBrandingInput) {
  const { profile, user } = await requireReseller();
  const db = await getDb();

  const updated = await updateResellerBranding(db, profile.id, input);

  await insertAuditLog(db, {
    workspaceId: null,
    actorId: user.id,
    action: "reseller.update",
    entityType: "reseller_profile",
    entityId: profile.id,
    metadata: { type: "branding_update", agencyName: input.agencyName },
  });

  return updated;
}

/** Fetches agency branding details for client display (white-label badge & support). */
export async function getClientAgencyBranding(resellerUserId: string, dbOverride?: Database) {
  const db = dbOverride ?? (await getDb());
  const profile = await findResellerProfileByUserId(db, resellerUserId);
  if (!profile || !profile.isActive) return null;
  return {
    agencyName: profile.agencyName,
    whatsappContact: profile.whatsappContact,
    logoUrl: profile.logoUrl,
    brandColor: profile.brandColor,
    customDomain: profile.customDomain,
  };
}

