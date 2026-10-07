import type { Metadata } from "next";
import Link from "next/link";
import { getResellerOrders } from "@/features/reseller/api";
import { ResellerOrdersTable } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Pesanan Customer - Mitra Seller",
  description: "Daftar pesanan customer yang masuk melalui website toko seller.",
};

export default async function ResellerOrdersPage() {
  await requireReseller();
  const orders = await getResellerOrders();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>
            <Link href="/dashboard/reseller" style={{ color: "inherit", textDecoration: "none" }}>
              ← Portal Seller
            </Link>{" "}
            · Pesanan
          </p>
          <h1 className={styles.title}>Pesanan Customer Masuk</h1>
          <p className={styles.lead}>
            Pantau seluruh formulir pesanan customer yang masuk dari website toko Anda.
            Seluruh pembuatan dan pengubahan data undangan dikelola langsung oleh Admin.
          </p>
        </div>
      </header>

      <ResellerOrdersTable orders={orders} />
    </div>
  );
}
