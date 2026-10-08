import type { AdminOrderStats } from "../types";
import { KpiStatCard } from "@/features/analytics";

interface AdminOrderStatsCardsProps {
  stats: AdminOrderStats;
}

export function AdminOrderStatsCards({ stats }: AdminOrderStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Pesanan Masuk */}
      <KpiStatCard
        title="Total Pesanan Masuk"
        value={stats.totalOrders}
        subtitle="Akumulasi seluruh pesanan customer"
        tone="bronze"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        }
      />

      {/* 2. Pesanan Baru / Antrean */}
      <KpiStatCard
        title="Pesanan Baru (Antrean)"
        value={stats.newOrders}
        subtitle="Menunggu ditinjau & disiapkan"
        tone="gold"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth={2} strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} strokeLinecap="round" />
          </svg>
        }
      />

      {/* 3. Sedang Diproses */}
      <KpiStatCard
        title="Sedang Dikerjakan"
        value={stats.inProgressOrders}
        subtitle="Desain undangan dalam proses"
        tone="default"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        }
      />

      {/* 4. Selesai Diterbitkan */}
      <KpiStatCard
        title="Undangan Selesai Terbit"
        value={stats.completedOrders}
        subtitle="Website undangan live & aktif"
        tone="emerald"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  );
}
