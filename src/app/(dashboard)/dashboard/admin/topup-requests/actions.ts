"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { approveTopup, rejectTopup } from "@/features/admin/api";
import type { ActionState } from "@/features/admin/types";

const rejectSchema = z.object({
  requestId: z.string().uuid("ID permintaan tidak valid"),
  reason: z.string().trim().min(3, "Alasan penolakan minimal 3 karakter"),
});

export async function approveTopupAction(requestId: string): Promise<void> {
  await approveTopup(requestId);
  revalidatePath("/dashboard/admin/topup-requests");
  revalidatePath("/dashboard/admin/resellers");
  revalidatePath("/dashboard/admin/transactions");
}

export async function rejectTopupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestId = String(formData.get("requestId") || "");
  const reason = String(formData.get("reason") || "");

  const parseResult = rejectSchema.safeParse({ requestId, reason });
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Input tidak valid" };
  }

  try {
    await rejectTopup(parseResult.data.requestId, parseResult.data.reason);
    revalidatePath("/dashboard/admin/topup-requests");
    revalidatePath("/dashboard/admin/resellers");
    return { ok: true, message: "Permintaan top-up berhasil ditolak." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal memproses penolakan permohonan",
    };
  }
}
