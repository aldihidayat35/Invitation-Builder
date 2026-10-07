"use client";

import { useState } from "react";
import { downloadCsvFile, generateCsv } from "@/lib/csv/exporter";
import type { AdminTopupFinancialRecap, AdminTopupRequestItem } from "../types";
import styles from "./admin.module.css";

interface TopupRequestsTableProps {
  items: AdminTopupRequestItem[];
  recap?: AdminTopupFinancialRecap;
  onViewProof: (item: AdminTopupRequestItem) => void;
  onApprove: (item: AdminTopupRequestItem) => void;
  onReject: (item: AdminTopupRequestItem) => void;
}

export function TopupRequestsTable({
  items,
  recap,
  onViewProof,
  onApprove,
  onReject,
}: TopupRequestsTableProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.request.status === filter;
  });

  const handleExportCsv = () => {
    const headers = [
      "Tanggal Permohonan",
      "ID Permohonan",
      "Nama Agensi",
      "Email Reseller",
      "Nominal Transfer (Rp)",
      "Kredit Kuota",
      "Bank Pengirim",
      "Nama Pengirim",
      "Rekening Tujuan",
      "Status",
      "Catatan / Alasan Ditolak",
      "Tanggal Review",
    ];

    const rows = filteredItems.map((item) => [
      new Date(item.request.createdAt).toISOString(),
      item.request.id,
      item.reseller.agencyName,
      item.user.email,
      item.request.amountPaid,
      item.request.creditAmount,
      item.request.senderBank,
      item.request.senderAccountName,
      item.bankAccount ? `${item.bankAccount.bankName} - ${item.bankAccount.accountNumber}` : "-",
      item.request.status,
      item.request.rejectionReason || item.request.notes || "-",
      item.request.reviewedAt ? new Date(item.request.reviewedAt).toISOString() : "-",
    ]);

    const csv = generateCsv(headers, rows);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`rekapitulasi-topup-manual-${dateStr}.csv`, csv);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {recap ? (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Dana Masuk (Disetujui)</span>
            <strong className={styles.statValue} style={{ color: "var(--dash-success, #10b981)" }}>
              Rp {recap.totalApprovedRevenue.toLocaleString("id-ID")}
            </strong>
            <span className={styles.statSub}>
              +{recap.totalApprovedCredits} kredit diterbitkan ({recap.totalApprovedCount} approved)
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Menunggu Verifikasi</span>
            <strong className={styles.statValue} style={{ color: "var(--dash-warning, #f59e0b)" }}>
              Rp {recap.totalPendingRevenue.toLocaleString("id-ID")}
            </strong>
            <span className={styles.statSub}>
              {recap.totalPendingCount} permohonan antre verifikasi
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Permohonan</span>
            <strong className={styles.statValue}>{recap.totalRequestsCount}</strong>
            <span className={styles.statSub}>
              {recap.totalApprovedCount} disetujui · {recap.totalRejectedCount} ditolak
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar} style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className={styles.tabList} style={{ borderBottom: "none", margin: 0, padding: 0 }}>
            <button
              type="button"
              className={`${styles.tabButton} ${filter === "all" ? styles.tabButtonActive : ""}`}
              onClick={() => setFilter("all")}
            >
              Semua ({items.length})
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${filter === "pending" ? styles.tabButtonActive : ""}`}
              onClick={() => setFilter("pending")}
            >
              Menunggu Verifikasi ({items.filter((i) => i.request.status === "pending").length})
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${filter === "approved" ? styles.tabButtonActive : ""}`}
              onClick={() => setFilter("approved")}
            >
              Disetujui ({items.filter((i) => i.request.status === "approved").length})
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${filter === "rejected" ? styles.tabButtonActive : ""}`}
              onClick={() => setFilter("rejected")}
            >
              Ditolak ({items.filter((i) => i.request.status === "rejected").length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className={styles.btnSecondary}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 12px" }}
            title="Unduh seluruh baris yang difilter ke file CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor CSV ({filteredItems.length})
          </button>
        </div>

      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Mitra Reseller</th>
              <th>Nominal & Kuota</th>
              <th>Rekening Pengirim</th>
              <th>Bukti Transfer</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <strong>Tidak ada data permohonan transfer</strong>
                    <span>Belum ada permohonan top-up dengan status yang dipilih.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isPending = item.request.status === "pending";
                const isApproved = item.request.status === "approved";

                return (
                  <tr key={item.request.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>
                          {new Date(item.request.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
                          {new Date(item.request.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.resellerCell}>
                        <div className={styles.avatarMini}>
                          {item.reseller.agencyName[0]?.toUpperCase() ?? "R"}
                        </div>
                        <div className={styles.agencyMeta}>
                          <strong>{item.reseller.agencyName}</strong>
                          <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                            {item.user.email} · {item.reseller.whatsappContact}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <strong style={{ fontSize: 14 }}>
                          Rp {item.request.amountPaid.toLocaleString("id-ID")}
                        </strong>
                        <span style={{ fontSize: 12, color: "var(--dash-accent)", fontWeight: 600 }}>
                          +{item.request.creditAmount} Kredit
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{item.request.senderBank}</span>
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                          a.n. {item.request.senderAccountName}
                        </span>
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.proofThumbnailButton}
                        onClick={() => onViewProof(item)}
                        title="Klik untuk memperbesar bukti transfer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.request.proofFileUrl}
                          alt="Thumbnail bukti"
                          className={styles.proofThumbnailImg}
                        />
                        <span style={{ fontSize: 11, fontWeight: 600, paddingRight: 4 }}>
                          Lihat Struk
                        </span>
                      </button>
                    </td>

                    <td>
                      {isPending ? (
                        <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                          ● Menunggu Review
                        </span>
                      ) : isApproved ? (
                        <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                          ✓ Disetujui
                        </span>
                      ) : (
                        <span
                          className={`${styles.statusBadge} ${styles.statusRejected}`}
                          title={item.request.rejectionReason ?? undefined}
                        >
                          ✕ Ditolak
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      {isPending ? (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className={styles.btnApprove}
                            onClick={() => onApprove(item)}
                          >
                            Setujui
                          </button>
                          <button
                            type="button"
                            className={styles.btnReject}
                            onClick={() => onReject(item)}
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                          {isApproved
                            ? `Oleh ${item.request.reviewedBy ? "Admin" : "-"}`
                            : item.request.rejectionReason || "Ditolak"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}

