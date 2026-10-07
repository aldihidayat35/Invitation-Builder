import type { BankAccount, CreditTransaction, ResellerProfile, TopupRequest, User } from "@/lib/db/schema";

export interface AdminResellerItem {
  profile: ResellerProfile;
  user: User;
}

export interface AdminTransactionItem {
  transaction: CreditTransaction;
  reseller: ResellerProfile;
  user: User;
}

export interface AdminTopupRequestItem {
  request: TopupRequest;
  reseller: ResellerProfile;
  user: User;
  bankAccount: BankAccount | null;
}

export interface AdminBankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrCodeUrl: string | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStats {
  totalResellers: number;
  activeResellers: number;
  totalQuota: number;
  totalTransactions: number;
  pendingTopups: number;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

