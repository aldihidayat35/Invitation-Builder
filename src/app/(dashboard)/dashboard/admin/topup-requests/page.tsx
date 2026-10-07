import type { Metadata } from "next";
import Link from "next/link";
import { getAdminTopupRequests } from "@/features/admin/api";
import { TopupRequestsManager } from "@/features/admin/components/TopupRequestsManager";
import styles from "@/features/admin/components/admin.module.css";
import { requireOwner } from "@/lib/auth/server";
import { approveTopupAction, rejectTopupAction } from "./actions";

export const metadata: Metadata = {
  title: "Verifikasi Transfer Manual",
  description: "Antrean verifikasi bukti transfer manual dan persetujuan kuota reseller.",
};

export default async function TopupRequestsAdminPage() {
  await requireOwner();
  const requests = await getAdminTopupRequests();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Platform Super Admin</p>
          <h1 className={styles.title}>Verifikasi Transfer Manual</h1>
          <p className={styles.lead}>
            Periksa mutasi rekening bank dan verifikasi gambar bukti transfer struk/slip yang
            diunggah mitra reseller untuk pengisian saldo kuota.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            href="/dashboard/admin/bank-accounts"
            className={styles.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Kelola Rekening Tujuan
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

      <TopupRequestsManager
        items={requests}
        approveAction={approveTopupAction}
        rejectAction={rejectTopupAction}
      />
    </div>
  );
}
