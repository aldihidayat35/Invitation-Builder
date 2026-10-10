"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateAgencyBranding, verifyOwnCustomDomain } from "@/features/reseller/api";
import type { ActionState } from "@/features/reseller/types";

const brandingSchema = z.object({
  agencyName: z.string().trim().min(2, "Nama toko minimal 2 karakter"),
  whatsappContact: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit"),
  logoUrl: z.string().trim().optional(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Format warna heksadesimal tidak valid")
    .optional(),
  customDomain: z.string().trim().optional(),
  heroImageUrl: z.string().trim().optional(),
  heroTitle: z.string().trim().optional(),
  heroSubtitle: z.string().trim().optional(),
  heroBadge: z.string().trim().optional(),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function verifyDomainAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _prev;
  void _formData;
  try {
    const result = await verifyOwnCustomDomain();
    revalidatePath("/dashboard/reseller/branding");
    return result.domainStatus === "verified" || result.domainStatus === "active"
      ? {
          ok: true,
          message:
            result.domainStatus === "active"
              ? "DNS dan TLS domain aktif."
              : "DNS terverifikasi. Aktivasi TLS sedang menunggu tim platform.",
        }
      : { error: "TXT verifikasi belum ditemukan. Propagasi DNS dapat memerlukan waktu." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal memeriksa domain." };
  }
}

export async function updateBrandingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parseResult = brandingSchema.safeParse({
    agencyName: field(formData, "agencyName"),
    whatsappContact: field(formData, "whatsappContact"),
    logoUrl: field(formData, "logoUrl"),
    brandColor: field(formData, "brandColor") || "#84633f",
    customDomain: field(formData, "customDomain"),
    heroImageUrl: field(formData, "heroImageUrl"),
    heroTitle: field(formData, "heroTitle"),
    heroSubtitle: field(formData, "heroSubtitle"),
    heroBadge: field(formData, "heroBadge"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Data toko tidak valid" };
  }

  try {
    const updated = await updateAgencyBranding({
      agencyName: parseResult.data.agencyName,
      whatsappContact: parseResult.data.whatsappContact,
      logoUrl: parseResult.data.logoUrl || null,
      brandColor: parseResult.data.brandColor,
      customDomain: parseResult.data.customDomain || null,
      heroImageUrl: parseResult.data.heroImageUrl || null,
      heroTitle: parseResult.data.heroTitle || null,
      heroSubtitle: parseResult.data.heroSubtitle || null,
      heroBadge: parseResult.data.heroBadge || null,
    });

    revalidatePath("/dashboard/reseller");
    revalidatePath("/dashboard/reseller/storefront");
    revalidatePath("/dashboard/reseller/branding");
    if (updated?.slug) {
      revalidatePath(`/seller/${updated.slug}`);
    }
    return { ok: true, message: "Pengaturan website toko & identitas seller berhasil disimpan." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan toko",
    };
  }
}
