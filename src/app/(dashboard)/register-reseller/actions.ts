"use server";

import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { findUserByEmail } from "@/lib/db/repositories/users";
import {
  createResellerWithProfile,
  findResellerProfileBySlug,
} from "@/lib/db/repositories/resellers";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { assertPasswordPolicy, hashPassword } from "@/lib/auth/password";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const registerResellerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
    email: z.string().trim().email("Format email tidak valid").toLowerCase(),
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    agencyName: z.string().trim().min(2, "Nama brand/toko minimal 2 karakter"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(SLUG_REGEX, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"),
    whatsappContact: z.string().trim().min(8, "Nomor WhatsApp minimal 8 digit"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok dengan password",
    path: ["confirmPassword"],
  });

export interface RegisterResellerState {
  ok?: boolean;
  message?: string;
  error?: string;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerResellerAction(
  _prev: RegisterResellerState,
  formData: FormData,
): Promise<RegisterResellerState> {
  const parseResult = registerResellerSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    confirmPassword: field(formData, "confirmPassword"),
    agencyName: field(formData, "agencyName"),
    slug: field(formData, "slug"),
    whatsappContact: field(formData, "whatsappContact"),
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message ?? "Data pendaftaran tidak valid.";
    return { error: errorMsg };
  }

  const data = parseResult.data;
  const db = await getDb();

  // 1. Check existing email
  const existingUser = await findUserByEmail(db, data.email);
  if (existingUser) {
    return { error: "Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda." };
  }

  // 2. Check existing slug
  const existingSlug = await findResellerProfileBySlug(db, data.slug);
  if (existingSlug) {
    return { error: "Slug toko / URL ini sudah digunakan reseller lain. Silakan pilih slug yang lain." };
  }

  try {
    assertPasswordPolicy(data.password);
    const passwordHash = await hashPassword(data.password);

    // Format clean Indonesian phone number
    let cleanPhone = data.whatsappContact.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    const result = await createResellerWithProfile(db, {
      name: data.name,
      email: data.email,
      passwordHash,
      agencyName: data.agencyName,
      slug: data.slug,
      whatsappContact: cleanPhone,
      isActive: false, // Menunggu persetujuan (ACC) dari Admin
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: result.user.id,
      action: "reseller.create",
      entityType: "reseller_profile",
      entityId: result.profile.id,
      metadata: {
        agencyName: result.profile.agencyName,
        slug: result.profile.slug,
        email: result.user.email,
      },
    });

    return {
      ok: true,
      message:
        "Pendaftaran akun Reseller berhasil! Akun Anda sedang menunggu persetujuan (ACC) dari Admin. Kami akan mengonfirmasi aktivasi akun Anda melalui WhatsApp.",
    };
  } catch (error) {
    const errText = error instanceof Error ? error.message : String(error);
    if (errText.includes("unique") || errText.includes("users_email_lower_uq")) {
      return { error: "Email atau slug toko sudah terdaftar." };
    }
    console.error("registerResellerAction failed unexpectedly:", error);
    return { error: `Gagal memproses pendaftaran: ${errText}` };
  }
}
