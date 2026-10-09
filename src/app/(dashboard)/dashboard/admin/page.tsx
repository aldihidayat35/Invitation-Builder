import type { Metadata } from "next";
import Link from "next/link";
import {
  getAdminStats,
  getAdminOrders,
  getAdminOrderTrends,
  getAdminMonthlyOrderTrends,
} from "@/features/admin/api";
import {
  KpiStatCard,
  OrderTrendAnalytics,
  StatusDonutChart,
} from "@/features/analytics";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireOwner } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Platform Analytics",
  description: "Executive platform dashboard for Super Admin: order volume, seller performance, and invitation workflow metrics.",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; color: string }
> = {
  new: {
    label: "Baru",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    color: "#D4AF37",
  },
  in_progress: {
    label: "Diproses",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
    color: "#84633F",
  },
  in_review: {
    label: "Review",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    color: "#63482C",
  },
  completed: {
    label: "Selesai",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    color: "#257849",
  },
  cancelled: {
    label: "Dibatalkan",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
    color: "#B3261E",
  },
};

export default async function AdminDashboardPage() {
  await requireOwner();

  const currentYear = new Date().getFullYear();

  const [stats, orders, monthlyTrends, dailyTrends] = await Promise.all([
    getAdminStats(),
    getAdminOrders(undefined, 5),
    getAdminMonthlyOrderTrends(currentYear),
    getAdminOrderTrends(30),
  ]);

  const inProgressCount = stats.totalOrders - stats.newOrders - stats.completedOrders;

  const donutSegments = [
    {
      label: "Pesanan Baru",
      value: stats.newOrders,
      color: "#D4AF37",
    },
    {
      label: "Sedang Dikerjakan",
      value: Math.max(0, inProgressCount),
      color: "#84633F",
    },
    {
      label: "Selesai Dipublish",
      value: stats.completedOrders,
      color: "#257849",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • PLATFORM CONTROL"
        title="Platform Analytics"
        description="Pantau arus pemesanan customer, kinerja mitra seller, dan status pengerjaan website undangan secara terpusat."
        actions={
          <>
            <Link
              href="/dashboard/admin/resellers"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
            >
              <span>Mitra Seller ({stats.totalResellers})</span>
            </Link>
            <Link
              href="/dashboard/admin/orders"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md hover:bg-[#BD9B2F] transition-colors"
            >
              <span>Lihat Semua Pesanan</span>
              <span>→</span>
            </Link>
          </>
        }
      />

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          title="Total Pesanan Masuk"
          value={stats.totalOrders}
          tone="bronze"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        <KpiStatCard
          title="Pesanan Baru (Antrean)"
          value={stats.newOrders}
          tone="gold"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KpiStatCard
          title="Undangan Selesai Terbit"
          value={stats.completedOrders}
          tone="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KpiStatCard
          title="Mitra Seller Terdaftar"
          value={stats.totalResellers}
          tone="default"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrderTrendAnalytics
            title="Tren Volume Pesanan (Bulan ke Bulan)"
            subtitle={`Grafik akumulasi pesanan masuk per bulan (Jan – Des ${currentYear})`}
            monthlyData={monthlyTrends}
            dailyData={dailyTrends}
            year={currentYear}
            valueSuffix=" pesanan"
          />
        </div>

        <div className="lg:col-span-1">
          <StatusDonutChart
            title="Komposisi Status Pesanan"
            subtitle="Distribusi tahapan pengerjaan saat ini"
            segments={donutSegments}
            totalLabel="Pesanan"
          />
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-[#2C221E]">Pesanan Customer Terbaru</h3>
            <p className="text-xs text-stone-400">5 pesanan terakhir yang masuk melalui etalase toko seller</p>
          </div>
          <Link
            href="/dashboard/admin/orders"
            className="text-xs font-semibold text-[#84633F] hover:text-[#715332]"
          >
            Buka Pipa Pesanan →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Belum ada pesanan masuk. Saat customer memesan di website toko seller, pesanan akan muncul di sini.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase">
                  <th className="py-2.5 px-3">Customer / Pasangan</th>
                  <th className="py-2.5 px-3">Toko Seller</th>
                  <th className="py-2.5 px-3">Tanggal Acara</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {orders.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] ?? {
                    label: item.status,
                    badgeClass: "bg-stone-100 text-stone-700",
                    color: "#888",
                  };
                  return (
                    <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <strong className="block text-[#2C221E] font-medium">{item.customerName}</strong>
                        <span className="text-[11px] text-stone-400 truncate block">
                          {item.groomBrideNames || item.customerWhatsapp}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#84633F]">{item.sellerName}</span>
                      </td>
                      <td className="py-3 px-3 text-stone-500">
                        {item.eventDate
                          ? new Date(item.eventDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/dashboard/admin/orders"
                          className="inline-flex items-center rounded-lg border border-[#D9CFC4] bg-white px-2.5 py-1 text-xs font-semibold text-[#664624] shadow-2xs hover:bg-[#FAF8F5] hover:text-[#2C221E] transition"
                        >
                          Proses Pesanan
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
