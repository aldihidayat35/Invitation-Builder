import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBankAccounts } from "@/features/admin/api";
import { BankAccountsManager } from "@/features/admin/components/BankAccountsManager";
import styles from "@/features/admin/components/admin.module.css";
import { requireOwner } from "@/lib/auth/server";
import {
  createBankAccountAction,
  deleteBankAccountAction,
  toggleBankAccountStatusAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Rekening Pembayaran Manual",
  description: "Kelola rekening bank tujuan transfer manual untuk pengisian kuota reseller.",
};

export default async function BankAccountsAdminPage() {
  await requireOwner();
  const accounts = await getAdminBankAccounts();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Platform Super Admin</p>
          <h1 className={styles.title}>Rekening Tujuan Transfer</h1>
          <p className={styles.lead}>
            Kelola daftar rekening bank atau QRIS statis milik Owner yang ditampilkan kepada mitra
            reseller saat mengajukan top-up kuota.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            href="/dashboard/admin/topup-requests"
            className={styles.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Verifikasi Bukti Transfer
          </Link>
          <Link
            href="/dashboard/admin/resellers"
            className={styles.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Kembali ke Reseller
          </Link>
        </div>
      </header>

      <BankAccountsManager
        accounts={accounts}
        createAction={createBankAccountAction}
        toggleStatusAction={toggleBankAccountStatusAction}
        deleteAction={deleteBankAccountAction}
      />
    </div>
  );
}
