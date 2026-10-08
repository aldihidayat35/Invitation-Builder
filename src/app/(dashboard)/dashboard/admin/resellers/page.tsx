import type { Metadata } from "next";
import { getAdminResellers, getAdminStats } from "@/features/admin/api";
import { AdminStatsCards, CreateResellerModal, ResellersManager } from "@/features/admin/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { createResellerAction, toggleResellerStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Manajemen Mitra Seller — Super Admin",
};

export default async function AdminResellersPage() {
  const [resellers, stats] = await Promise.all([
    getAdminResellers(),
    getAdminStats(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • MITRA SELLER"
        title="Manajemen Mitra Seller"
        description="Kelola pendaftaran mitra seller, pantau toko online mereka, dan konfigurasi domain khusus seller."
        actions={<CreateResellerModal action={createResellerAction} />}
      />

      <AdminStatsCards stats={stats} />

      <ResellersManager
        resellers={resellers}
        toggleStatusAction={toggleResellerStatusAction}
      />
    </div>
  );
}
