import type { Metadata } from "next";
import Link from "next/link";
import { getResellerTopupInfo } from "@/features/reseller/api";
import { TopupRequestForm } from "@/features/reseller/components/TopupRequestForm";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";
import { submitTopupAction } from "./actions";

export const metadata: Metadata = {
  title: "Beli Kuota (Top-Up) — Portal Reseller",
  description: "Pengajuan pembelian kuota lisensi grosir via transfer manual langsung ke Owner.",
};

export default async function ResellerTopupPage() {
  const { profile } = await requireReseller();
  const { bankAccounts } = await getResellerTopupInfo();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Portal Reseller · Kuota Lisensi</p>
          <h1 className={styles.title}>Beli Kuota Undangan Grosir</h1>
          <p className={styles.lead}>
            Pilih paket kuota, lakukan transfer manual ke salah satu rekening resmi Platform Owner,
            lalu konfirmasikan bukti transfer Anda di bawah.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/dashboard/reseller/transactions"
            className={styles.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Lihat Riwayat Top-Up →
          </Link>
        </div>
      </header>

      <TopupRequestForm
        bankAccounts={bankAccounts}
        agencyName={profile.agencyName}
        action={submitTopupAction}
      />
    </div>
  );
}
