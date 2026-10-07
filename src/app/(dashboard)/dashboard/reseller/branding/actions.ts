"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateAgencyBranding } from "@/features/reseller/api";
import type { ActionState } from "@/features/reseller/types";

const brandingSchema = z.object({
  agencyName: z.string().trim().min(2, "Nama agensi minimal 2 karakter"),
  whatsappContact: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit"),
  logoUrl: z.string().trim().optional(),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Format warna heksadesimal tidak valid"),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateBrandingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = brandingSchema.safeParse({
    agencyName: field(formData, "agencyName"),
    whatsappContact: field(formData, "whatsappContact"),
    logoUrl: field(formData, "logoUrl"),
    brandColor: field(formData, "brandColor") || "#3b82f6",
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Data branding tidak valid" };
  }

  try {
    await updateAgencyBranding({
      agencyName: parseResult.data.agencyName,
      whatsappContact: parseResult.data.whatsappContact,
      logoUrl: parseResult.data.logoUrl || null,
      brandColor: parseResult.data.brandColor,
    });

    revalidatePath("/dashboard/reseller");
    revalidatePath("/dashboard/reseller/branding");
    return { ok: true, message: "Pengaturan identitas agensi berhasil disimpan." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan branding",
    };
  }
}
