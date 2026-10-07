"use client";

import { useState } from "react";
import type { ResellerTopupRequestItem } from "../types";
import styles from "./reseller.module.css";

interface ResellerTransactionsTableProps {
  requests: ResellerTopupRequestItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[];
}

export function ResellerTransactionsTable({
  requests,
  transactions,
}: ResellerTransactionsTableProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "ledger">("requests");

  return (
    <div className={styles.tableCard}>
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--dash-border)",
          padding: "12px 16px",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={styles.btnSecondary}
          style={{
            background: activeTab === "requests" ? "var(--dash-accent-soft)" : "transparent",
            color: activeTab === "requests" ? "var(--dash-accent)" : "var(--dash-muted)",
            borderColor: activeTab === "requests" ? "var(--dash-accent)" : "transparent",
          }}
        >
          Status Pengajuan Top-Up ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={styles.btnSecondary}
          style={{
            background: activeTab === "ledger" ? "var(--dash-accent-soft)" : "transparent",
            color: activeTab === "ledger" ? "var(--dash-accent)" : "var(--dash-muted)",
            borderColor: activeTab === "ledger" ? "var(--dash-accent)" : "transparent",
          }}
        >
          Buku Mutasi Kuota ({transactions.length})
        </button>
      </div>

      <div className={styles.tableResponsive}>
        {activeTab === "requests" ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nominal Transfer</th>
                <th>Kuota Diminta</th>
                <th>Pengirim</th>
                <th>Bukti Transfer</th>
                <th>Status Verifikasi</th>
                <th>Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <strong>Belum ada riwayat pengajuan top-up</strong>
                      <span>Silakan ajukan permohonan melalui menu Top-up Kuota.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>
                          {new Date(r.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
                          {new Date(r.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong>Rp {r.amountPaid.toLocaleString("id-ID")}</strong>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: "var(--dash-accent)" }}>
                        +{r.creditAmount} Kredit
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{r.senderBank}</span>
                        <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
                          a.n. {r.senderAccountName}
                        </span>
                      </div>
                    </td>

                    <td>
                      <a
                        href={r.proofFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          color: "var(--dash-accent)",
                          textDecoration: "underline",
                        }}
                      >
                        Lihat Struk ↗
                      </a>
                    </td>

                    <td>
                      {r.status === "pending" ? (
                        <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                          ● Menunggu Verifikasi
                        </span>
                      ) : r.status === "approved" ? (
                        <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                          ✓ Disetujui
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
                          ✕ Ditolak
                        </span>
                      )}
                    </td>

                    <td>
                      {r.status === "rejected" && r.rejectionReason ? (
                        <span style={{ fontSize: 12, color: "var(--dash-danger)", fontWeight: 550 }}>
                          Alasan: {r.rejectionReason}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                          {r.notes || "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tipe Mutasi</th>
                <th>Perubahan Kuota</th>
                <th>Saldo Sebelum</th>
                <th>Saldo Sesudah</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <strong>Belum ada transaksi kuota</strong>
                      <span>Riwayat mutasi kredit Anda akan muncul di sini.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id}>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                          {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "var(--dash-surface-sunken)",
                            color: "var(--dash-text)",
                            textTransform: "capitalize",
                          }}
                        >
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td>
                        <strong
                          style={{
                            color: isPositive ? "var(--dash-success)" : "var(--dash-danger)",
                          }}
                        >
                          {isPositive ? `+${tx.amount}` : tx.amount} Kredit
                        </strong>
                      </td>

                      <td>{tx.balanceBefore}</td>
                      <td>
                        <strong>{tx.balanceAfter}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                          {tx.notes || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
