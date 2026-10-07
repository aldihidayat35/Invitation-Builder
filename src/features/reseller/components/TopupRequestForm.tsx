"use client";

import { useActionState, useState } from "react";
import {
  TOPUP_PACKAGES,
  type ActionState,
  type ResellerBankAccountItem,
  type TopupPackage,
} from "../types";
import { BankAccountsInfoBox } from "./BankAccountsInfoBox";
import { TopupPackageSelector } from "./TopupPackageSelector";
import styles from "./reseller.module.css";

interface TopupRequestFormProps {
  bankAccounts: ResellerBankAccountItem[];
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function TopupRequestForm({ bankAccounts, action }: TopupRequestFormProps) {
  const [selectedPackage, setSelectedPackage] = useState<TopupPackage>(TOPUP_PACKAGES[1]!); // default growth
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <TopupPackageSelector
        selectedPackage={selectedPackage}
        onSelect={(pkg) => setSelectedPackage(pkg)}
      />

      <BankAccountsInfoBox bankAccounts={bankAccounts} />

      <div className={styles.formCard}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--dash-text)" }}>
          2. Konfirmasi Transfer & Unggah Bukti
        </h3>
        <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>
          Setelah mentransfer nominal <strong>Rp {selectedPackage.price.toLocaleString("id-ID")}</strong> ke rekening Owner di atas, silakan isi formulir konfirmasi berikut:
        </p>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="creditAmount" value={selectedPackage.creditAmount} />
          <input type="hidden" name="amountPaid" value={selectedPackage.price} />

          {state.error ? <div className={styles.formError}>{state.error}</div> : null}
          {state.ok && state.message ? (
            <div className={styles.formSuccess}>{state.message}</div>
          ) : null}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Rekening Tujuan yang Ditransfer <span style={{ color: "var(--dash-danger)" }}>*</span>
              </label>
              <select name="bankAccountId" required className={styles.inputControl}>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountNumber} (a.n. {acc.accountHolder})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Bank / Saluran Pengirim Anda <span style={{ color: "var(--dash-danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="senderBank"
                required
                placeholder="Contoh: BCA, Mandiri, GoPay, OVO"
                className={styles.inputControl}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nama Pemilik Rekening Pengirim <span style={{ color: "var(--dash-danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="senderAccountName"
                required
                placeholder="Nama yang tertera pada mutasi transfer Anda"
                className={styles.inputControl}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                URL Gambar Bukti Transfer (Struk/Slip) <span style={{ color: "var(--dash-danger)" }}>*</span>
              </label>
              <input
                type="url"
                name="proofFileUrl"
                required
                placeholder="https://... (URL gambar screenshot / foto struk)"
                className={styles.inputControl}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Catatan Tambahan (Opsional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Contoh: Transfer dilakukan pukul 14:30 WIB dari rekening pribadi."
              className={styles.inputControl}
              style={{ resize: "vertical" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 13, color: "var(--dash-muted)", display: "block" }}>
                Total Transfer:
              </span>
              <strong style={{ fontSize: 20, color: "var(--dash-accent)" }}>
                Rp {selectedPackage.price.toLocaleString("id-ID")}
              </strong>{" "}
              <span style={{ fontSize: 13, color: "var(--dash-success)" }}>
                (+{selectedPackage.creditAmount} Kredit)
              </span>
            </div>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isPending}
              style={{ padding: "12px 24px", fontSize: 15 }}
            >
              {isPending ? "Mengirimkan Permohonan..." : "Kirim Bukti & Ajukan Top-Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
