import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/server";
import { LandingFaqAccordion, FloatingHeroAudioBadge } from "./landing-interactive";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Invitation Studio · Platform Undangan Pernikahan Digital Eksklusif & Solusi Reseller",
  description:
    "Ciptakan website undangan pernikahan digital mewah dengan editor visual bebas, alunan musik romantis, RSVP real-time, amplop digital tanpa potongan, dan portal kemitraan Wedding Organizer terlengkap.",
};

export default async function HomePage() {
  const currentUser = await getCurrentUser().catch(() => null);

  const faqItems = [
    {
      q: "Berapa lama proses pembuatan undangan digital di platform ini?",
      a: "Sangat cepat! Anda dapat membuat dan menerbitkan website undangan digital siap sebar dalam waktu 5 hingga 10 menit menggunakan pilihan template master yang tersedia di studio editor kami.",
    },
    {
      q: "Apakah ada batasan kuota untuk jumlah tamu yang diundang?",
      a: "Sama sekali tidak ada batasan. Anda dapat menyebarkan tautan website undangan digital ke ratusan hingga puluhan ribu tamu tanpa biaya tambahan per tamu.",
    },
    {
      q: "Bagaimana cara kerja fitur Amplop Digital & Gift?",
      a: "Anda dapat mencantumkan nomor rekening bank resmi (BCA, Mandiri, BRI, BNI, dll.) atau mengunggah QRIS statis. Seluruh transfer dari para tamu langsung masuk 100% ke rekening pribadi mempelai tanpa potongan biaya perantara.",
    },
    {
      q: "Apakah saya bisa membuat tautan khusus dengan nama tamu (VIP)?",
      a: "Tentu saja. Tersedia generator tautan nama tamu otomatis. Cukup masukkan daftar nama kerabat, dan sistem akan membuat tautan spesifik dengan ucapan personal di halaman muka (misal: Kepada Yth. Bapak Bambang & Keluarga).",
    },
    {
      q: "Saya seorang Wedding Organizer (WO) / vendor percetakan, bagaimana cara menjadi mitra reseller?",
      a: "Kami menyediakan portal kemitraan khusus reseller. Anda mendapatkan website toko whitelabel dengan nama brand Anda sendiri, margin laba hingga 80%, serta dashboard manajemen order customer yang mandiri.",
    },
    {
      q: "Apakah data dan foto yang diunggah aman dan dapat diubah sewaktu-waktu?",
      a: "Sangat aman. Server kami menggunakan enkripsi cloud berkecepatan tinggi. Jika terdapat revisi jadwal akad atau lokasi resepsi, Anda dapat memperbaruinya di editor dan perubahan langsung aktif seketika tanpa perlu mencetak ulang.",
    },
  ];

  const templateCards = [
    {
      id: "jawa-kencana",
      title: "Kencana Royal Javanese",
      category: "Adat Tradisional",
      description: "Nuansa adat Jawa ningrat berbalut ornamen batik prada emas mewah, kaligrafi anggun, dan sentuhan klasik keraton.",
      image: "/images/template-jawa.jpg",
      tag: "Best Seller",
    },
    {
      id: "botanical-garden",
      title: "Modern Botanical Garden",
      category: "Rustic Minimalist",
      description: "Kombinasi dedaunan eucalyptus kering, palet ivory lembut, dan tipografi modern yang memancarkan ketenangan alam.",
      image: "/images/template-botanical.jpg",
      tag: "Trending",
    },
    {
      id: "terracotta-boho",
      title: "Sunset Terracotta Boho",
      category: "Bohemian Earthy",
      description: "Kehangatan rona bronze earthy dengan ilustrasi watercolor pampas grass eksotis dan stempel lilin segel emas.",
      image: "/images/template-boho.jpg",
      tag: "Favorit WO",
    },
    {
      id: "editorial-chic",
      title: "Ethereal Chic Editorial",
      category: "Modern Minimalist",
      description: "Estetika majalah fesyen kontemporer, tata letak monokrom bersih, dan monogram inisial nama berkelas internasional.",
      image: "/images/template-editorial.jpg",
      tag: "Eksklusif",
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* Ambient Radial Lights */}
      <div className={styles.ambientOrb1} aria-hidden="true" />
      <div className={styles.ambientOrb2} aria-hidden="true" />
      <div className={styles.ambientOrb3} aria-hidden="true" />

      {/* 1. Header Navigation Bar */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.navBrand}>
            <span className={styles.brandLogo} aria-hidden="true">
              IS
            </span>
            <div>
              <span className={styles.brandTitle}>Invitation Studio</span>
              <span className={styles.brandBadge}>Platform Undangan Digital</span>
            </div>
          </Link>

          <nav>
            <ul className={styles.navMenu}>
              <li>
                <a href="#fitur" className={styles.navLink}>
                  Fitur Unggulan
                </a>
              </li>
              <li>
                <a href="#template" className={styles.navLink}>
                  Katalog Desain
                </a>
              </li>
              <li>
                <a href="#reseller" className={styles.navLink}>
                  Kemitraan WO
                </a>
              </li>
              <li>
                <a href="#harga" className={styles.navLink}>
                  Paket Harga
                </a>
              </li>
              <li>
                <a href="#faq" className={styles.navLink}>
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          <div className={styles.navActions}>
            {currentUser ? (
              <Link href="/dashboard" className={styles.btnCta}>
                <span>Buka Dashboard</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.btnLogin}>
                  Masuk
                </Link>
                <Link href="/login?next=/dashboard" className={styles.btnCta}>
                  <span>Buat Undangan</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className={styles.heroSection}>
        <div>
          <div className={styles.heroEyebrowPill}>
            <span>✨</span>
            <span>PLATFORM UNDANGAN DIGITAL EKSKLUSIF NO. 1</span>
          </div>

          <h1 className={styles.heroTitle}>
            Ciptakan Undangan Digital Mewah,{" "}
            <span className={styles.heroTitleHighlight}>Eksklusif & Berkesan</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Hadirkan momen terindah pernikahan Anda dengan estetika editorial premium.
            Lengkap dengan editor kanvas fleksibel, alunan musik romantis, manajemen buku
            tamu RSVP real-time, dan sistem kemitraan Wedding Organizer terlengkap.
          </p>

          <div className={styles.heroCtaGroup}>
            <Link
              href={currentUser ? "/dashboard" : "/login?next=/dashboard"}
              className={styles.heroPrimaryBtn}
            >
              <span>Mulai Buat Undangan Sekarang</span>
              <span aria-hidden="true">→</span>
            </Link>

            <a href="#template" className={styles.heroSecondaryBtn}>
              <span>Jelajahi Pustaka Desain</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <ul className={styles.heroTrustList}>
            <li className={styles.heroTrustItem}>
              <span className={styles.heroTrustDot} />
              <span>Aktif Seketika 5 Menit</span>
            </li>
            <li className={styles.heroTrustItem}>
              <span className={styles.heroTrustDot} />
              <span>RSVP & Buku Tamu Real-Time</span>
            </li>
            <li className={styles.heroTrustItem}>
              <span className={styles.heroTrustDot} />
              <span>Amplop Digital 0% Potongan</span>
            </li>
            <li className={styles.heroTrustItem}>
              <span className={styles.heroTrustDot} />
              <span>100% Responsif Semua Layar</span>
            </li>
          </ul>
        </div>

        {/* Hero Visual Showcase */}
        <div className={styles.heroMediaWrapper}>
          <div className={styles.heroImageContainer}>
            <Image
              src="/images/landing-hero.jpg"
              alt="Preview kemewahan undangan pernikahan digital pada smartphone dan kartu fisik"
              width={1200}
              height={675}
              priority
              className={styles.heroImg}
            />
          </div>

          {/* Floating Live Badges */}
          <div className={styles.floatingCard1}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#059669",
                display: "inline-block",
                boxShadow: "0 0 0 3px rgba(5, 150, 105, 0.2)",
              }}
            />
            <div>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#84633F", textTransform: "uppercase" }}>
                RSVP Terverifikasi
              </span>
              <strong style={{ fontSize: 12, color: "#2C221E" }}>
                240 Tamu Telah Konfirmasi Hadir
              </strong>
            </div>
          </div>

          <FloatingHeroAudioBadge />
        </div>
      </section>

      {/* 3. Stat Proof Bar */}
      <section className={styles.statStripSection} aria-label="Statistik Layanan">
        <div className={styles.statGrid}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              15.000<span className={styles.statHighlight}>+</span>
            </span>
            <span className={styles.statLabel}>Undangan Digital Terbit</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              450<span className={styles.statHighlight}>+</span>
            </span>
            <span className={styles.statLabel}>Mitra Wedding Organizer & WO</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              99,9<span className={styles.statHighlight}>%</span>
            </span>
            <span className={styles.statLabel}>Kecepatan Server & Uptime</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              4,9<span className={styles.statHighlight}>/5</span>
            </span>
            <span className={styles.statLabel}>Kepuasan Mempelai & Tamu</span>
          </div>
        </div>
      </section>

      {/* 4. Core Features Section */}
      <section id="fitur" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>KEMUDAHAN & KEUNGGULAN</span>
          <h2 className={styles.sectionTitle}>Fitur Canggih untuk Momen Teristimewa</h2>
          <p className={styles.sectionLead}>
            Semua kebutuhan publikasi hari bahagia dirancang secara intuitif, modern, dan
            mengedepankan kesempurnaan visual di setiap detail.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIconBox}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Studio Editor Kanvas Visual</h3>
            <p className={styles.featureDescription}>
              Atur tata letak elemen foto, bingkai ornamen emas, teks kaligrafi, dan ukuran font
              dengan fleksibilitas penuh langsung di browser tanpa batas template kaku.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIconBox}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>RSVP & Buku Tamu Real-Time</h3>
            <p className={styles.featureDescription}>
              Ketahui kepastian kehadiran tamu keluarga dan sahabat secara presisi. Pantau
              ucapan selamat dan doa restu secara langsung melalui dashboard interaktif.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIconBox}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Amplop Digital & QRIS Instan</h3>
            <p className={styles.featureDescription}>
              Fasilitasi tanda kasih tanpa uang tunai dengan aman. Tautkan nomor rekening bank
              atau scan QRIS langsung tanpa potongan komisi sepeser pun.
            </p>
          </div>

          {/* Feature 4 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIconBox}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Musik Latar & Audio Romantis</h3>
            <p className={styles.featureDescription}>
              Iringi perjalanan cinta Anda dengan koleksi musik instrumental eksklusif atau
              unggah lagu kenangan spesial yang berputar lembut saat undangan dibuka.
            </p>
          </div>

          {/* Feature 5 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIconBox}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Integrasi Google Maps & Rute</h3>
            <p className={styles.featureDescription}>
              Pandu tamu undangan ke lokasi akad nikah dan gedung resepsi dengan mudah.
              Terintegrasi dengan Google Maps, Waze, dan pengingat jadwal kalender.
            </p>
          </div>

          {/* Feature 6 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIconBox}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Tautan Nama Tamu Personal (VIP)</h3>
            <p className={styles.featureDescription}>
              Kirimkan tautan WhatsApp dengan salam khusus dan nama tamu tertera di sampul depan,
              memberikan rasa hormat dan sentuhan hangat personal bagi setiap undangan.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Template Catalog Products (Warm Earthy Bronze #84633F Rule) */}
      <section id="template" className={styles.templatesSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>KATALOG DESAIN EKSKLUSIF</span>
          <h2 className={styles.sectionTitle}>Pilihan Tema Elegan Berstandar Tinggi</h2>
          <p className={styles.sectionLead}>
            Setiap template dibuat dengan cermat memadukan keanggunan budaya Nusantara dan
            tren desain internasional, siap diaplikasikan untuk perayaan cinta Anda.
          </p>
        </div>

        <div className={styles.templateProductsGrid}>
          {templateCards.map((tpl) => (
            <article key={tpl.id} className={styles.productCard}>
              <div className={styles.productCardThumb}>
                <Image
                  src={tpl.image}
                  alt={tpl.title}
                  width={600}
                  height={450}
                  className={styles.productCardImg}
                />
                <span className={styles.productTag}>{tpl.tag}</span>
              </div>

              <div className={styles.productCardBody}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase" }}>
                  {tpl.category}
                </span>
                <h3 className={styles.productCardTitle}>{tpl.title}</h3>
                <p className={styles.productCardMeta}>{tpl.description}</p>

                <Link
                  href={currentUser ? "/dashboard/templates" : `/login?next=/dashboard/templates`}
                  className={styles.productActionBtn}
                >
                  <span>Pilih Desain Template</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 44 }}>
          <Link
            href={currentUser ? "/dashboard/templates" : "/login?next=/dashboard/templates"}
            className={styles.heroSecondaryBtn}
            style={{ display: "inline-flex" }}
          >
            <span>Lihat Semua Pustaka Template Studio →</span>
          </Link>
        </div>
      </section>

      {/* 6. Partner & Reseller Ecosystem */}
      <section id="reseller" className={styles.resellerSection}>
        <div className={styles.resellerBanner}>
          <div>
            <div className={styles.resellerBadge}>
              <span>💼 PROGRAM KEMITRAAN WO & RESELLER</span>
            </div>
            <h2 className={styles.resellerTitle}>
              Punya Bisnis Wedding Organizer atau Percetakan? Tingkatkan Omset Anda!
            </h2>
            <p className={styles.resellerLead}>
              Bergabunglah menjadi mitra resmi Invitation Studio. Dapatkan website toko
              khusus dengan logo & domain brand Anda sendiri, harga modal grosir, dan
              kebebasan menentukan keuntungan tanpa batas.
            </p>

            <ul className={styles.resellerFeatureList}>
              <li className={styles.resellerFeatureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Website Toko Whitelabel Sendiri</span>
              </li>
              <li className={styles.resellerFeatureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Margin Keuntungan Laba hingga 80%</span>
              </li>
              <li className={styles.resellerFeatureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Dashboard Kelola Order Klien Terpadu</span>
              </li>
              <li className={styles.resellerFeatureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Bebas Pasang Kontak CS WhatsApp Anda</span>
              </li>
            </ul>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <Link
                href={currentUser ? "/dashboard/reseller" : "/login?next=/dashboard/reseller"}
                className={styles.heroPrimaryBtn}
              >
                <span>Daftar Kemitraan Reseller</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/seller/mitra-berkah"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.heroSecondaryBtn}
                style={{ background: "rgba(255,255,255,0.1)", color: "#FFFFFF", borderColor: "rgba(255,255,255,0.3)" }}
              >
                <span>Lihat Contoh Toko Mitra ↗</span>
              </Link>
            </div>
          </div>

          <div className={styles.resellerRightCard}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
              Simulasi Keuntungan Mitra
            </h3>
            <div className={styles.resellerStatRow}>
              <span style={{ fontSize: 13, color: "#A8A29E" }}>Harga Rekomendasi Jual</span>
              <strong style={{ fontSize: 15, color: "#D4AF37" }}>Rp 150.000 / undangan</strong>
            </div>
            <div className={styles.resellerStatRow}>
              <span style={{ fontSize: 13, color: "#A8A29E" }}>Biaya Lisensi Mitra</span>
              <strong style={{ fontSize: 15, color: "#FFFFFF" }}>Rp 35.000 / undangan</strong>
            </div>
            <div className={styles.resellerStatRow}>
              <span style={{ fontSize: 13, color: "#A8A29E" }}>Estimasi 30 Klien/Bulan</span>
              <strong style={{ fontSize: 18, color: "#10B981", fontWeight: 850 }}>
                Laba Bersih Rp 3.450.000+
              </strong>
            </div>
            <p style={{ fontSize: 11.5, color: "#78716C", margin: 0, lineHeight: 1.5 }}>
              *Tanpa beban biaya server bulanan, dukungan teknis prioritas penuh dari tim kami.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Pricing Table Section */}
      <section id="harga" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>PILIHAN PAKET TRANSPARAN</span>
          <h2 className={styles.sectionTitle}>Investasi Terbaik untuk Momen Bersejarah</h2>
          <p className={styles.sectionLead}>
            Pilih paket yang paling sesuai dengan kebutuhan perayaan Anda. Tanpa biaya
            tersembunyi, siap dipakai langsung.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Plan 1 */}
          <div className={styles.pricingCard}>
            <h3 className={styles.pricingTierName}>Silver Romance</h3>
            <p className={styles.pricingTierDesc}>
              Pilihan hemat dan lengkap untuk satu acara pernikahan istimewa.
            </p>
            <div className={styles.pricingPriceRow}>
              <span className={styles.pricingCurrency}>Rp</span>
              <span className={styles.pricingAmount}>99k</span>
              <span className={styles.pricingPeriod}>/ acara</span>
            </div>

            <ul className={styles.pricingFeaturesList}>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>Masa Aktif 6 Bulan Penuh</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>Kuota Tamu Undangan Tanpa Batas</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>Buku Tamu RSVP & Ucapan Selamat</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>Amplop Digital Rekening Bank</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                <span>Peta Navigasi Google Maps</span>
              </li>
            </ul>

            <Link
              href={currentUser ? "/dashboard/invitations" : "/login?next=/dashboard/invitations"}
              className={`${styles.pricingBtn} ${styles.pricingBtnOutline}`}
            >
              Pilih Paket Silver
            </Link>
          </div>

          {/* Plan 2: POPULAR */}
          <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
            <span className={styles.popularBadge}>PALING BANYAK DIPILIH</span>
            <h3 className={styles.pricingTierName}>Gold Imperial</h3>
            <p className={styles.pricingTierDesc}>
              Fitur multimedia premium terlengkap dengan masa aktif selamanya.
            </p>
            <div className={styles.pricingPriceRow}>
              <span className={styles.pricingCurrency}>Rp</span>
              <span className={styles.pricingAmount}>199k</span>
              <span className={styles.pricingPeriod}>/ selamanya</span>
            </div>

            <ul className={styles.pricingFeaturesList}>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#D4AF37", fontWeight: 800 }}>✓</span>
                <span><strong>Masa Aktif Selamanya (Abadi)</strong></span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#D4AF37", fontWeight: 800 }}>✓</span>
                <span>Kustom Musik Latar Favorit</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#D4AF37", fontWeight: 800 }}>✓</span>
                <span>Galeri Foto & Video Sinematik</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#D4AF37", fontWeight: 800 }}>✓</span>
                <span>Amplop Digital + Scan QRIS</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#D4AF37", fontWeight: 800 }}>✓</span>
                <span>Generator WhatsApp Blast Tamu VIP</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#D4AF37", fontWeight: 800 }}>✓</span>
                <span>Bebas Revisi Data Kapan Saja</span>
              </li>
            </ul>

            <Link
              href={currentUser ? "/dashboard/invitations" : "/login?next=/dashboard/invitations"}
              className={`${styles.pricingBtn} ${styles.pricingBtnPrimary}`}
            >
              Pilih Paket Gold Imperial →
            </Link>
          </div>

          {/* Plan 3 */}
          <div className={styles.pricingCard}>
            <h3 className={styles.pricingTierName}>Agency & WO Pro</h3>
            <p className={styles.pricingTierDesc}>
              Paket kemitraan resmi untuk Wedding Organizer, fotografer, & agensi.
            </p>
            <div className={styles.pricingPriceRow}>
              <span className={styles.pricingCurrency}>Rp</span>
              <span className={styles.pricingAmount}>499k</span>
              <span className={styles.pricingPeriod}>/ 10 kuota</span>
            </div>

            <ul className={styles.pricingFeaturesList}>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#84633F", fontWeight: 800 }}>✓</span>
                <span>Termasuk 10 Kuota Undangan Digital</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#84633F", fontWeight: 800 }}>✓</span>
                <span>Website Toko Khusus Whitelabel</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#84633F", fontWeight: 800 }}>✓</span>
                <span>Dukungan Subdomain Kustom</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#84633F", fontWeight: 800 }}>✓</span>
                <span>Kelola Klien & Order Terpusat</span>
              </li>
              <li className={styles.pricingFeatureItem}>
                <span style={{ color: "#84633F", fontWeight: 800 }}>✓</span>
                <span>Akses CS WhatsApp Prioritas VIP</span>
              </li>
            </ul>

            <Link
              href={currentUser ? "/dashboard/reseller" : "/login?next=/dashboard/reseller"}
              className={`${styles.pricingBtn} ${styles.pricingBtnOutline}`}
            >
              Daftar Paket Mitra WO
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Testimonials Section */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>TESTIMONI & CERITA BAHAGIA</span>
          <h2 className={styles.sectionTitle}>Dipercaya Ribuan Pasangan & Mitra WO</h2>
          <p className={styles.sectionLead}>
            Inilah pengalaman mereka yang telah menyempurnakan hari bahagia bersama Invitation Studio.
          </p>
        </div>

        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <div>
              <div className={styles.starRating} aria-label="5 dari 5 bintang">★★★★★</div>
              <p className={styles.testimonialQuote}>
                &ldquo;Tamu-tamu kami sangat terpesona saat membuka undangannya. Musik latarnya
                begitu syahdu dan desain tema adat Jawanya sangat anggun berwibawa. Sangat praktis
                bisa sebar via WhatsApp dalam hitungan menit.&rdquo;
              </p>
            </div>
            <div className={styles.testimonialAuthor}>
              <div className={styles.authorAvatar}>RA</div>
              <div>
                <h4 className={styles.authorName}>Raden Arya & Annisa Larasati</h4>
                <p className={styles.authorRole}>Pengantin · Resepsi Jakarta</p>
              </div>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div>
              <div className={styles.starRating} aria-label="5 dari 5 bintang">★★★★★</div>
              <p className={styles.testimonialQuote}>
                &ldquo;Fitur amplop digital dan RSVP real-time sangat membantu kami mengatur
                porsi katering gedung pernikahan secara akurat. Tamu dari luar kota juga memuji
                navigasi Google Maps-nya yang tepat sasaran.&rdquo;
              </p>
            </div>
            <div className={styles.testimonialAuthor}>
              <div className={styles.authorAvatar}>DC</div>
              <div>
                <h4 className={styles.authorName}>Dimas Prasetyo & Clarissa</h4>
                <p className={styles.authorRole}>Pengantin · Resepsi Bandung</p>
              </div>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div>
              <div className={styles.starRating} aria-label="5 dari 5 bintang">★★★★★</div>
              <p className={styles.testimonialQuote}>
                &ldquo;Sebagai Wedding Organizer, bergabung menjadi mitra reseller adalah
                keputusan terbaik. Klien kami senang dengan website toko whitelabel kami sendiri,
                dan pembuatan undangan klien selesai secepat kilat.&rdquo;
              </p>
            </div>
            <div className={styles.testimonialAuthor}>
              <div className={styles.authorAvatar}>SR</div>
              <div>
                <h4 className={styles.authorName}>Siti Rahma, S.Sn</h4>
                <p className={styles.authorRole}>Owner Berkah Wedding Organizer · Surabaya</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Interactive FAQ Accordion */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>PERTANYAAN UMUM</span>
          <h2 className={styles.sectionTitle}>Hal yang Sering Ditanyakan</h2>
          <p className={styles.sectionLead}>
            Semua jawaban atas keraguan Anda seputar kemudahan pembuatan undangan digital.
          </p>
        </div>

        <LandingFaqAccordion items={faqItems} />
      </section>

      {/* 10. Grand Finale CTA Banner */}
      <section className={styles.ctaFinalSection}>
        <div className={styles.ctaFinalBanner}>
          <span className={styles.ctaFinalEyebrow}>MULAI LANGKAH BAHAGIA ANDA</span>
          <h2 className={styles.ctaFinalTitle}>
            Wujudkan Undangan Digital Pernikahan Impian Anda Hari Ini
          </h2>
          <p className={styles.ctaFinalLead}>
            Bergabunglah bersama ribuan pengantin bahagia dan ratusan mitra profesional di seluruh Indonesia.
            Hadirkan undangan yang anggun, berkesan, dan tak terlupakan.
          </p>
          <div className={styles.ctaFinalButtons}>
            <Link
              href={currentUser ? "/dashboard" : "/login?next=/dashboard"}
              className={styles.heroPrimaryBtn}
            >
              <span>Mulai Buat Undangan Sekarang →</span>
            </Link>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Invitation%20Studio,%20saya%20ingin%20tanya%20seputar%20pembuatan%20undangan%20digital"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroSecondaryBtn}
              style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF", borderColor: "rgba(255,255,255,0.35)" }}
            >
              <span>💬 Konsultasi CS via WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className={styles.brandLogo} aria-hidden="true">
                IS
              </span>
              <strong style={{ fontSize: "1.15rem", color: "#FFFFFF" }}>
                Invitation Studio
              </strong>
            </div>
            <p className={styles.footerBrandDesc}>
              Platform studio digital wedding terdepan di Indonesia. Menggabungkan
              keindahan visual editorial, teknologi kanvas bebas, dan kemitraan agensi.
            </p>
          </div>

          <div>
            <h4 className={styles.footerColTitle}>Produk & Fitur</h4>
            <ul className={styles.footerLinkList}>
              <li><a href="#fitur" className={styles.footerLink}>Editor Kanvas</a></li>
              <li><a href="#template" className={styles.footerLink}>Katalog Desain</a></li>
              <li><a href="#fitur" className={styles.footerLink}>Buku Tamu RSVP</a></li>
              <li><a href="#fitur" className={styles.footerLink}>Amplop Digital</a></li>
            </ul>
          </div>

          <div>
            <h4 className={styles.footerColTitle}>Kemitraan</h4>
            <ul className={styles.footerLinkList}>
              <li><a href="#reseller" className={styles.footerLink}>Wedding Organizer</a></li>
              <li><a href="#reseller" className={styles.footerLink}>Portal Reseller</a></li>
              <li><Link href="/seller/mitra-berkah" className={styles.footerLink}>Demo Storefront</Link></li>
              <li><a href="#harga" className={styles.footerLink}>Paket Lisensi Grosir</a></li>
            </ul>
          </div>

          <div>
            <h4 className={styles.footerColTitle}>Bantuan & Kontak</h4>
            <ul className={styles.footerLinkList}>
              <li><Link href="/login" className={styles.footerLink}>Masuk Dashboard</Link></li>
              <li><a href="#faq" className={styles.footerLink}>Pusat Bantuan FAQ</a></li>
              <li>
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  WhatsApp: +62 812-3456-7890
                </a>
              </li>
              <li>
                <span className={styles.footerLink}>Email: support@invitationstudio.id</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} Invitation Studio / Undangan.id. Seluruh hak cipta dilindungi undang-undang.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <span style={{ color: "#78716C" }}>Keamanan Terenkripsi</span>
            <span style={{ color: "#78716C" }}>Made with Prestige in Indonesia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
