import type { Metadata } from "next";
import { getAdminResellers, getAdminStats } from "@/features/admin/api";
import { AdminStatsCards, CreateResellerModal, ResellersManager } from "@/features/admin/components";
import styles from "@/features/admin/components/admin.module.css";
import { createResellerAction, toggleResellerStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Manajemen Mitra Seller — Super Admin",
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
          <h1 className={styles.title}>Manajemen Mitra Seller</h1>
          <p className={styles.lead}>
            Kelola pendaftaran mitra seller, pantau toko online mereka, dan konfigurasi domain khusus seller.
          </p>
        </div>

        <div className={styles.headerActions}>
          <CreateResellerModal action={createResellerAction} />
        </div>
      </header>

      <AdminStatsCards stats={stats} />

      <ResellersManager
        resellers={resellers}
        toggleStatusAction={toggleResellerStatusAction}
      />
    </main>
  );
}
