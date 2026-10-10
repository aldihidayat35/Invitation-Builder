"use client";

import { useActionState, useState } from "react";
import { copyTextToClipboard } from "@/lib/browser/clipboard";
import type { ActionState } from "../types";
import styles from "./reseller.module.css";

interface ResellerBrandingProfileProps {
  initialData: {
    agencyName: string;
    slug: string;
    whatsappContact: string;
    logoUrl?: string | null;
    brandColor?: string;
    customDomain?: string | null;
    heroImageUrl?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroBadge?: string | null;
    domainStatus: string;
    domainVerificationToken?: string | null;
    domainLastCheckedAt?: Date | null;
    tlsStatus: string;
  };
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  verifyAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function ResellerBrandingForm({
  initialData,
  action,
  verifyAction,
}: ResellerBrandingProfileProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [verifyState, verifyFormAction, isVerifying] = useActionState(verifyAction, {});
  const [copied, setCopied] = useState(false);
  const [heroImagePreview, setHeroImagePreview] = useState(initialData.heroImageUrl || "");

  const storefrontUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/seller/${initialData.slug}`
      : `/seller/${initialData.slug}`;

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined") return;
    try {
      if (!(await copyTextToClipboard(storefrontUrl))) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.formCard} style={{ maxWidth: 680 }}>
      {/* Storefront Link Banner */}
      <div
        style={{
          padding: "1.25rem",
          marginBottom: "1.5rem",
          borderRadius: "8px",
          background: "var(--dash-card-bg)",
          border: "1px solid var(--dash-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "var(--dash-text)", fontSize: "0.95rem" }}>
              Website Toko / Etalase Publik Seller Anda
            </div>
            <div
              style={{ fontSize: "0.85rem", color: "var(--dash-text-muted)", marginTop: "0.2rem" }}
            >
              {storefrontUrl}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className={styles.btnSecondary}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
            >
              {copied ? "Tersalin!" : "Salin Link"}
            </button>
            <a
              href={`/seller/${initialData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", textDecoration: "none" }}
            >
              Lihat Website Toko ↗
            </a>
          </div>
        </div>
      </div>

      {initialData.customDomain ? (
        <form action={verifyFormAction} className={styles.formGroup} style={{ marginBottom: 18 }}>
          <strong>Status domain: {initialData.domainStatus}</strong>
          <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
            Tambahkan TXT <code>_undangan-verification.{initialData.customDomain}</code> dengan
            nilai <code>undangan-verification={initialData.domainVerificationToken}</code>.
          </span>
          <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
            TLS: {initialData.tlsStatus}. Domain baru aktif setelah DNS terverifikasi dan TLS
            diaktifkan tim platform.
          </span>
          {verifyState.error ? <div className={styles.formError}>{verifyState.error}</div> : null}
          {verifyState.message ? (
            <div className={styles.formSuccess}>{verifyState.message}</div>
          ) : null}
          <button type="submit" className={styles.btnSecondary} disabled={isVerifying}>
            {isVerifying ? "Memeriksa DNS..." : "Periksa Verifikasi DNS"}
          </button>
        </form>
      ) : null}

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {state.error ? <div className={styles.formError}>{state.error}</div> : null}
        {state.ok && state.message ? (
          <div className={styles.formSuccess}>{state.message}</div>
        ) : null}

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Nama Toko / Brand Seller <span style={{ color: "var(--dash-danger)" }}>*</span>
          </label>
          <input
            type="text"
            name="agencyName"
            defaultValue={initialData.agencyName}
            required
            className={styles.inputControl}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Slug URL Toko (ID Publik)</label>
          <input
            type="text"
            disabled
            value={initialData.slug}
            className={styles.inputControl}
            style={{ opacity: 0.7, cursor: "not-allowed" }}
          />
          <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
            Slug digunakan untuk alamat web toko Anda: <code>/seller/{initialData.slug}</code>
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Nomor WhatsApp Melayani Customer <span style={{ color: "var(--dash-danger)" }}>*</span>
          </label>
          <input
            type="text"
            name="whatsappContact"
            defaultValue={initialData.whatsappContact}
            required
            placeholder="6281234567890"
            className={styles.inputControl}
          />
          <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
            Pesanan customer di website toko akan otomatis diarahkan untuk konfirmasi ke WhatsApp
            ini.
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Domain Khusus Seller (Custom Domain - Opsional)</label>
          <input
            type="text"
            name="customDomain"
            defaultValue={initialData.customDomain || ""}
            placeholder="undangan.tokosaya.com"
            className={styles.inputControl}
          />
          <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
            Jika Anda memiliki domain sendiri, masukkan nama domain di sini (tanpa https://).
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>URL Logo Toko / Brand (Opsional)</label>
          <input
            type="url"
            name="logoUrl"
            defaultValue={initialData.logoUrl || ""}
            placeholder="https://.../logo.png"
            className={styles.inputControl}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Warna Aksen Identitas Brand</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="color"
              name="brandColor"
              defaultValue={initialData.brandColor || "#84633f"}
              style={{ width: 44, height: 44, padding: 0, border: "none", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "var(--dash-muted)" }}>
              Digunakan pada aksen warna tombol dan elemen landing page toko Anda.
            </span>
          </div>
        </div>

        {/* Section Pengaturan Hero Section Dinamis */}
        <div
          style={{
            marginTop: "10px",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid var(--dash-border)",
            background: "var(--dash-surface-sunken)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div style={{ borderBottom: "1px solid var(--dash-border)", paddingBottom: "10px" }}>
            <strong style={{ fontSize: "14px", color: "var(--dash-text)", display: "block" }}>
              🖼️ Pengaturan Hero Section & Landing Page
            </strong>
            <span style={{ fontSize: "12px", color: "var(--dash-muted)" }}>
              Kustomisasi tampilan bagian atas landing page etalase toko online Anda agar tampil profesional.
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Foto / Banner Hero Section (URL Gambar)</label>
            <input
              type="url"
              name="heroImageUrl"
              defaultValue={initialData.heroImageUrl || ""}
              placeholder="https://.../banner-wedding.jpg"
              className={styles.inputControl}
              onChange={(e) => setHeroImagePreview(e.target.value)}
            />
            <span style={{ fontSize: "11px", color: "var(--dash-muted)" }}>
              Kosongkan jika ingin menggunakan gambar ilustrasi default yang elegan.
            </span>
            {heroImagePreview ? (
              <div
                style={{
                  marginTop: "8px",
                  maxHeight: "140px",
                  overflow: "hidden",
                  borderRadius: "8px",
                  border: "1px solid var(--dash-border)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImagePreview}
                  alt="Preview Hero"
                  style={{ width: "100%", height: "140px", objectFit: "cover" }}
                  onError={() => setHeroImagePreview("")}
                />
              </div>
            ) : null}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Badge / Tagline Hero</label>
            <input
              type="text"
              name="heroBadge"
              defaultValue={initialData.heroBadge || ""}
              placeholder="misal: ★ Mitra Resmi Invitation Studio atau Pilihan Terbaik Pengantin"
              className={styles.inputControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Headline / Judul Utama Hero</label>
            <input
              type="text"
              name="heroTitle"
              defaultValue={initialData.heroTitle || ""}
              placeholder="misal: Wujudkan Momen Pernikahan Istimewa dengan Undangan Digital Eksklusif"
              className={styles.inputControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Subheadline / Deskripsi Hero</label>
            <textarea
              name="heroSubtitle"
              defaultValue={initialData.heroSubtitle || ""}
              placeholder="misal: Desain mewah, animasi lembut, RSVP real-time, dan kemudahan berbagi ke seluruh tamu undangan Anda."
              rows={3}
              className={styles.inputControl}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" className={styles.btnPrimary} disabled={isPending}>
            {isPending ? "Menyimpan Perubahan..." : "Simpan Pengaturan Toko"}
          </button>
        </div>
      </form>
    </div>
  );
}
