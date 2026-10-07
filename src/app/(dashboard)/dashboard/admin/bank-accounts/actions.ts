"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createAdminBankAccount,
  deleteAdminBankAccount,
  toggleAdminBankAccount,
} from "@/features/admin/api";
import type { ActionState } from "@/features/admin/types";

const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2, "Nama bank minimal 2 karakter"),
  accountNumber: z.string().trim().min(4, "Nomor rekening minimal 4 digit"),
  accountHolder: z.string().trim().min(2, "Nama pemilik minimal 2 karakter"),
  qrCodeUrl: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createBankAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = bankAccountSchema.safeParse({
    bankName: field(formData, "bankName"),
    accountNumber: field(formData, "accountNumber"),
    accountHolder: field(formData, "accountHolder"),
    qrCodeUrl: field(formData, "qrCodeUrl"),
    instructions: field(formData, "instructions"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Input tidak valid" };
  }

  try {
    const res = await createAdminBankAccount(parseResult.data);
    revalidatePath("/dashboard/admin/bank-accounts");
    return { ok: true, message: `Rekening ${res.bankName} berhasil ditambahkan.` };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal menambahkan rekening",
    };
  }
}

export async function toggleBankAccountStatusAction(
  id: string,
  nextStatus: boolean,
): Promise<void> {
  await toggleAdminBankAccount(id, nextStatus);
  revalidatePath("/dashboard/admin/bank-accounts");
}

export async function deleteBankAccountAction(id: string): Promise<void> {
  await deleteAdminBankAccount(id);
  revalidatePath("/dashboard/admin/bank-accounts");
}
