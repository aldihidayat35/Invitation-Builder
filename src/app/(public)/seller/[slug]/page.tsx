import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getPublicSellerStorefront } from "@/features/reseller/api";
import { StorefrontInteractiveSection } from "./StorefrontInteractiveSection";
import styles from "./seller-storefront.module.css";

interface SellerStorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SellerStorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getPublicSellerStorefront(slug);
  const profile = storefront?.profile;

  if (!profile) {
    return { title: "Toko Seller Tidak Ditemukan" };
  }

  const title = profile.heroTitle || `${profile.agencyName} — Undangan Digital Premium`;
  const description =
    profile.heroSubtitle ||
    `Layanan pembuatan website undangan digital premium bersama ${profile.agencyName}. Desain elegan, responsif, dan siap kirim ke para tamu.`;

  return {
    title,
    description,
    icons: {
      icon: profile.logoUrl
        ? `/api/app-favicon?seller=${encodeURIComponent(slug)}`
        : "/api/app-favicon",
      shortcut: profile.logoUrl
        ? `/api/app-favicon?seller=${encodeURIComponent(slug)}`
        : "/api/app-favicon",
      apple: profile.logoUrl
        ? `/api/app-favicon?seller=${encodeURIComponent(slug)}`
        : "/api/app-favicon",
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: profile.heroImageUrl || "/images/landing-hero.jpg",
          width: 1200,
          height: 630,
          alt: profile.agencyName,
        },
      ],
    },
  };
}

