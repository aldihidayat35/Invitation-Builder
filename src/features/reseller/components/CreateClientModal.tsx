"use client";

import { useActionState } from "react";
import type { ActionState } from "../types";
import styles from "./reseller.module.css";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function CreateClientModal({ isOpen, onClose, action }: CreateClientModalProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modalCard}
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Tambah Akun Klien Baru</h3>
            <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: "4px 0 0 0" }}>
              Klien akan dibuatkan akun tersendiri di bawah naungan agensi Anda.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup modal klien"
          >
            ×
          </button>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {state.error ? <div className={styles.formError}>{state.error}</div> : null}

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Nama Lengkap Klien <span style={{ color: "var(--dash-danger)" }}>*</span>
            </label>
            <input
              type="text"
              name="clientName"
              required
              placeholder="Contoh: Rian & Sinta"
              className={styles.inputControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Email Klien <span style={{ color: "var(--dash-danger)" }}>*</span>
            </label>
            <input
              type="email"
              name="clientEmail"
              required
              placeholder="rian@example.com"
              className={styles.inputControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password Akun Klien (Opsional)</label>
            <input
              type="password"
              name="password"
              placeholder="Default: klien12345#"
              className={styles.inputControl}
            />
            <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
              Biarkan kosong jika ingin menggunakan password default.
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={isPending}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isPending}
            >
              {isPending ? "Membuat Klien..." : "Buat Akun Klien"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
