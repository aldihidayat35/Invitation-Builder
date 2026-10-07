"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { submitTopupRequest } from "@/features/reseller/api";
import type { ActionState } from "@/features/reseller/types";

const submitTopupSchema = z.object({
  creditAmount: z.coerce.number().int().positive("Jumlah kuota harus lebih dari 0"),
  amountPaid: z.coerce.number().int().positive("Nominal bayar harus lebih dari 0"),
  bankAccountId: z.string().uuid().optional(),
  senderBank: z.string().trim().min(2, "Nama bank pengirim minimal 2 karakter"),
  senderAccountName: z.string().trim().min(2, "Nama pengirim minimal 2 karakter"),
  proofFileUrl: z.string().trim().url("URL bukti transfer tidak valid"),
  notes: z.string().trim().optional(),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitTopupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = submitTopupSchema.safeParse({
    creditAmount: field(formData, "creditAmount"),
    amountPaid: field(formData, "amountPaid"),
    bankAccountId: field(formData, "bankAccountId") || undefined,
    senderBank: field(formData, "senderBank"),
    senderAccountName: field(formData, "senderAccountName"),
    proofFileUrl: field(formData, "proofFileUrl"),
    notes: field(formData, "notes"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Data permohonan tidak valid" };
  }

  try {
    await submitTopupRequest(parseResult.data);
    revalidatePath("/dashboard/reseller");
    revalidatePath("/dashboard/reseller/topup");
    revalidatePath("/dashboard/reseller/transactions");
    return {
      ok: true,
      message:
        "Bukti transfer berhasil dikirimkan! Permohonan sedang menunggu verifikasi oleh Owner.",
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal mengirimkan permohonan top-up",
    };
  }
}
