import type { Metadata } from "next";
import { getAdminResellers, getAdminStats } from "@/features/admin/api";
import { AdminStatsCards, CreateResellerModal, ResellersManager } from "@/features/admin/components";
import styles from "@/features/admin/components/admin.module.css";
import { adjustCreditAction, createResellerAction, toggleResellerStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Manajemen Reseller — Super Admin",
};

export default async function AdminResellersPage() {
  const [resellers, stats] = await Promise.all([
    getAdminResellers(),
    getAdminStats(),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Platform Owner · Layer 1</p>
          <h1 className={styles.title}>Manajemen Mitra Reseller</h1>
          <p className={styles.lead}>
            Kelola pendaftaran mitra agensi, pantau sisa kuota undangan klien, dan distribusikan
            kredit lisensi grosir secara terstruktur.
          </p>
        </div>

        <div className={styles.headerActions}>
          <CreateResellerModal action={createResellerAction} />
        </div>
      </header>

      <AdminStatsCards stats={stats} />

      <ResellersManager
        resellers={resellers}
        topupAction={adjustCreditAction}
        toggleStatusAction={toggleResellerStatusAction}
      />
    </main>
  );
}
