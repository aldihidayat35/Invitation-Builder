import { desc, eq } from "drizzle-orm";
import {
  bankAccounts,
  type BankAccount,
} from "../schema";
import type { Database } from "../types";

export interface CreateBankAccountInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrCodeUrl?: string | null;
  instructions?: string | null;
  isActive?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  qrCodeUrl?: string | null;
  instructions?: string | null;
  isActive?: boolean;
}

export async function listBankAccounts(
  db: Database,
  onlyActive: boolean = false,
): Promise<BankAccount[]> {
  const query = db.select().from(bankAccounts);
  if (onlyActive) {
    return query.where(eq(bankAccounts.isActive, true)).orderBy(desc(bankAccounts.createdAt));
  }
  return query.orderBy(desc(bankAccounts.createdAt));
}

export async function findBankAccountById(
  db: Database,
  id: string,
): Promise<BankAccount | undefined> {
  const [row] = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.id, id))
    .limit(1);
  return row;
}

export async function createBankAccount(
  db: Database,
  input: CreateBankAccountInput,
): Promise<BankAccount> {
  const [created] = await db
    .insert(bankAccounts)
    .values({
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      accountHolder: input.accountHolder.trim(),
      qrCodeUrl: input.qrCodeUrl ?? null,
      instructions: input.instructions ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();
  if (!created) throw new Error("createBankAccount: failed to insert bank account");
  return created;
}

export async function updateBankAccount(
  db: Database,
  id: string,
  input: UpdateBankAccountInput,
): Promise<BankAccount> {
  const [updated] = await db
    .update(bankAccounts)
    .set({
      ...(input.bankName !== undefined && { bankName: input.bankName.trim() }),
      ...(input.accountNumber !== undefined && { accountNumber: input.accountNumber.trim() }),
      ...(input.accountHolder !== undefined && { accountHolder: input.accountHolder.trim() }),
      ...(input.qrCodeUrl !== undefined && { qrCodeUrl: input.qrCodeUrl }),
      ...(input.instructions !== undefined && { instructions: input.instructions }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(bankAccounts.id, id))
    .returning();
  if (!updated) throw new Error(`updateBankAccount: bank account not found (${id})`);
  return updated;
}

export async function toggleBankAccountStatus(
  db: Database,
  id: string,
  isActive: boolean,
): Promise<BankAccount> {
  return updateBankAccount(db, id, { isActive });
}

export async function deleteBankAccount(db: Database, id: string): Promise<void> {
  await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
}
