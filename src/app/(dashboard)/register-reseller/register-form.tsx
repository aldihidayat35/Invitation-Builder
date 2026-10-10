"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { registerResellerAction, type RegisterResellerState } from "./actions";
import styles from "./register.module.css";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterResellerState, FormData>(
    registerResellerAction,
    {},
  );

  const [agencyName, setAgencyName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    agencyName: string;
    slug: string;
    email: string;
  } | null>(null);

  // Sync slug from agency name if not manually modified
  const handleAgencyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAgencyName(val);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  const handleSubmit = (formData: FormData) => {
    setSubmittedData({
      agencyName: (formData.get("agencyName") as string) || agencyName,
      slug: (formData.get("slug") as string) || slug,
      email: (formData.get("email") as string) || "",
    });
    action(formData);
  };

  if (state.ok) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIconWrapper}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className={styles.successTitle}>Pendaftaran Berhasil Dikirim!</h2>
        <p className={styles.successDesc}>
          {state.message ||
            "Akun Reseller Anda sedang menunggu persetujuan (ACC) dari Admin. Kami akan mengonfirmasi aktivasi akun Anda melalui WhatsApp."}
        </p>

        {submittedData ? (
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Nama Brand / Toko:</span>
              <span className={styles.infoValue}>{submittedData.agencyName}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>URL Toko:</span>
              <span className={styles.infoValue}>/seller/{submittedData.slug}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email Akun:</span>
              <span className={styles.infoValue}>{submittedData.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status:</span>
              <span className={styles.infoValue} style={{ color: "#d97706" }}>
                Menunggu Persetujuan Admin (Pending)
              </span>
            </div>
          </div>
        ) : null}

        <Link href="/login" className={styles.btnReturn}>
          Kembali ke Halaman Login
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className={styles.form} noValidate>
      {state.error ? (
        <div role="alert" className={styles.error}>
          {state.error}
        </div>
      ) : null}

      <div className={styles.row}>
        <label className={styles.field}>
          <span>Nama Lengkap</span>
          <input
            id="register-name"
            name="name"
            type="text"
            required
            placeholder="misal: Budi Santoso"
            autoComplete="name"
          />
        </label>

        <label className={styles.field}>
          <span>Email Akun</span>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            placeholder="nama@bisnisanda.com"
            autoComplete="email"
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span>Nama Brand / Toko</span>
          <input
            id="register-agency"
            name="agencyName"
            type="text"
            required
            placeholder="misal: Berkah Undangan"
            value={agencyName}
            onChange={handleAgencyNameChange}
          />
        </label>

        <label className={styles.field}>
          <span>
            Slug URL Toko
            <span className={styles.fieldHint}>Bisa diedit</span>
          </span>
          <input
            id="register-slug"
            name="slug"
            type="text"
            required
            placeholder="berkah-undangan"
            value={slug}
            onChange={handleSlugChange}
          />
          <div className={styles.slugPreview}>
            Preview Toko: <strong>/seller/{slug || "nama-toko"}</strong>
          </div>
        </label>
      </div>

      <label className={styles.field}>
        <span>
          Nomor WhatsApp Aktif
          <span className={styles.fieldHint}>Untuk konfirmasi aktivasi</span>
        </span>
        <input
          id="register-whatsapp"
          name="whatsappContact"
          type="tel"
          required
          placeholder="081234567890 atau 6281234567890"
          autoComplete="tel"
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span>Password</span>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span>Ulangi Password</span>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            required
            placeholder="Konfirmasi password"
            autoComplete="new-password"
          />
        </label>
      </div>

      <button id="register-submit" type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Mendaftarkan Akun…" : "Daftar Jadi Mitra Reseller"}
      </button>

      <div className={styles.footer}>
        Sudah memiliki akun?
        <Link href="/login" className={styles.loginLink}>
          Masuk di sini
        </Link>
      </div>
    </form>
  );
}
