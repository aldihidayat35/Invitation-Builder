import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOrders, getAdminStats } from "@/features/admin/api";
import { AdminOrdersTable, AdminStatsCards } from "@/features/admin/components";
import styles from "@/features/admin/components/admin.module.css";
import { requireOwner } from "@/lib/auth/server";
import { updateOrderStatusAction } from "./actions";

export const metadata: Metadata = {
  title: "Pusat Pengolahan Pesanan Customer — Super Admin",
};

export default async function AdminOrdersPage() {
  await requireOwner();
  const [orders, stats] = await Promise.all([
    getAdminOrders(),
    getAdminStats(),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Platform Owner · Otoritas Penuh Pengelolaan</p>
          <h1 className={styles.title}>Pesanan Customer & Pengolahan Data</h1>
          <p className={styles.lead}>
            Admin memiliki wewenang penuh mutlak untuk membuat, mengedit data website undangan,
            dan menerbitkan website undangan bagi customer yang memesan melalui mitra seller.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/dashboard/invitations"
            className={styles.btnPrimary}
            style={{ textDecoration: "none" }}
          >
            Buka Daftar Undangan →
          </Link>
        </div>
      </header>

      <AdminStatsCards stats={stats} />

      <AdminOrdersTable
        orders={orders}
        onUpdateStatus={updateOrderStatusAction}
      />
    </main>
  );
}
