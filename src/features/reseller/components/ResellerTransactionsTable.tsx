"use client";

import { useState } from "react";
import { downloadCsvFile, generateCsv } from "@/lib/csv/exporter";
import type { ResellerTopupRequestItem } from "../types";
import { buildWhatsAppConfirmationUrl } from "../whatsapp";
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

  const handleExportCsv = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (activeTab === "requests") {
      const headers = [
        "Tanggal Pengajuan",
        "ID Permohonan",
        "Nominal Transfer (Rp)",
        "Kuota Diminta",
        "Bank Pengirim",
        "Atas Nama Pengirim",
        "Rekening Tujuan",
        "Status Verifikasi",
        "Catatan / Alasan Penolakan",
      ];
      const rows = requests.map((r) => [
        new Date(r.createdAt).toISOString(),
        r.id,
        r.amountPaid,
        r.creditAmount,
        r.senderBank,
        r.senderAccountName,
        r.bankAccount ? `${r.bankAccount.bankName} - ${r.bankAccount.accountNumber}` : "-",
        r.status,
        r.rejectionReason || r.notes || "-",
      ]);
      const csv = generateCsv(headers, rows);
      downloadCsvFile(`riwayat-pengajuan-topup-${dateStr}.csv`, csv);
    } else {
      const headers = [
        "Tanggal & Waktu",
        "ID Transaksi",
        "Tipe Mutasi",
        "Perubahan Kuota",
        "Saldo Sebelum",
        "Saldo Sesudah",
        "Referensi / ID Undangan",
        "Keterangan",
      ];
      const rows = transactions.map((t) => [
        new Date(t.createdAt).toISOString(),
        t.id,
        t.type,
        t.amount > 0 ? `+${t.amount}` : t.amount,
        t.balanceBefore,
        t.balanceAfter,
        t.referenceId || "-",
        t.notes || "-",
      ]);
      const csv = generateCsv(headers, rows);
      downloadCsvFile(`buku-mutasi-kuota-${dateStr}.csv`, csv);
    }
  };

  return (
    <div className={styles.tableCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--dash-border)",
          padding: "12px 16px",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
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

        <button
          type="button"
          onClick={handleExportCsv}
          className={styles.btnSecondary}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 12px" }}
          title="Unduh seluruh data tab aktif ke file CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Ekspor CSV ({activeTab === "requests" ? requests.length : transactions.length})
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
                <th>Aksi</th>
                <th>Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8}>
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
                      {r.status === "pending" ? (
                        <a
                          href={buildWhatsAppConfirmationUrl({
                            agencyName: "Agensi Reseller",
                            requestId: r.id,
                            creditAmount: r.creditAmount,
                            amountPaid: r.amountPaid,
                            senderBank: r.senderBank,
                            senderAccountName: r.senderAccountName,
                            destinationBank: r.bankAccount
                              ? `${r.bankAccount.bankName} (${r.bankAccount.accountNumber})`
                              : undefined,
                            proofUrl: r.proofFileUrl,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.btnSecondary}
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            background: "#25d36615",
                            borderColor: "#25d36650",
                            color: "#128c7e",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            textDecoration: "none",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                          title="Konfirmasi via WhatsApp ke Admin"
                        >
                          💬 Konfirmasi WA
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>-</span>
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
