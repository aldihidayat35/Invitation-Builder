import type { AdminResellerStats } from "../types";
import { KpiStatCard } from "@/features/analytics";

interface AdminResellerStatsCardsProps {
  stats: AdminResellerStats;
}

export function AdminResellerStatsCards({ stats }: AdminResellerStatsCardsProps) {
  const sellerProductivityNote =
    stats.resellersWithOrders > 0
      ? `${stats.resellersWithOrders} mitra telah membukukan pesanan`
      : "Pesanan dari etalase toko seller";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Mitra Seller */}
      <KpiStatCard
        title="Total Mitra Seller"
        value={stats.totalResellers}
        subtitle="Akun seller terdaftar di sistem"
        tone="bronze"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      {/* 2. Mitra Seller Aktif */}
      <KpiStatCard
        title="Mitra Seller Aktif"
        value={stats.activeResellers}
        subtitle="Toko seller aktif menerima pesanan"
        tone="emerald"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
      />

      {/* 3. Mitra Non-Aktif / Suspend */}
      <KpiStatCard
        title="Mitra Non-Aktif"
        value={stats.inactiveResellers}
        subtitle="Toko ditangguhkan / non-aktif"
        tone="default"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        }
      />

      {/* 4. Total Pesanan via Seller */}
      <KpiStatCard
        title="Total Pesanan via Seller"
        value={stats.totalOrders}
        subtitle={sellerProductivityNote}
        tone="gold"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />
    </div>
  );
}
