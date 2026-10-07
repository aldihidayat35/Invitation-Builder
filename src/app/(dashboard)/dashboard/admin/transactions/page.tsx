import type { Metadata } from "next";
import Link from "next/link";
import { getAdminStats, getAdminTransactions } from "@/features/admin/api";
import { AdminStatsCards, TransactionsTable } from "@/features/admin/components";
import styles from "@/features/admin/components/admin.module.css";

export const metadata: Metadata = {
  title: "Riwayat Transaksi Kuota — Super Admin",
};

export default async function AdminTransactionsPage() {
  const [transactions, stats] = await Promise.all([
    getAdminTransactions(),
    getAdminStats(),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Platform Owner · Audit Ledger</p>
          <h1 className={styles.title}>Riwayat Transaksi & Mutasi Kuota</h1>
          <p className={styles.lead}>
            Audit trail immutable mencatat setiap penambahan dan pengurangan kredit kuota seluruh
            mitra agensi reseller secara transparan dan akurat.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/dashboard/admin/resellers" className={styles.btnSecondary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Kelola Reseller
          </Link>
        </div>
      </header>

      <AdminStatsCards stats={stats} />

      <TransactionsTable transactions={transactions} />
    </main>
  );
}
