"use client";

import type { AdminBankAccountItem } from "../types";
import styles from "./admin.module.css";

interface BankAccountsTableProps {
  accounts: AdminBankAccountItem[];
  onToggleStatus: (id: string, nextStatus: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function BankAccountsTable({
  accounts,
  onToggleStatus,
  onDelete,
}: BankAccountsTableProps) {
  const handleToggle = async (account: AdminBankAccountItem) => {
    try {
      await onToggleStatus(account.id, !account.isActive);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status rekening");
    }
  };

  const handleDelete = async (account: AdminBankAccountItem) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus rekening ${account.bankName} (${account.accountNumber})?`,
    );
    if (!confirmed) return;

    try {
      await onDelete(account.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus rekening");
    }
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Bank / Saluran</th>
              <th>Nomor Rekening</th>
              <th>Atas Nama</th>
              <th>Instruksi</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <strong>Belum ada rekening tujuan transfer</strong>
                    <span>Tambahkan rekening bank agar reseller dapat melakukan transfer manual.</span>
                  </div>
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--dash-radius-sm)",
                          background: "var(--dash-accent-soft)",
                          color: "var(--dash-accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {acc.bankName.slice(0, 3).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong style={{ fontSize: 14 }}>{acc.bankName}</strong>
                        {acc.qrCodeUrl ? (
                          <span style={{ fontSize: 11, color: "var(--dash-success)" }}>
                            ✓ Ada QRIS Statis
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td>
                    <code style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>
                      {acc.accountNumber}
                    </code>
                  </td>

                  <td>
                    <span style={{ fontWeight: 600 }}>{acc.accountHolder}</span>
                  </td>

                  <td>
                    <span style={{ fontSize: 13, color: "var(--dash-muted)" }}>
                      {acc.instructions || "-"}
                    </span>
                  </td>

                  <td>
                    {acc.isActive ? (
                      <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                        Aktif
                      </span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
                        Nonaktif
                      </span>
                    )}
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handleToggle(acc)}
                        title={acc.isActive ? "Nonaktifkan rekening" : "Aktifkan rekening"}
                      >
                        {acc.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        className={styles.btnAction}
                        style={{ color: "var(--dash-danger)" }}
                        onClick={() => handleDelete(acc)}
                        title="Hapus rekening"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
