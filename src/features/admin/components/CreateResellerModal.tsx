"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "../types";
import styles from "./admin.module.css";

interface CreateResellerModalProps {
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

function CreateResellerDialog({
  action,
  onClose,
}: {
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  onClose: () => void;
}) {
  const [agencyName, setAgencyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugModified, setSlugModified] = useState(false);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {});

  // Close dialog when submission succeeds
  const [prevOk, setPrevOk] = useState(state.ok);
  if (state.ok && state.ok !== prevOk) {
    setPrevOk(state.ok);
    onClose();
  }

  const handleAgencyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAgencyName(val);
    if (!slugModified) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <h3 id="modal-title">Tambah Mitra Reseller Baru</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isPending}
            aria-label="Tutup"
          >
            &times;
          </button>
        </div>

        <form action={formAction}>
          <div className={styles.modalBody}>
            {state.error ? (
              <div className={styles.formError} role="alert">
                {state.error}
              </div>
            ) : null}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-name">
                Nama Penanggung Jawab / Admin
              </label>
              <input
                id="field-name"
                name="name"
                type="text"
                required
                placeholder="misal: Budi Pratama"
                className={styles.inputControl}
                disabled={isPending}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-email">
                Alamat Email (Akun Login)
              </label>
              <input
                id="field-email"
                name="email"
                type="email"
                required
                placeholder="misal: budi@royalwedding.test"
                className={styles.inputControl}
                disabled={isPending}
              />
              <span className={styles.fieldHint}>Email akan digunakan oleh mitra untuk login ke portal reseller.</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-password">
                Password Awal
              </label>
              <input
                id="field-password"
                name="password"
                type="password"
                placeholder="Minimal 10 karakter (default jika kosong: reseller12345#)"
                className={styles.inputControl}
                disabled={isPending}
              />
              <span className={styles.fieldHint}>Dapat diubah oleh mitra setelah login pertama.</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-agency-name">
                Nama Agensi / Brand Bisnis
              </label>
              <input
                id="field-agency-name"
                name="agencyName"
                type="text"
                required
                value={agencyName}
                onChange={handleAgencyNameChange}
                placeholder="misal: Royal Wedding Organizer"
                className={styles.inputControl}
                disabled={isPending}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-slug">
                Slug Agensi (ID URL)
              </label>
              <input
                id="field-slug"
                name="slug"
                type="text"
                required
                pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                value={slug}
                onChange={(e) => {
                  setSlugModified(true);
                  setSlug(e.target.value);
                }}
                placeholder="misal: royal-wedding-organizer"
                className={styles.inputControl}
                disabled={isPending}
              />
              <span className={styles.fieldHint}>Hanya huruf kecil, angka, dan tanda hubung (-).</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-whatsapp">
                Kontak WhatsApp CS
              </label>
              <input
                id="field-whatsapp"
                name="whatsappContact"
                type="text"
                required
                placeholder="misal: 6281234567890"
                className={styles.inputControl}
                disabled={isPending}
              />
              <span className={styles.fieldHint}>Gunakan format kode negara (misal 628...).</span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="field-domain">
                Domain Khusus Seller (Opsional)
              </label>
              <input
                id="field-domain"
                name="customDomain"
                type="text"
                placeholder="misal: undangan.tokosaya.com"
                className={styles.inputControl}
                disabled={isPending}
              />
              <span className={styles.fieldHint}>Website / domain khusus untuk identitas seller melayani customer.</span>
            </div>
          </div>

          <div className={styles.modalFooter}>
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
              id="btn-submit-reseller"
            >
              {isPending ? "Menyimpan…" : "Simpan & Buat Reseller"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateResellerModal({ action }: CreateResellerModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={() => setIsOpen(true)}
        id="btn-tambah-reseller"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Tambah Reseller Baru
      </button>

      {isOpen ? (
        <CreateResellerDialog action={action} onClose={() => setIsOpen(false)} />
      ) : null}
    </>
  );
}