export default async function SellerStorefrontPage({ params }: SellerStorefrontPageProps) {
  const { slug } = await params;
  const storefront = await getPublicSellerStorefront(slug);
  const profile = storefront?.profile;

  if (!profile) {
    notFound();
  }

  const templateList = storefront.templates;

  const waDigits = profile.whatsappContact.replace(/\D/g, "");
  const cleanPhone = waDigits.startsWith("0") ? "62" + waDigits.slice(1) : waDigits;
  const defaultWaMessage = `Halo ${profile.agencyName}, saya ingin konsultasi seputar pembuatan website undangan digital.`;
  const waDirectUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultWaMessage)}`;

  const heroImage = profile.heroImageUrl || "/images/landing-hero.jpg";
  const heroBadge = profile.heroBadge || "✨ Mitra Resmi Invitation Studio";
  const heroTitle = profile.heroTitle || profile.agencyName;
  const heroSubtitle =
    profile.heroSubtitle ||
    "Wujudkan momen pernikahan istimewa Anda dengan website undangan digital elegan, modern, dan fitur terlengkap untuk seluruh tamu tercinta.";

  const brandColor = profile.brandColor || "#d4af37";

  return (
    <div
      className={styles.storefront}
      style={{ "--seller-brand": brandColor } as React.CSSProperties}
    >
      {/* Topbar Navigation */}
      <header className={styles.topbar}>
        <div className={styles.topbarContainer}>
          <div className={styles.brandIdentity}>
            {profile.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt={profile.agencyName}
                width={40}
                height={40}
                className={styles.brandLogo}
                unoptimized={profile.logoUrl.startsWith("http")}
              />
            ) : (
              <div className={styles.brandAvatar}>
                {profile.agencyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.brandInfo}>
              <span className={styles.brandName}>{profile.agencyName}</span>
              <span className={styles.brandTag}>Verified Reseller</span>
            </div>
          </div>

          <nav className={styles.topNav}>
            <a href="#katalog-desain" className={styles.topNavLink}>
              Koleksi Desain
            </a>
            <a href="#keunggulan" className={styles.topNavLink}>
              Fitur & Keunggulan
            </a>
            <a href="#form-pemesanan" className={styles.topNavLink}>
              Form Pemesanan
            </a>
          </nav>

          <a
            href={waDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.topbarWaBtn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
            </svg>
            <span>Hubungi Kami</span>
          </a>
        </div>
      </header>

      {/* Dynamic Hero Section */}
      <section
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(rgba(18, 14, 12, 0.72), rgba(18, 14, 12, 0.82)), url(${heroImage})`,
        }}
      >
        <div className={styles.heroContent}>
          <div className={styles.badge}>{heroBadge}</div>
          <h1 className={styles.title}>{heroTitle}</h1>
          <p className={styles.subtitle}>{heroSubtitle}</p>

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

          <div className={styles.trustBadges}>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>⚡</span>
              <span>Proses Cepat (1x24 Jam)</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>💎</span>
              <span>Desain Eksklusif & Elegan</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>💌</span>
              <span>Fitur Terlengkap & Interaktif</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Advantages Section */}
      <section id="keunggulan" className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>Fitur Undangan Digital</div>
            <h2 className={styles.sectionTitle}>Semua yang Anda Butuhkan dalam Satu Link</h2>
            <p className={styles.sectionLead}>
              Website undangan digital modern yang mempermudah tamu Anda mengakses informasi acara,
              konfirmasi kehadiran, dan memberikan doa terbaik.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIconBubble}>📱</div>
              <h3 className={styles.featureCardTitle}>Tampilan Responsif</h3>
              <p className={styles.featureCardDesc}>
                Terbuka sempurna dan elegan di semua perangkat: HP Android, iPhone, tablet, hingga layar laptop.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBubble}>💌</div>
              <h3 className={styles.featureCardTitle}>RSVP & Buku Tamu Online</h3>
              <p className={styles.featureCardDesc}>
                Tamu dapat mengonfirmasi kehadiran serta menuliskan ucapan dan doa secara real-time.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBubble}>🗺️</div>
              <h3 className={styles.featureCardTitle}>Navigasi Google Maps</h3>
              <p className={styles.featureCardDesc}>
                Petunjuk lokasi akad dan resepsi yang terhubung langsung dengan Google Maps atau Waze.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBubble}>🎵</div>
              <h3 className={styles.featureCardTitle}>Musik Latar Romantis</h3>
              <p className={styles.featureCardDesc}>
                Iringan musik latar favorit yang berputar lembut untuk menambah suasana syahdu undangan.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBubble}>🎁</div>
              <h3 className={styles.featureCardTitle}>Amplop Digital & QRIS</h3>
              <p className={styles.featureCardDesc}>
                Tersedia rekening bank dan barcode QRIS untuk memudahkan tamu yang ingin mengirimkan kado cashless.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconBubble}>⏳</div>
              <h3 className={styles.featureCardTitle}>Countdown Timer</h3>
              <p className={styles.featureCardDesc}>
                Penghitung waktu mundur otomatis yang menghitung detik menuju momen sakral pernikahan Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Catalog & Booking Form */}
      <div className={styles.container}>
        <StorefrontInteractiveSection
          sellerSlug={slug}
          idempotencyKey={randomUUID()}
          agencyName={profile.agencyName}
          whatsappContact={profile.whatsappContact}
          templates={templateList}
        />
      </div>

      {/* Floating WhatsApp CTA */}
      <a
        href={waDirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.floatingWaBtn}
        aria-label="Konsultasi via WhatsApp"
        title="Konsultasi via WhatsApp"
      >
        <span className={styles.floatingWaPulse} />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
        </svg>
        <span className={styles.floatingWaLabel}>Chat WhatsApp</span>
      </a>

      {/* Footer */}
      <footer className={styles.footer}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700, fontSize: "1.1rem", color: "#2c221e" }}>
            {profile.agencyName}
          </p>
          <p style={{ margin: "0 0 1rem", color: "#63554e" }}>
            Layanan Pembuatan Website Undangan Digital Premium · WhatsApp: +{profile.whatsappContact}
          </p>
          <p style={{ fontSize: "0.8rem", color: "#a89b93", margin: 0 }}>
            Didukung oleh infrastruktur Invitation Studio Platform. Seluruh data diproses secara aman.
          </p>
        </div>
      </footer>
    </div>
  );
}
