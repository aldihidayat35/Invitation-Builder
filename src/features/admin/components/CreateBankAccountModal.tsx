"use client";

import { useActionState } from "react";
import type { ActionState } from "../types";
import styles from "./admin.module.css";

interface CreateBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function CreateBankAccountModal({
  isOpen,
  onClose,
  action,
}: CreateBankAccountModalProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modalCard}
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBox}>
            <h3 className={styles.modalTitle}>Tambah Rekening Pembayaran Manual</h3>
            <p className={styles.modalSub}>
              Rekening tujuan transfer yang akan dilihat oleh mitra reseller saat melakukan top-up.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup modal rekening"
          >
            ×
          </button>
        </div>

        <form action={formAction} className={styles.modalBody}>
          {state.error ? <div className={styles.formError}>{state.error}</div> : null}

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Nama Bank / Saluran Pembayaran <span style={{ color: "var(--dash-danger)" }}>*</span>
            </label>
            <input
              type="text"
              name="bankName"
              required
              placeholder="Contoh: BCA, Bank Mandiri, BRI, QRIS Statis"
              className={styles.inputControl}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nomor Rekening / No. HP <span style={{ color: "var(--dash-danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="accountNumber"
                required
                placeholder="Contoh: 1234567890"
                className={styles.inputControl}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Atas Nama Pemilik <span style={{ color: "var(--dash-danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="accountHolder"
                required
                placeholder="Contoh: PT Undangan Digital / Aldi H."
                className={styles.inputControl}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>URL Gambar QRIS (Opsional)</label>
            <input
              type="url"
              name="qrCodeUrl"
              placeholder="https://... atau /assets/qris.png"
              className={styles.inputControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Instruksi / Catatan Transfer (Opsional)</label>
            <textarea
              name="instructions"
              rows={2}
              placeholder="Contoh: Cantumkan nama agensi pada berita transfer."
              className={styles.inputControl}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className={styles.modalActions} style={{ marginTop: 12 }}>
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
              {isPending ? "Menyimpan..." : "Simpan Rekening"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
