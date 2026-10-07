import type { ResellerOverviewStats } from "../types";
import styles from "./reseller.module.css";

export function ResellerStatsCards({ stats }: { stats: ResellerOverviewStats }) {
  return (
    <div className={styles.statsGrid}>
      <div className={`${styles.statCard} ${styles.statCardBronze}`}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Total Pesanan Masuk</span>
          <span
            className={styles.statIcon}
            style={{ background: "rgba(212, 175, 55, 0.2)", color: "var(--dash-accent)" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue} style={{ color: "var(--dash-accent)" }}>
          {stats.totalOrders} <span style={{ fontSize: 16, fontWeight: 600 }}>Pesanan</span>
        </div>
        <div className={styles.statSub}>
          Pesanan customer yang masuk dari website toko seller Anda
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Pesanan Baru</span>
          <span
            className={styles.statIcon}
            style={{ background: "#e0f2fe", color: "#0369a1" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.newOrders}</div>
        <div className={styles.statSub}>Menunggu ditinjau dan dikerjakan oleh Admin</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Sedang Diproses</span>
          <span
            className={styles.statIcon}
            style={{ background: "#fef3c7", color: "#b45309" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.inProgressOrders}</div>
        <div className={styles.statSub}>Admin sedang merancang dan mengisi data undangan</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Selesai & Terbit</span>
          <span
            className={styles.statIcon}
            style={{ background: "#dcfce7", color: "#15803d" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.completedOrders}</div>
        <div className={styles.statSub}>
          Undangan customer sudah online dan siap dibagikan
        </div>
      </div>
    </div>
  );
}
