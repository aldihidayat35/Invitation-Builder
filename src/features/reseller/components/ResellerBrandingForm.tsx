"use client";

import { useActionState } from "react";
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
  };
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function ResellerBrandingForm({ initialData, action }: ResellerBrandingProfileProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <div className={styles.formCard} style={{ maxWidth: 640 }}>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {state.error ? <div className={styles.formError}>{state.error}</div> : null}
        {state.ok && state.message ? (
          <div className={styles.formSuccess}>{state.message}</div>
        ) : null}

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Nama Agensi / Brand <span style={{ color: "var(--dash-danger)" }}>*</span>
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
          <label className={styles.label}>Slug Agensi (ID URL Unik)</label>
          <input
            type="text"
            disabled
            value={initialData.slug}
            className={styles.inputControl}
            style={{ opacity: 0.7, cursor: "not-allowed" }}
          />
          <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
            Slug bersifat permanen dan tidak dapat diubah setelah pembuatan.
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Nomor WhatsApp Customer Service <span style={{ color: "var(--dash-danger)" }}>*</span>
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
            Nomor kontak ini akan ditampilkan ke klien Anda jika mereka butuh bantuan.
          </span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>URL Logo Agensi (Opsional)</label>
          <input
            type="url"
            name="logoUrl"
            defaultValue={initialData.logoUrl || ""}
            placeholder="https://.../logo.png"
            className={styles.inputControl}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Warna Aksen Brand Agensi</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="color"
              name="brandColor"
              defaultValue={initialData.brandColor || "#3b82f6"}
              style={{ width: 44, height: 44, padding: 0, border: "none", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "var(--dash-muted)" }}>
              Digunakan pada tema dan portal klien agensi Anda.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" className={styles.btnPrimary} disabled={isPending}>
            {isPending ? "Menyimpan Perubahan..." : "Simpan Pengaturan Branding"}
          </button>
        </div>
      </form>
    </div>
  );
}
