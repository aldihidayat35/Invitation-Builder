"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adjustCredit, createReseller, toggleResellerStatus } from "@/features/admin/api";
import type { ActionState } from "@/features/admin/types";
import type { CreditTransactionType } from "@/lib/schema/domain";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const createResellerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid").toLowerCase(),
  password: z.string().optional(),
  agencyName: z.string().trim().min(2, "Nama agensi minimal 2 karakter"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"),
  whatsappContact: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit"),
  initialCredits: z.coerce.number().int().min(0, "Kuota tidak boleh negatif").default(10),
});

const adjustCreditSchema = z.object({
  resellerProfileId: z.string().uuid("ID reseller tidak valid"),
  amount: z.coerce
    .number()
    .int()
    .refine((val) => val !== 0, "Nominal kuota tidak boleh 0"),
  type: z.enum([
    "owner_grant",
    "purchase_topup",
    "publish_deduct",
    "unpublish_refund",
    "manual_adjustment",
  ]),
  referenceId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createResellerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = createResellerSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    agencyName: field(formData, "agencyName"),
    slug: field(formData, "slug"),
    whatsappContact: field(formData, "whatsappContact"),
    initialCredits: field(formData, "initialCredits"),
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message ?? "Data input tidak valid.";
    return { error: errorMsg };
  }

  try {
    const result = await createReseller(parseResult.data);
    revalidatePath("/dashboard/admin/resellers");
    revalidatePath("/dashboard/admin/transactions");
    return { ok: true, message: `Reseller ${result.profile.agencyName} berhasil dibuat.` };
  } catch (error) {
    const errText = error instanceof Error ? error.message : String(error);
    if (errText.includes("users_email_lower_uq") || errText.includes("unique")) {
      return { error: "Email atau slug agensi sudah digunakan oleh reseller lain." };
    }
    return { error: `Gagal membuat reseller: ${errText}` };
  }
}

export async function adjustCreditAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = adjustCreditSchema.safeParse({
    resellerProfileId: field(formData, "resellerProfileId"),
    amount: field(formData, "amount"),
    type: field(formData, "type"),
    referenceId: field(formData, "referenceId"),
    notes: field(formData, "notes"),
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message ?? "Input kuota tidak valid.";
    return { error: errorMsg };
  }

  const { resellerProfileId, amount, type, referenceId, notes } = parseResult.data;

  try {
    await adjustCredit({
      resellerProfileId,
      amount,
      type: type as CreditTransactionType,
      referenceId,
      notes,
    });

    revalidatePath("/dashboard/admin/resellers");
    revalidatePath("/dashboard/admin/transactions");
    return {
      ok: true,
      message: `Kuota berhasil diperbarui (${amount > 0 ? "+" : ""}${amount} kredit).`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Gagal menyesuaikan kuota.",
    };
  }
}

export async function toggleResellerStatusAction(
  profileId: string,
  nextStatus: boolean,
): Promise<void> {
  await toggleResellerStatus(profileId, nextStatus);
  revalidatePath("/dashboard/admin/resellers");
}
