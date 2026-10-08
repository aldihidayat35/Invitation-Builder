"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createReseller, toggleResellerStatus } from "@/features/admin/api";
import type { ActionState } from "@/features/admin/types";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const createResellerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid").toLowerCase(),
  password: z.string().min(10, "Password minimal 10 karakter"),
  agencyName: z.string().trim().min(2, "Nama seller/toko minimal 2 karakter"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"),
  whatsappContact: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit"),
  customDomain: z.string().trim().optional(),
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
    customDomain: field(formData, "customDomain"),
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message ?? "Data input tidak valid.";
    return { error: errorMsg };
  }

  try {
    const result = await createReseller(parseResult.data);
    revalidatePath("/dashboard/admin/resellers");
    return { ok: true, message: `Mitra seller ${result.profile.agencyName} berhasil dibuat.` };
  } catch (error) {
    const errText = error instanceof Error ? error.message : String(error);
    if (errText.includes("users_email_lower_uq") || errText.includes("unique")) {
      return { error: "Email atau slug seller sudah digunakan oleh akun lain." };
    }
    return { error: `Gagal membuat seller: ${errText}` };
  }
}

export async function toggleResellerStatusAction(
  profileId: string,
  nextStatus: boolean,
): Promise<void> {
  await toggleResellerStatus(profileId, nextStatus);
  revalidatePath("/dashboard/admin/resellers");
}
