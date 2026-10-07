import type { Metadata } from "next";
import Link from "next/link";
import { getResellerOverview } from "@/features/reseller/api";
import { ResellerStatsCards } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Portal Mitra Seller",
  description: "Dashboard pengelolaan toko online seller, pesanan customer, dan klien.",
};

export default async function ResellerDashboardPage() {
  await requireReseller();
  const stats = await getResellerOverview();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Mitra Seller · Storefront & Order Intake</p>
          <h1 className={styles.title}>{stats.agencyName}</h1>
          <p className={styles.lead}>
            Kelola website toko seller Anda, terima formulir pemesanan customer, dan pantau status
            pembuatan website undangan yang diproses oleh Admin.
          </p>
        </div>

        <div className={styles.headerActions}>
          <a
            href={`/seller/${stats.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
            style={{ textDecoration: "none" }}
          >
            Buka Website Toko ↗
          </a>
          <Link
            href="/dashboard/reseller/orders"
            className={styles.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Pesanan Customer
          </Link>
        </div>
      </header>

      <ResellerStatsCards stats={stats} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        <div className={styles.bankBox}>
          <h3 className={styles.bankBoxTitle}>Website & Domain Khusus Seller</h3>
          <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: 0, lineHeight: 1.6 }}>
            Setiap seller memiliki website toko mandiri sebagai identitas dan sarana melayani calon pengantin:
          </p>
          <ul style={{ fontSize: 13, color: "var(--dash-muted)", paddingLeft: 18, lineHeight: 1.6, margin: "8px 0" }}>
            <li>Tautan Toko Publik: <code>/seller/{stats.slug}</code></li>
            {stats.customDomain ? (
              <li>Domain Khusus Anda: <code>{stats.customDomain}</code></li>
            ) : (
              <li>Dukungan Custom Domain mandiri (misal: <code>undangan.tokosaya.com</code>).</li>
            )}
            <li>Etalase katalog tema desain dan formulir booking online.</li>
          </ul>
          <div style={{ marginTop: 8 }}>
            <Link
              href="/dashboard/reseller/storefront"
              className={styles.btnPrimary}
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Atur Toko & Domain Khusus →
            </Link>
          </div>
        </div>

        <div className={styles.bankBox}>
          <h3 className={styles.bankBoxTitle}>Alur Pemesanan & Otoritas Penuh Admin</h3>
          <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: 0, lineHeight: 1.6 }}>
            Ketentuan pengelolaan data platform:
          </p>
          <ol style={{ fontSize: 13, color: "var(--dash-muted)", paddingLeft: 18, lineHeight: 1.6, margin: "8px 0" }}>
            <li>Calon pengantin memilih desain dan mengisi formulir di website toko seller Anda.</li>
            <li>Pesanan otomatis masuk ke sistem dan dikonfirmasi langsung ke WhatsApp Anda.</li>
            <li>Admin mengolah data, mendesain kanvas, dan menerbitkan link undangan live.</li>
            <li>Seller memantau progres pesanan hingga undangan customer siap dibagikan.</li>
          </ol>
          <div style={{ marginTop: 8 }}>
            <Link
              href="/dashboard/reseller/orders"
              className={styles.btnSecondary}
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Pantau Daftar Pesanan Masuk →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
