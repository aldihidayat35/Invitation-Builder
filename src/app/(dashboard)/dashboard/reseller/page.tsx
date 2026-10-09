import type { Metadata } from "next";
import Link from "next/link";
import { getResellerOverview, getResellerOrders, getResellerOrderTrends } from "@/features/reseller/api";
import { KpiStatCard, TrendLineChart, StatusDonutChart } from "@/features/analytics";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { SellerOnboardingGuide } from "@/features/reseller/components";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Dashboard Toko Seller",
  description: "Dashboard penjualan toko online seller, pesanan customer, dan analitik booking.",
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  new: { label: "Baru", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" },
  in_progress: { label: "Diproses Admin", badgeClass: "bg-blue-100 text-blue-900 border-blue-300" },
  in_review: { label: "Review", badgeClass: "bg-purple-100 text-purple-900 border-purple-300" },
  completed: { label: "Selesai", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  cancelled: { label: "Dibatalkan", badgeClass: "bg-rose-100 text-rose-900 border-rose-300" },
};

interface ResellerDashboardPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ResellerDashboardPage({ searchParams }: ResellerDashboardPageProps) {
  await requireReseller();
  const query = searchParams ? await searchParams : {};
  const viewParam = typeof query.view === "string" ? query.view : undefined;

  const [stats, recentOrders, trends] = await Promise.all([
    getResellerOverview(),
    getResellerOrders(5),
    getResellerOrderTrends(14),
  ]);

  // Show onboarding guide for brand-new sellers who haven't received any orders yet
  if (stats.totalOrders === 0 && viewParam !== "dashboard") {
    return (
      <SellerOnboardingGuide
        agencyName={stats.agencyName}
        slug={stats.slug}
        showDashboardLink={true}
      />
    );
  }

  const donutSegments = [
    { label: "Pesanan Baru", value: stats.newOrders, color: "#D4AF37" },
    { label: "Sedang Dikerjakan", value: stats.inProgressOrders, color: "#84633F" },
    { label: "Selesai Terbit", value: stats.completedOrders, color: "#257849" },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow={`PORTAL SELLER • ${stats.agencyName.toUpperCase()}`}
        title={stats.agencyName}
        description="Kelola toko online seller Anda, pantau pemesanan calon pengantin, dan lihat progres pengerjaan website undangan oleh Admin."
        actions={
          <>
            <Link
              href="/dashboard/reseller/guide"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
            >
              <span>📖 Panduan Seller</span>
            </Link>
            <Link
              href="/dashboard/reseller/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
            >
              <span>Daftar Pesanan ({stats.totalOrders})</span>
            </Link>
            <a
              href={`/seller/${stats.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
            >
              <span>Buka Website Toko</span>
              <span>↗</span>
            </a>
          </>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          title="Total Pesanan Toko"
          value={stats.totalOrders}
          subtitle="Customer memesan lewat toko Anda"
          tone="bronze"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        <KpiStatCard
          title="Pesanan Baru"
          value={stats.newOrders}
          subtitle="Menunggu antrean pengerjaan"
          tone="gold"
          trend={stats.newOrders > 0 ? { value: "Antrean Masuk", positive: true } : { value: "Semua Terproses", neutral: true }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <KpiStatCard
          title="Sedang Dikerjakan Admin"
          value={stats.inProgressOrders}
          subtitle="Desain sedang disiapkan di kanvas"
          tone="default"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />

        <KpiStatCard
          title="Undangan Selesai"
          value={stats.completedOrders}
          subtitle="Tautan aktif diterima customer"
          tone="emerald"
          trend={{ value: stats.totalOrders > 0 ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}% Selesai` : "0%", positive: true }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendLineChart
            title="Tren Booking Calon Pengantin"
            subtitle="Volume formulir pemesanan masuk lewat storefront dalam 14 hari terakhir"
            data={trends}
            valueSuffix=" booking"
          />
        </div>

        <div className="lg:col-span-1">
          <StatusDonutChart
            title="Distribusi Status Pesanan"
            subtitle="Ringkasan tahapan pengerjaan saat ini"
            segments={donutSegments}
            totalLabel="Pesanan"
          />
        </div>
      </div>

      {/* Storefront Performance Card & Authority Notice */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#2C221E]">Website Toko & Domain Khusus Seller</h3>
          <p className="mt-1 text-xs text-stone-500">
            Etalase toko resmi Anda untuk menjangkau calon pengantin dan menerima formulir pemesanan.
          </p>

          <div className="mt-4 rounded-xl border border-stone-100 bg-[#FAF8F5] p-3 text-xs">
            <span className="block text-[11px] font-medium text-stone-400">Tautan Toko Publik:</span>
            <code className="mt-1 block font-mono text-xs font-semibold text-[#84633F] break-all">
              /seller/{stats.slug}
            </code>
            {stats.customDomain && (
              <div className="mt-2 pt-2 border-t border-stone-200/60">
                <span className="block text-[11px] font-medium text-stone-400">Custom Domain Aktif:</span>
                <span className="font-semibold text-emerald-700">{stats.customDomain}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={`/seller/${stats.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#84633F] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#715332]"
            >
              Buka Toko ↗
            </a>
            <Link
              href="/dashboard/reseller/storefront"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9CFC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#664624] shadow-2xs hover:bg-[#FAF8F5] hover:text-[#2C221E] transition"
            >
              Pengaturan Toko
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <h3 className="text-sm font-bold text-[#84633F]">Jaminan Mutu & Hak Kelola Admin</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            Setiap formulir pemesanan yang dikirimkan calon pengantin melalui etalase toko Anda akan langsung masuk ke antrean pengerjaan <strong>Admin Platform</strong>.
          </p>
          <ul className="mt-3 space-y-2 text-xs text-stone-600">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Admin bertindak sebagai desainer teknis yang menata kanvas dan menerbitkan undangan.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Data customer aman, bebas risiko kesalahan teknis, dan identitas agensi Anda tetap terjaga (*white-label*).</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-bold text-[#2C221E]">Pesanan Customer Masuk Terbaru</h3>
            <p className="text-xs text-stone-400">5 pesanan terakhir yang dipesan lewat toko Anda</p>
          </div>
          <Link
            href="/dashboard/reseller/orders"
            className="text-xs font-semibold text-[#84633F] hover:text-[#715332]"
          >
            Lihat Semua Pesanan →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Belum ada pesanan masuk. Bagikan tautan website toko Anda ke calon pengantin untuk mulai menerima pesanan.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase">
                  <th className="py-2.5 px-3">Nama Pemesan</th>
                  <th className="py-2.5 px-3">Nama Pasangan</th>
                  <th className="py-2.5 px-3">Tanggal Acara</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {recentOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] ?? {
                    label: order.status,
                    badgeClass: "bg-stone-100 text-stone-700",
                  };
                  return (
                    <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#2C221E]">{order.customerName}</td>
                      <td className="py-3 px-3 text-stone-600">{order.groomBrideNames || "-"}</td>
                      <td className="py-3 px-3 text-stone-500">
                        {order.eventDate
                          ? new Date(order.eventDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <a
                          href={`https://wa.me/${order.customerWhatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-medium hover:underline"
                        >
                          {order.customerWhatsapp}
                        </a>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
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
