"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import {
  createUserWithWorkspace,
  deleteUserAccount,
  findUserById,
  listUsersWithDetails,
  updateUserDetails,
} from "@/lib/db/repositories/users";
import type { UserStatus } from "@/lib/schema/domain";
import type {
  ActionResponse,
  CreateUserInputForm,
  UpdateUserInputForm,
  UserListItem,
} from "./types";
import type { ListUsersFilter } from "./api";

/** Server action to provision a new user */
export async function createUserAction(
  input: CreateUserInputForm,
): Promise<ActionResponse<UserListItem>> {
  try {
    const actor = await requireOwner();
    const db = await getDb();

    if (!input.name || input.name.trim().length < 2) {
      return { ok: false, error: "Nama pengguna minimal 2 karakter." };
    }

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return { ok: false, error: "Format alamat email tidak valid." };
    }

    if (!input.password || input.password.length < 10) {
      return { ok: false, error: "Kata sandi awal wajib diisi dan minimal 10 karakter." };
    }

    const created = await createUserWithWorkspace(db, {
      name: input.name,
      email: input.email,
      password: input.password,
      systemRole: input.systemRole,
      status: input.status,
      resellerId: input.resellerId || null,
      agencyName: input.agencyName,
      slug: input.slug,
      whatsappContact: input.whatsappContact,
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: actor.id,
      action: "user.create",
      entityType: "user",
      entityId: created.user.id,
      metadata: {
        name: created.user.name,
        email: created.user.email,
        systemRole: created.user.systemRole,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    const [detail] = await listUsersWithDetails(db, {
      limit: 1,
      search: created.user.email,
    });

    return {
      ok: true,
      data: detail,
      message: `Pengguna "${created.user.name}" berhasil dibuat.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengguna.";
    return { ok: false, error: message };
  }
}

/** Server action to update existing user information */
export async function updateUserAction(
  input: UpdateUserInputForm,
): Promise<ActionResponse<UserListItem>> {
  try {
    const actor = await requireOwner();
    const db = await getDb();

    const targetUser = await findUserById(db, input.userId);
    if (!targetUser) {
      return { ok: false, error: "Pengguna tidak ditemukan." };
    }

    // Safety: prevent self-demoting or self-disabling
    if (actor.id === input.userId) {
      if (input.systemRole !== "owner") {
        return {
          ok: false,
          error: "Anda tidak dapat menurunkan peran Super Admin untuk akun Anda sendiri.",
        };
      }
      if (input.status === "disabled") {
        return {
          ok: false,
          error: "Anda tidak dapat menonaktifkan akun Super Admin Anda sendiri yang sedang aktif.",
        };
      }
    }

    if (!input.name || input.name.trim().length < 2) {
      return { ok: false, error: "Nama pengguna minimal 2 karakter." };
    }

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return { ok: false, error: "Format alamat email tidak valid." };
    }

    await updateUserDetails(db, {
      userId: input.userId,
      name: input.name,
      email: input.email,
      systemRole: input.systemRole,
      status: input.status,
      resellerId: input.resellerId || null,
      password: input.newPassword?.trim() ? input.newPassword : undefined,
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: actor.id,
      action: "user.update",
      entityType: "user",
      entityId: input.userId,
      metadata: {
        name: input.name,
        email: input.email,
        systemRole: input.systemRole,
        status: input.status,
        passwordChanged: Boolean(input.newPassword?.trim()),
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    const [updatedDetail] = await listUsersWithDetails(db, {
      limit: 1,
      search: input.email,
    });

    return {
      ok: true,
      data: updatedDetail,
      message: `Data pengguna "${input.name}" berhasil diperbarui.`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui pengguna.";
    return { ok: false, error: message };
  }
}

/** Server action to toggle account active / disabled state */
export async function toggleUserStatusAction(
  userId: string,
  nextStatus: UserStatus,
): Promise<ActionResponse> {
  try {
    const actor = await requireOwner();
    const db = await getDb();

    if (actor.id === userId && nextStatus === "disabled") {
      return {
        ok: false,
        error: "Anda tidak dapat menonaktifkan akun Anda sendiri.",
      };
    }

    await updateUserDetails(db, {
      userId,
      status: nextStatus,
    });

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: actor.id,
      action: "user.update",
      entityType: "user",
      entityId: userId,
      metadata: { status: nextStatus },
    });

    revalidatePath("/dashboard/admin/users");
    return {
      ok: true,
      message: `Status akun diubah menjadi ${nextStatus === "active" ? "Aktif" : "Nonaktif"}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status akun pengguna.";
    return { ok: false, error: message };
  }
}

/** Server action to safely delete user account */
export async function deleteUserAction(userId: string): Promise<ActionResponse> {
  try {
    const actor = await requireOwner();
    const db = await getDb();

    if (actor.id === userId) {
      return {
        ok: false,
        error: "Anda tidak dapat menghapus akun Anda sendiri saat sedang login.",
      };
    }

    const targetUser = await findUserById(db, userId);
    if (!targetUser) {
      return { ok: false, error: "Pengguna tidak ditemukan." };
    }

    const result = await deleteUserAccount(db, userId);

    await insertAuditLog(db, {
      workspaceId: null,
      actorId: actor.id,
      action: "user.delete",
      entityType: "user",
      entityId: userId,
      metadata: {
        deletedUserEmail: targetUser.email,
        deletedUserName: targetUser.name,
        systemRole: targetUser.systemRole,
        mode: result.mode,
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    const message =
      result.mode === "archived"
        ? `Akun "${targetUser.name}" berhasil dinonaktifkan & diarsipkan (riwayat audit log tetap terlindungi).`
        : `Akun "${targetUser.name}" berhasil dihapus permanen dari sistem.`;

    return { ok: true, message };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus akun pengguna.";
    return { ok: false, error: message };
  }
}

/** Server action to fetch updated users list on client-side state changes */
export async function fetchUsersListAction(
  filter: ListUsersFilter = {},
): Promise<ActionResponse<UserListItem[]>> {
  try {
    await requireOwner();
    const db = await getDb();
    const users = await listUsersWithDetails(db, filter);
    return { ok: true, data: users };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar pengguna.";
    return { ok: false, error: message };
  }
}
