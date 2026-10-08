import type { Metadata } from "next";
import {
  getAdminResellers,
  getAdminResellerStats,
  getAdminTopResellers,
} from "@/features/admin/api";
import {
  AdminResellerStatsCards,
  CreateResellerModal,
  ResellersManager,
  TopResellersTrendChart,
} from "@/features/admin/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireOwner } from "@/lib/auth/server";
import { createResellerAction, toggleResellerStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Manajemen Mitra Seller — Super Admin",
};

export default async function AdminResellersPage() {
  await requireOwner();
  const [resellers, stats, topSellers] = await Promise.all([
    getAdminResellers(),
    getAdminResellerStats(),
    getAdminTopResellers(10),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • MITRA SELLER"
        title="Manajemen Mitra Seller"
        description="Kelola pendaftaran mitra seller, pantau toko online mereka, dan konfigurasi domain khusus seller."
        actions={<CreateResellerModal action={createResellerAction} />}
      />

      {/* 4 Kartu Metrik Khusus Konteks Mitra Seller */}
      <AdminResellerStatsCards stats={stats} />

      {/* Grafik Tren Seller Terbanyak Mendapat Orderan */}
      <TopResellersTrendChart topSellers={topSellers} />

      {/* Tabel Manajemen Mitra Seller */}
      <ResellersManager
        resellers={resellers}
        toggleStatusAction={toggleResellerStatusAction}
      />
    </div>
  );
}
