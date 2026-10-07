"use client";

import { useMemo, useState } from "react";
import type { AdminTransactionItem } from "../types";
import styles from "./admin.module.css";

interface TransactionsTableProps {
  transactions: AdminTransactionItem[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.reseller.agencyName.toLowerCase().includes(q) ||
        (item.transaction.referenceId ?? "").toLowerCase().includes(q) ||
        (item.transaction.notes ?? "").toLowerCase().includes(q) ||
        item.user.name.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || item.transaction.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [transactions, search, typeFilter]);

  const formatDateTime = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateVal));
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case "owner_grant":
        return <span className={`${styles.txTypeBadge} ${styles.txGrant}`}>Hibah Owner</span>;
      case "purchase_topup":
        return <span className={`${styles.txTypeBadge} ${styles.txTopup}`}>Top-Up Pembelian</span>;
      case "publish_deduct":
        return <span className={`${styles.txTypeBadge} ${styles.txDeduct}`}>Pakai Undangan</span>;
      case "unpublish_refund":
        return <span className={`${styles.txTypeBadge} ${styles.txRefund}`}>Refund Pembatalan</span>;
      case "manual_adjustment":
        return <span className={`${styles.txTypeBadge} ${styles.txManual}`}>Koreksi Manual</span>;
      default:
        return <span className={`${styles.txTypeBadge} ${styles.txManual}`}>{type}</span>;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          Riwayat Audit Mutasi Kuota
          <span className={styles.countBadge}>{filtered.length} transaksi</span>
        </h2>

        <div className={styles.toolbar}>
          <input
            type="search"
            placeholder="Cari agensi, invoice, atau catatan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Cari transaksi"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={styles.inputControl}
            style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            aria-label="Filter tipe transaksi"
          >
            <option value="all">Semua Jenis Transaksi</option>
            <option value="owner_grant">Hibah Owner (owner_grant)</option>
            <option value="purchase_topup">Top-Up Pembelian (purchase_topup)</option>
            <option value="publish_deduct">Pakai Undangan (publish_deduct)</option>
            <option value="unpublish_refund">Refund (unpublish_refund)</option>
            <option value="manual_adjustment">Koreksi Manual (manual_adjustment)</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Waktu Mutasi</th>
              <th>Mitra Reseller</th>
              <th>Jenis Mutasi</th>
              <th>Perubahan Kuota</th>
              <th>Saldo (Sebelum &rarr; Sesudah)</th>
              <th>Referensi & Catatan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div>
                      <strong>Tidak ada mutasi transaksi ditemukan</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
                        {search ? "Coba ganti kata kunci pencarian Anda." : "Belum ada riwayat transaksi tercatat."}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isPositive = item.transaction.amount > 0;
                return (
                  <tr key={item.transaction.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--dash-muted)", fontSize: 12 }}>
                      {formatDateTime(item.transaction.createdAt)}
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <strong style={{ fontSize: 13 }}>{item.reseller.agencyName}</strong>
                        <span style={{ fontSize: 11, color: "var(--dash-subtle)" }}>
                          {item.user.name} ({item.user.email})
                        </span>
                      </div>
                    </td>

                    <td>{getBadgeForType(item.transaction.type)}</td>

                    <td>
                      <span className={isPositive ? styles.amountPositive : styles.amountNegative}>
                        {isPositive ? `+${item.transaction.amount}` : item.transaction.amount} kredit
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                        {item.transaction.balanceBefore} &rarr;{" "}
                        <strong style={{ color: "var(--dash-text)" }}>{item.transaction.balanceAfter}</strong>
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
                        {item.transaction.referenceId ? (
                          <span style={{ fontFamily: "monospace", color: "var(--dash-accent)", fontWeight: 600 }}>
                            Ref: {item.transaction.referenceId}
                          </span>
                        ) : null}
                        {item.transaction.notes ? (
                          <span style={{ color: "var(--dash-muted)" }}>{item.transaction.notes}</span>
                        ) : (
                          <span style={{ color: "var(--dash-subtle)", fontStyle: "italic" }}>Tidak ada catatan</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
