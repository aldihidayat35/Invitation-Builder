import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOrders, getAdminStats } from "@/features/admin/api";
import { AdminOrdersTable, AdminStatsCards } from "@/features/admin/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireOwner } from "@/lib/auth/server";
import { updateOrderStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Pusat Pengolahan Pesanan Customer — Super Admin",
};

export default async function AdminOrdersPage() {
  await requireOwner();
  const [orders, stats] = await Promise.all([
    getAdminOrders(),
    getAdminStats(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • PESANAN CUSTOMER"
        title="Pesanan Customer & Pengolahan Data"
        description="Admin memiliki wewenang penuh mutlak untuk membuat, mengedit data website undangan, dan menerbitkan website undangan bagi customer yang memesan melalui mitra seller."
        actions={
          <Link
            href="/dashboard/invitations"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
          >
            <span>Buka Daftar Undangan</span>
            <span>→</span>
          </Link>
        }
      />

      <AdminStatsCards stats={stats} />

      <AdminOrdersTable
        orders={orders}
        onUpdateStatus={updateOrderStatusAction}
      />
    </div>
  );
}
