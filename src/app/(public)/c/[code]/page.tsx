import type { Metadata } from "next";
import Link from "next/link";
import { getClientPortal } from "@/features/orders";
import { ClientPortalView } from "./client-portal-view";
import styles from "./client-portal.module.css";

interface ClientPortalPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: ClientPortalPageProps): Promise<Metadata> {
  const { code } = await params;
  const portal = await getClientPortal(code);

  if (!portal) {
    return {
      title: "Portal Klien Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const coupleTitle =
    portal.order.groomBrideNames?.trim() ||
    `Pernikahan ${portal.order.customerName}`;

  return {
    title: `Portal Undangan — ${coupleTitle}`,
    description: `Akses portal khusus pengantin untuk mengelola daftar tamu, review undangan, dan memantau kehadiran.`,
    robots: { index: false, follow: false },
  };
}

export default async function ClientPortalPage({ params }: ClientPortalPageProps) {
  const { code } = await params;
  const portal = await getClientPortal(code);

  if (!portal) {
    return (
      <main className={styles.portalContainer}>
        <div className={styles.portalShell}>
          <div className={styles.emptyCard} style={{ margin: "4rem auto", maxWidth: "480px" }}>
            <div className={styles.emptyIcon}>🔒</div>
            <h2 className={styles.emptyTitle}>Tautan Tidak Valid atau Sudah Kadaluarsa</h2>
            <p className={styles.emptyDesc}>
              Tautan portal klien dengan kode unik ini tidak ditemukan, atau tautan telah diperbarui oleh tim produksi.
            </p>
            <div style={{ marginTop: "1.5rem" }}>
              <Link href="/" className={styles.primaryBtn} style={{ textDecoration: "none", display: "inline-block" }}>
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <ClientPortalView data={portal} token={code} />;
}
