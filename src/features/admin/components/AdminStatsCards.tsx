import type { AdminStats } from "../types";
import styles from "./admin.module.css";

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Total Mitra Reseller</span>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalResellers}</div>
        <div className={styles.statSub}>Mitra terdaftar di sistem</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Reseller Aktif</span>
          <span className={styles.statIcon} style={{ background: "var(--dash-success-soft)", color: "var(--dash-success)" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.activeResellers}</div>
        <div className={styles.statSub}>Status akun aktif & siap menerbitkan undangan</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Kuota Kredit Beredar</span>
          <span className={styles.statIcon} style={{ background: "#fef3c7", color: "#b45309" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="8" cy="8" r="6" />
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h2v4H7M14 12h2v4h-2" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalQuota.toLocaleString("id-ID")}</div>
        <div className={styles.statSub}>Total sisa kuota siap pakai reseller</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Mutasi Transaksi</span>
          <span className={styles.statIcon} style={{ background: "#f3e8ff", color: "#7e22ce" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalTransactions}</div>
        <div className={styles.statSub}>Total log pergerakan kuota di ledger</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Menunggu Verifikasi</span>
          <span className={styles.statIcon} style={{ background: "#ffedd5", color: "#c2410c" }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.pendingTopups}</div>
        <div className={styles.statSub}>Permintaan transfer manual perlu dicek</div>
      </div>
    </div>
  );
}
