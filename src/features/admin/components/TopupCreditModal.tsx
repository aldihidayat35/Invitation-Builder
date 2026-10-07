"use client";

import { useActionState, useState } from "react";
import type { ActionState, AdminResellerItem } from "../types";
import styles from "./admin.module.css";

interface TopupCreditModalProps {
  reseller: AdminResellerItem | null;
  onClose: () => void;
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export function TopupCreditModal({ reseller, onClose, action }: TopupCreditModalProps) {
  const [amount, setAmount] = useState<number>(10);
  const [txType, setTxType] = useState<"owner_grant" | "manual_adjustment">("owner_grant");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {});

  // Close when action succeeded
  const [prevOk, setPrevOk] = useState(state.ok);
  if (state.ok && state.ok !== prevOk) {
    setPrevOk(state.ok);
    onClose();
  }

  if (!reseller) return null;

  const currentQuota = reseller.profile.creditQuota;
  const newQuota = currentQuota + (Number.isNaN(amount) ? 0 : amount);

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="topup-modal-title">
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <h3 id="topup-modal-title">Top-Up Kuota: {reseller.profile.agencyName}</h3>
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
          <input type="hidden" name="resellerProfileId" value={reseller.profile.id} />
          <input type="hidden" name="type" value={txType} />

          <div className={styles.modalBody}>
            {state.error ? (
              <div className={styles.formError} role="alert">
                {state.error}
              </div>
            ) : null}

            <div className={styles.creditSummaryBox}>
              <div>
                <div style={{ color: "var(--dash-muted)", fontSize: 12 }}>Saldo Saat Ini</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dash-text)" }}>
                  {currentQuota} kredit
                </div>
              </div>
              <div style={{ fontSize: 20, color: "var(--dash-muted)" }}>&rarr;</div>
              <div>
                <div style={{ color: "var(--dash-muted)", fontSize: 12 }}>Estimasi Saldo Baru</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: newQuota < 0 ? "var(--dash-danger)" : "var(--dash-success)",
                  }}
                >
                  {newQuota} kredit
                </div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Pilih Cepat Jumlah Top-Up</label>
              <div className={styles.chipsContainer}>
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.presetChip} ${amount === preset ? styles.presetChipActive : ""}`}
                    onClick={() => setAmount(preset)}
                    disabled={isPending}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="topup-amount">
                Jumlah Kredit (Bisa Positif atau Negatif)
              </label>
              <input
                id="topup-amount"
                name="amount"
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                className={styles.inputControl}
                disabled={isPending}
              />
              <span className={styles.fieldHint}>
                Gunakan angka positif untuk menambah kuota, atau negatif untuk koreksi pengurangan.
              </span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="topup-type">
                Jenis Mutasi
              </label>
              <select
                id="topup-type"
                value={txType}
                onChange={(e) => setTxType(e.target.value as "owner_grant" | "manual_adjustment")}
                className={styles.inputControl}
                disabled={isPending}
              >
                <option value="owner_grant">Pemberian / Top-Up Kuota Owner (owner_grant)</option>
                <option value="manual_adjustment">Koreksi Administratif (manual_adjustment)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="topup-ref">
                Nomor Referensi / Invoice (Opsional)
              </label>
              <input
                id="topup-ref"
                name="referenceId"
                type="text"
                placeholder="misal: INV-2026-00123 / Bukti BCA"
                className={styles.inputControl}
                disabled={isPending}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="topup-notes">
                Catatan Transaksi
              </label>
              <textarea
                id="topup-notes"
                name="notes"
                rows={2}
                placeholder="misal: Pembelian paket grosir 50 kuota via WhatsApp"
                className={styles.inputControl}
                disabled={isPending}
              />
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
              disabled={isPending || newQuota < 0 || amount === 0}
              id="btn-confirm-topup"
            >
              {isPending ? "Memproses…" : "Konfirmasi & Tambah Kuota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
