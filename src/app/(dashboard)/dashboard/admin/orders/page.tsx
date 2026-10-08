import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminOrders,
  getAdminOrderStats,
  getAdminMonthlyOrderTrends,
  getAdminOrderTrends,
} from "@/features/admin/api";
import { AdminOrdersTable, AdminOrderStatsCards } from "@/features/admin/components";
import { OrderTrendAnalytics } from "@/features/analytics";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireOwner } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Pusat Pengolahan Pesanan Customer — Super Admin",
};

export default async function AdminOrdersPage() {
  await requireOwner();
  const currentYear = new Date().getFullYear();

  const [orders, stats, monthlyTrends, dailyTrends] = await Promise.all([
    getAdminOrders(),
    getAdminOrderStats(),
    getAdminMonthlyOrderTrends(currentYear),
    getAdminOrderTrends(30),
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

      {/* 4 Kartu Metrik Khusus Konteks Pesanan */}
      <AdminOrderStatsCards stats={stats} />

      {/* Grafik Tren Pemesanan Setahun */}
      <OrderTrendAnalytics
        title={`Tren Pemesanan Setahun (${currentYear})`}
        subtitle={`Grafik fluktuasi dan akumulasi pesanan customer per bulan (Jan – Des ${currentYear})`}
        monthlyData={monthlyTrends}
        dailyData={dailyTrends}
        year={currentYear}
        valueSuffix=" pesanan"
      />

      <AdminOrdersTable orders={orders} />
    </div>
  );
}
