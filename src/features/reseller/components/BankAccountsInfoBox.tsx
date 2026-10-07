import type { ResellerBankAccountItem } from "../types";
import styles from "./reseller.module.css";

export function BankAccountsInfoBox({
  bankAccounts,
}: {
  bankAccounts: ResellerBankAccountItem[];
}) {
  return (
    <div className={styles.bankBox}>
      <h3 className={styles.bankBoxTitle}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        Rekening Tujuan Transfer Manual Platform
      </h3>
      <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>
        Silakan lakukan transfer manual ke salah satu rekening bank atau QRIS resmi milik Platform
        Owner di bawah ini sesuai nominal paket yang Anda pilih:
      </p>

      {bankAccounts.length === 0 ? (
        <div style={{ padding: 12, fontSize: 13, color: "var(--dash-muted)" }}>
          Belum ada rekening pembayaran aktif yang dikonfigurasi. Silakan hubungi admin.
        </div>
      ) : (
        <div className={styles.bankGrid}>
          {bankAccounts.map((acc) => (
            <div key={acc.id} className={styles.bankCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={styles.bankName}>{acc.bankName}</span>
                {acc.qrCodeUrl ? (
                  <span style={{ fontSize: 11, color: "var(--dash-success)", fontWeight: 600 }}>
                    Tersedia QRIS
                  </span>
                ) : null}
              </div>
              <span className={styles.bankNumber}>{acc.accountNumber}</span>
              <span className={styles.bankHolder}>a.n. {acc.accountHolder}</span>
              {acc.instructions ? (
                <span style={{ fontSize: 12, color: "var(--dash-muted)", marginTop: 4 }}>
                  Catatan: {acc.instructions}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
