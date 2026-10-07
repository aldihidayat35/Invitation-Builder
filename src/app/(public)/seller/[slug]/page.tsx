import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import {
  findResellerProfileBySlug,
  findResellerProfileByCustomDomain,
} from "@/lib/db/repositories/resellers";
import { listPublicTemplates } from "@/lib/db/repositories/templates";
import { OrderBookingForm } from "./OrderBookingForm";
import styles from "./seller-storefront.module.css";

interface SellerStorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SellerStorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const profile =
    (await findResellerProfileBySlug(db, slug)) ||
    (await findResellerProfileByCustomDomain(db, slug));

  if (!profile || !profile.isActive) {
    return { title: "Toko Seller Tidak Ditemukan" };
  }

  return {
    title: `${profile.agencyName} — Pemesanan Website Undangan Digital`,
    description: `Layanan pembuatan website undangan digital premium bersama ${profile.agencyName}. Desain elegan, responsif, dan siap kirim ke para tamu.`,
  };
}

export default async function SellerStorefrontPage({
  params,
}: SellerStorefrontPageProps) {
  const { slug } = await params;
  const db = await getDb();

  const profile =
    (await findResellerProfileBySlug(db, slug)) ||
    (await findResellerProfileByCustomDomain(db, slug));

  if (!profile || !profile.isActive) {
    notFound();
  }

  const rawTemplates = await listPublicTemplates(db);
  const templateList = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
  }));

  const waDigits = profile.whatsappContact.replace(/\D/g, "");
  const waDirectUrl = `https://wa.me/${waDigits.startsWith("0") ? "62" + waDigits.slice(1) : waDigits}?text=${encodeURIComponent(`Halo ${profile.agencyName}, saya ingin konsultasi pembuatan website undangan digital.`)}`;

  return (
    <div className={styles.storefront}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            ★ Mitra Resmi Invitation Studio
          </div>
          <h1 className={styles.title}>{profile.agencyName}</h1>
          <p className={styles.subtitle}>
            Wujudkan momen pernikahan istimewa dengan website undangan digital elegan, modern, dan praktis untuk seluruh tamu Anda.
          </p>

          <div className={styles.heroActions}>
            <a href="#katalog-desain" className={styles.btnPrimary}>
              Lihat Pilihan Desain ↓
            </a>
            <a
              href={waDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              💬 Chat WhatsApp Langsung
            </a>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className={styles.container}>
        {/* Catalog Section */}
        <section id="katalog-desain">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>Koleksi Eksklusif</div>
            <h2 className={styles.sectionTitle}>Pilihan Tema & Desain Undangan</h2>
            <p className={styles.sectionLead}>
              Pilih gaya desain yang paling sesuai dengan impian pernikahan Anda, lalu isi formulir pemesanan di bawah.
            </p>
          </div>

          <div className={styles.templateGrid}>
            {templateList.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px dashed rgba(132, 99, 63, 0.3)",
                }}
              >
                <p style={{ margin: 0, color: "#63554e" }}>
                  Desain tema sedang dipersiapkan. Anda tetap dapat melakukan pemesanan kustom langsung melalui formulir di bawah.
                </p>
              </div>
            ) : (
              templateList.map((tpl) => (
                <div key={tpl.id} className={styles.templateCard}>
                  <div className={styles.templateThumb}>
                    <div className={styles.templateThumbText}>{tpl.name}</div>
                  </div>
                  <div className={styles.templateBody}>
                    <h3 className={styles.templateName}>{tpl.name}</h3>
                    <p className={styles.templateMeta}>
                      Layout Responsif · Animasi Halus · RSVP & Ucapan Online
                    </p>
                    <a
                      href="#form-pemesanan"
                      className={styles.templateActionBtn}
                      style={{ textDecoration: "none", textAlign: "center" }}
                    >
                      Pilih Desain Ini
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Order Booking Section */}
        <section>
          <OrderBookingForm
            sellerId={profile.id}
            agencyName={profile.agencyName}
            sellerWhatsapp={profile.whatsappContact}
            templates={templateList}
          />
        </section>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "#2c221e" }}>
            {profile.agencyName}
          </p>
          <p style={{ margin: "0 0 1rem" }}>
            Layanan Pemesanan Website Undangan Digital · WhatsApp: +{profile.whatsappContact}
          </p>
          <p style={{ fontSize: "0.78rem", color: "#a89b93", margin: 0 }}>
            Didukung oleh infrastruktur Invitation Studio Platform. Seluruh data diproses secara aman.
          </p>
        </div>
      </footer>
    </div>
  );
}
