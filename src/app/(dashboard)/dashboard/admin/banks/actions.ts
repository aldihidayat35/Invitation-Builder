"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import {
  createMasterBank,
  deleteMasterBank,
  resetMasterBanksToDefault,
  toggleMasterBankStatus,
  updateMasterBank,
} from "@/features/banks";
import { getWorkspaceContext } from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/auth/errors";

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function requireOwner() {
  const { user } = await getWorkspaceContext();
  if (user.systemRole !== "owner") {
    throw new ForbiddenError("Hanya Super Admin yang diizinkan mengelola bank master.");
  }
  return user;
}

function refreshBanks() {
  revalidatePath("/dashboard/admin/banks");
  revalidatePath("/dashboard/admin/orders");
}

export async function createMasterBankAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    await requireOwner();

    const name = text(formData, "name");
    const code = text(formData, "code") || name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const category = (text(formData, "category") || "bank") as "bank" | "ewallet" | "qris";
    const logoUrl = text(formData, "logoUrl") || `/images/banks/${code}.svg`;
    const sortOrder = parseInt(text(formData, "sortOrder") || "0", 10) || 0;
    const isActive = formData.get("isActive") !== "false";

    if (!name) return { ok: false, error: "Nama bank / e-wallet wajib diisi." };
    if (!code) return { ok: false, error: "Kode unik bank wajib diisi." };

    await createMasterBank({
      name,
      code,
      category,
      logoUrl,
      sortOrder,
      isActive,
    });

    refreshBanks();
    return { ok: true, message: `Bank ${name} berhasil ditambahkan.` };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menambahkan bank." };
  }
}

export async function updateMasterBankAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    await requireOwner();

    const id = text(formData, "id");
    const name = text(formData, "name");
    const code = text(formData, "code");
    const category = text(formData, "category") as "bank" | "ewallet" | "qris";
    const logoUrl = text(formData, "logoUrl");
    const sortOrder = parseInt(text(formData, "sortOrder") || "0", 10) || 0;
    const isActive = formData.get("isActive") === "true";

    if (!id) return { ok: false, error: "ID bank tidak ditemukan." };
    if (!name) return { ok: false, error: "Nama bank tidak boleh kosong." };

    await updateMasterBank(id, {
      name,
      code: code || undefined,
      category: category || "bank",
      logoUrl: logoUrl || undefined,
      sortOrder,
      isActive,
    });

    refreshBanks();
    return { ok: true, message: `Data bank ${name} berhasil diperbarui.` };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal memperbarui bank." };
  }
}

export async function toggleMasterBankAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    await requireOwner();

    const id = text(formData, "id");
    if (!id) return { ok: false, error: "ID bank tidak ditemukan." };

    const updated = await toggleMasterBankStatus(id);
    refreshBanks();
    return {
      ok: true,
      message: `Status ${updated.name} berhasil diubah ke ${updated.isActive ? "Aktif" : "Nonaktif"}.`,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengubah status bank." };
  }
}

export async function deleteMasterBankAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    await requireOwner();

    const id = text(formData, "id");
    if (!id) return { ok: false, error: "ID bank tidak ditemukan." };

    await deleteMasterBank(id);
    refreshBanks();
    return { ok: true, message: "Bank berhasil dihapus dari master." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal menghapus bank." };
  }
}

export async function resetMasterBanksAction(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    await requireOwner();

    await resetMasterBanksToDefault();
    refreshBanks();
    return { ok: true, message: "Seluruh bank master telah direset ke 16 bank default." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mereset bank master." };
  }
}

export async function uploadBankLogoAction(
  formData: FormData,
): Promise<{ ok: true; url: string; filename: string } | { ok: false; error: string }> {
  try {
    await requireOwner();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "File logo tidak ditemukan atau kosong." };
    }

    // Maksimal 2MB
    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: "Ukuran file logo maksimal 2MB." };
    }

    const mime = file.type.toLowerCase();
    const allowedMimes = ["image/svg+xml", "image/png", "image/webp", "image/jpeg", "image/jpg"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExts = ["svg", "png", "webp", "jpg", "jpeg"];

    if (!allowedMimes.includes(mime) && !allowedExts.includes(ext)) {
      return { ok: false, error: "Format file tidak didukung. Gunakan SVG, PNG, WebP, atau JPG." };
    }

    const safeExt = ext === "jpeg" ? "jpg" : ext || (mime === "image/svg+xml" ? "svg" : "png");
    const code = text(formData, "code") || "bank";
    const cleanCode = code.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "logo";
    const filename = `${cleanCode}-${Date.now()}.${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public", "images", "banks", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/images/banks/uploads/${filename}`;
    return { ok: true, url: publicUrl, filename };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengunggah logo bank." };
  }
}
