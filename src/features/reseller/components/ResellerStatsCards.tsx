import type { ResellerOverviewStats } from "../types";
import styles from "./reseller.module.css";

export function ResellerStatsCards({ stats }: { stats: ResellerOverviewStats }) {
  return (
    <div className={styles.statsGrid}>
      <div className={`${styles.statCard} ${styles.statCardBronze}`}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Sisa Kuota Kredit</span>
          <span
            className={styles.statIcon}
            style={{ background: "rgba(212, 175, 55, 0.2)", color: "var(--dash-accent)" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="8" cy="8" r="6" />
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h2v4H7M14 12h2v4h-2" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue} style={{ color: "var(--dash-accent)" }}>
          {stats.creditQuota} <span style={{ fontSize: 16, fontWeight: 600 }}>Kredit</span>
        </div>
        <div className={styles.statSub}>
          {stats.creditQuota > 0
            ? "Siap digunakan untuk menerbitkan undangan klien"
            : "Saldo kuota habis, silakan lakukan top-up"}
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Total Klien Terdaftar</span>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalClients}</div>
        <div className={styles.statSub}>Klien yang terafiliasi dengan agensi Anda</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Mutasi Kredit</span>
          <span
            className={styles.statIcon}
            style={{ background: "#f3e8ff", color: "#7e22ce" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.totalTransactions}</div>
        <div className={styles.statSub}>Riwayat pemotongan & penambahan kuota</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statTop}>
          <span className={styles.statLabel}>Top-up Menunggu</span>
          <span
            className={styles.statIcon}
            style={{ background: "#ffedd5", color: "#c2410c" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        </div>
        <div className={styles.statValue}>{stats.pendingTopups}</div>
        <div className={styles.statSub}>
          {stats.pendingTopups > 0
            ? "Permohonan transfer sedang diverifikasi Owner"
            : "Tidak ada permohonan yang menunggu verifikasi"}
        </div>
      </div>
    </div>
  );
}
