import type { Metadata } from "next";
import Link from "next/link";
import { getResellerTransactionsHistory } from "@/features/reseller/api";
import { ResellerTransactionsTable } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Riwayat Transaksi Kuota — Portal Reseller",
  description: "Status permohonan top-up transfer manual dan mutasi kredit kuota reseller.",
};

export default async function ResellerTransactionsPage() {
  await requireReseller();
  const { requests, transactions } = await getResellerTransactionsHistory(50);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Portal Reseller · Transaksi</p>
          <h1 className={styles.title}>Riwayat Kuota & Verifikasi Top-Up</h1>
          <p className={styles.lead}>
            Pantau status verifikasi permohonan transfer manual Anda oleh Owner dan periksa log
            mutasi kredit kuota agensi.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/dashboard/reseller/topup"
            className={styles.btnPrimary}
            style={{ textDecoration: "none" }}
          >
            + Ajukan Top-Up Baru
          </Link>
        </div>
      </header>

      <ResellerTransactionsTable requests={requests} transactions={transactions} />
    </div>
  );
}
