import type { Metadata } from "next";
import Link from "next/link";
import { getResellerOverview } from "@/features/reseller/api";
import { ResellerStatsCards } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Portal Agensi Reseller",
  description: "Dashboard pengelolaan kuota undangan, klien, dan agensi reseller.",
};

export default async function ResellerDashboardPage() {
  await requireReseller();
  const stats = await getResellerOverview();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Mitra Agensi · Layer 2</p>
          <h1 className={styles.title}>{stats.agencyName}</h1>
          <p className={styles.lead}>
            Kelola saldo kuota penerbitan undangan, pantau seluruh klien agensi, dan beli paket
            kuota grosir via transfer manual langsung ke Owner.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/dashboard/reseller/topup"
            className={styles.btnPrimary}
            style={{ textDecoration: "none" }}
          >
            + Beli Kuota (Top-Up)
          </Link>
          <Link
            href="/dashboard/reseller/clients"
            className={styles.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Kelola Klien
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
          <h3 className={styles.bankBoxTitle}>Alur Beli Kuota Grosir via Transfer Manual</h3>
          <ol style={{ fontSize: 13, color: "var(--dash-muted)", paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
            <li>Pilih paket kuota undangan sesuai kebutuhan agensi Anda.</li>
            <li>Transfer nominal ke rekening bank atau QRIS resmi milik Owner.</li>
            <li>Unggah screenshot atau foto struk bukti transfer pada formulir konfirmasi.</li>
            <li>Owner memverifikasi mutasi rekening dan menyetujui kuota Anda.</li>
          </ol>
          <div style={{ marginTop: 8 }}>
            <Link
              href="/dashboard/reseller/topup"
              className={styles.btnPrimary}
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Mulai Top-Up Sekarang →
            </Link>
          </div>
        </div>

        <div className={styles.bankBox}>
          <h3 className={styles.bankBoxTitle}>Identitas & White-Label Agensi</h3>
          <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: 0, lineHeight: 1.6 }}>
            Klien Anda dapat melihat logo agensi dan menghubungi customer service Anda secara
            langsung tanpa mengetahui platform penyedia utama.
          </p>
          <div style={{ marginTop: 8 }}>
            <Link
              href="/dashboard/reseller/branding"
              className={styles.btnSecondary}
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Atur Branding & Logo Agensi →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
