"use client";

import { useState, useId } from "react";
import Image from "next/image";
import type { TemplateExtendedMetadata } from "@/lib/schema/domain";
import styles from "./seller-storefront.module.css";

export interface StorefrontTemplateItem {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string;
  style: string;
  thumbnailUrl: string | null;
  previewMockupUrl: string | null;
  price: number;
  tier: string;
  status: string;
  metadata?: TemplateExtendedMetadata | null;
  tags?: string[] | null;
}

interface StorefrontCatalogViewProps {
  templates: StorefrontTemplateItem[];
  agencyName: string;
  whatsappContact: string;
  onSelectTemplate?: (templateId: string) => void;
}

function getCleanWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const cleanPhone = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function StorefrontCatalogView({
  templates,
  agencyName,
  whatsappContact,
  onSelectTemplate,
}: StorefrontCatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalTemplate, setActiveModalTemplate] = useState<StorefrontTemplateItem | null>(
    null,
  );
  const modalHeadingId = useId();

  // Extract unique categories for filter tabs
  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean)),
  );

  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  const handleOpenDetail = (template: StorefrontTemplateItem) => {
    setActiveModalTemplate(template);
  };

  const handleCloseDetail = () => {
    setActiveModalTemplate(null);
  };

  const handleSelectForOrder = (template: StorefrontTemplateItem) => {
    onSelectTemplate?.(template.id);
    setActiveModalTemplate(null);
    const formEl = document.getElementById("form-pemesanan");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={styles.catalogSection}>
      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className={styles.filterBar}>
          <button
            type="button"
            className={`${styles.filterBtn} ${selectedCategory === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            Semua Koleksi ({templates.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterBtn} ${selectedCategory.toLowerCase() === cat.toLowerCase() ? styles.filterBtnActive : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Templates Grid */}
      <div className={styles.templateGrid}>
        {filteredTemplates.length === 0 ? (
          <div className={styles.emptyCatalog}>
            <p>Belum ada desain dalam kategori ini. Silakan pilih kategori lain atau hubungi kami langsung.</p>
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const previewImg = tpl.previewMockupUrl || tpl.thumbnailUrl || "/images/template-botanical.jpg";
            const waOrderMsg = `Halo *${agencyName}*, saya tertarik dan ingin memesan website undangan digital dengan tema: *${tpl.name}*. Boleh dibantu info harga dan detail pemesanannya?`;
            const waOrderUrl = getCleanWhatsAppUrl(whatsappContact, waOrderMsg);

            return (
              <div key={tpl.id} className={styles.templateCard}>
                <div className={styles.templateThumbWrapper}>
                  {previewImg ? (
                    <Image
                      src={previewImg}
                      alt={tpl.name}
                      width={480}
                      height={320}
                      className={styles.templateThumbImage}
                      unoptimized={previewImg.startsWith("http")}
                    />
                  ) : (
                    <div className={styles.templateThumbPlaceholder}>
                      <span>{tpl.name}</span>
                    </div>
                  )}
                  <div className={styles.templateOverlay}>
                    <button
                      type="button"
                      className={styles.quickDetailBtn}
                      onClick={() => handleOpenDetail(tpl)}
                    >
                      👁 Lihat Detail & Fitur
                    </button>
                  </div>
                  <div className={styles.cardBadges}>
                    <span className={styles.categoryBadge}>{tpl.category || "Wedding"}</span>
                    {tpl.style && <span className={styles.styleBadge}>{tpl.style}</span>}
                  </div>
                </div>

                <div className={styles.templateBody}>
                  <div className={styles.templateHeaderRow}>
                    <h3 className={styles.templateName}>{tpl.name}</h3>
                  </div>

                  <p className={styles.templateDescription}>
                    {tpl.description || "Desain eksklusif dengan tata letak responsif, animasi lembut, dan ornamen mewah siap memukau para tamu."}
                  </p>

                  <div className={styles.featurePills}>
                    <span className={styles.featurePill}>📱 Responsif</span>
                    <span className={styles.featurePill}>💌 RSVP & Doa</span>
                    <span className={styles.featurePill}>🎵 Musik Latar</span>
                    <span className={styles.featurePill}>🗺️ Google Maps</span>
                  </div>

                  <div className={styles.templateCardActions}>
                    <button
                      type="button"
                      className={styles.btnDetail}
                      onClick={() => handleOpenDetail(tpl)}
                    >
                      Detail Desain
                    </button>
                    <a
                      href={waOrderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.btnCardWa}
                      title="Pesan tema ini via WhatsApp"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                      </svg>
                      Pesan
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Product Detail Modal */}
      {activeModalTemplate && (
        <div
          className={styles.modalBackdrop}
          onClick={handleCloseDetail}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalHeadingId}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={handleCloseDetail}
              aria-label="Tutup Detail"
            >
              ✕
            </button>

            <div className={styles.modalGrid}>
              {/* Left Column: Image Preview */}
              <div className={styles.modalMediaCol}>
                <div className={styles.modalImageContainer}>
                  <Image
                    src={
                      activeModalTemplate.previewMockupUrl ||
                      activeModalTemplate.thumbnailUrl ||
                      "/images/template-botanical.jpg"
                    }
                    alt={activeModalTemplate.name}
                    width={720}
                    height={480}
                    className={styles.modalImage}
                    unoptimized={
                      (activeModalTemplate.previewMockupUrl || "").startsWith("http") ||
                      (activeModalTemplate.thumbnailUrl || "").startsWith("http")
                    }
                  />
                  <div className={styles.modalBadges}>
                    <span className={styles.categoryBadge}>{activeModalTemplate.category || "Wedding"}</span>
                    {activeModalTemplate.style && (
                      <span className={styles.styleBadge}>{activeModalTemplate.style}</span>
                    )}
                  </div>
                </div>

                {activeModalTemplate.metadata?.demoInvitationSlug && (
                  <div className={styles.demoLinkWrapper}>
                    <a
                      href={`/i/${activeModalTemplate.metadata.demoInvitationSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.btnDemoLive}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Lihat Demo Undangan Langsung ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Info & Actions */}
              <div className={styles.modalInfoCol}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTagline}>Koleksi Desain Undangan Digital</div>
                  <h2 id={modalHeadingId} className={styles.modalTitle}>{activeModalTemplate.name}</h2>
                </div>

                <p className={styles.modalDesc}>
                  {activeModalTemplate.description ||
                    "Tema undangan digital eksklusif yang dirancang secara detail untuk memberikan kesan mewah dan tak terlupakan bagi setiap tamu undangan Anda."}
                </p>

                <div className={styles.modalFeatureSection}>
                  <h4 className={styles.modalFeatureHeading}>Fitur Lengkap yang Disertakan:</h4>
                  <ul className={styles.modalFeatureList}>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Desain Responsif & Elegan:</strong> Tampilan sempurna di Android, iPhone, tablet, & desktop.
                      </div>
                    </li>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Konfirmasi Kehadiran (RSVP) & Doa:</strong> Tamu dapat mengonfirmasi kehadiran dan menuliskan pesan ucapan doa.
                      </div>
                    </li>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Navigasi Lokasi Google Maps:</strong> Peta lokasi resepsi/akad dengan petunjuk arah langsung ke Google Maps.
                      </div>
                    </li>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Musik Latar / Backsound Otomatis:</strong> Iringan musik romantis pilihan yang menyala saat tamu membuka undangan.
                      </div>
                    </li>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Amplop Digital & Rekening Hadiah:</strong> Fitur kirim hadiah cashless via transfer bank atau QRIS.
                      </div>
                    </li>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Hitung Mundur Acara (Countdown):</strong> Timer hitung mundur interaktif menuju momen hari bahagia.
                      </div>
                    </li>
                    <li>
                      <span className={styles.checkIcon}>✓</span>
                      <div>
                        <strong>Galeri Foto & Momen Cerita:</strong> Tampilkan foto prewedding dan kisah cinta Anda berdua.
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className={styles.modalActions}>
                  <a
                    href={getCleanWhatsAppUrl(
                      whatsappContact,
                      `Halo *${agencyName}*, saya tertarik dan ingin memesan website undangan digital dengan tema: *${activeModalTemplate.name}*. Boleh dibantu info harga dan detail pemesanannya?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.modalBtnWa}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                    </svg>
                    Pesan Desain Ini via WhatsApp
                  </a>

                  <button
                    type="button"
                    className={styles.modalBtnSelect}
                    onClick={() => handleSelectForOrder(activeModalTemplate)}
                  >
                    Gunakan Tema Ini di Formulir Pemesanan ↓
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
