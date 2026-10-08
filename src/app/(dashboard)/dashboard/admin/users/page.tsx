import type { Metadata } from "next";
import { requireOwner, requireUser } from "@/lib/auth/server";
import {
  getAdminUsersList,
  getAdminUsersSummary,
  getAvailableResellers,
} from "@/features/admin/users/api";
import { UserManager } from "@/features/admin/users/components";

export const metadata: Metadata = {
  title: "Manajemen Pengguna Platform — Super Admin",
  description: "Kelola akun pengguna, peran sistem, kredensial, dan status akun platform secara terpusat.",
};

export default async function AdminUsersPage() {
  await requireOwner();
  const currentUser = await requireUser();

  const [users, summary, availableResellers] = await Promise.all([
    getAdminUsersList({ limit: 500 }),
    getAdminUsersSummary(),
    getAvailableResellers(),
  ]);

  return (
    <UserManager
      initialUsers={users}
      initialSummary={summary}
      availableResellers={availableResellers}
      currentUserId={currentUser.id}
    />
  );
}
