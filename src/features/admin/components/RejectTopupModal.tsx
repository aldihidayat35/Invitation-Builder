"use client";

import { useActionState } from "react";
import type { ActionState, AdminTopupRequestItem } from "../types";
import styles from "./admin.module.css";

interface RejectTopupModalProps {
  item: AdminTopupRequestItem | null;
  onClose: () => void;
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function RejectTopupModal({ item, onClose, action }: RejectTopupModalProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  if (!item) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modalCard}
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBox}>
            <h3 className={styles.modalTitle} style={{ color: "var(--dash-danger)" }}>
              Tolak Permintaan Top-Up
            </h3>
            <p className={styles.modalSub}>
              {item.reseller.agencyName} (Rp {item.request.amountPaid.toLocaleString("id-ID")})
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup modal tolak"
          >
            ×
          </button>
        </div>

        <form action={formAction} className={styles.modalBody}>
          <input type="hidden" name="requestId" value={item.request.id} />

          {state.error ? <div className={styles.formError}>{state.error}</div> : null}

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Alasan Penolakan <span style={{ color: "var(--dash-danger)" }}>*</span>
            </label>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder="Contoh: Mutasi rekening tidak ditemukan atau nominal transfer tidak sesuai."
              className={styles.inputControl}
              style={{ resize: "vertical" }}
            />
            <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
              Alasan ini akan ditampilkan kepada reseller pada portal mereka.
            </span>
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
              className={styles.btnReject}
              disabled={isPending}
              style={{ padding: "8px 16px" }}
            >
              {isPending ? "Memproses..." : "Konfirmasi Tolak"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
