"use server";

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
