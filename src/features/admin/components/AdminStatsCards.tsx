import type { AdminStats } from "../types";
import styles from "./admin.module.css";

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Total Mitra Seller</span>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalResellers}</div>
        <div className={styles.statSub}>Mitra seller terdaftar di sistem</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Seller Aktif</span>
          <span className={styles.statIcon} style={{ background: "var(--dash-success-soft)", color: "var(--dash-success)" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.activeResellers}</div>
        <div className={styles.statSub}>Toko seller aktif menerima pesanan</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Total Pesanan Masuk</span>
          <span className={styles.statIcon} style={{ background: "rgba(212, 175, 55, 0.2)", color: "var(--dash-accent)" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalOrders}</div>
        <div className={styles.statSub}>Pesanan dari seluruh website seller</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Pesanan Baru Masuk</span>
          <span className={styles.statIcon} style={{ background: "#e0f2fe", color: "#0369a1" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.newOrders}</div>
        <div className={styles.statSub}>Perlu ditinjau & disiapkan undangannya</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Undangan Selesai Diterbitkan</span>
          <span className={styles.statIcon} style={{ background: "#dcfce7", color: "#15803d" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.completedOrders}</div>
        <div className={styles.statSub}>Website undangan live untuk customer</div>
      </div>
    </div>
  );
}
