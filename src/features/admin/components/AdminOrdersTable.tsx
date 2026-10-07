"use client";

import { useMemo, useState, useTransition } from "react";
import type { AdminOrderItem } from "../types";
import type { CustomerOrderStatus } from "@/lib/schema/domain";
import styles from "./admin.module.css";

interface AdminOrdersTableProps {
  orders: AdminOrderItem[];
  onUpdateStatus: (orderId: string, nextStatus: CustomerOrderStatus) => Promise<void>;
}

function getStatusBadge(status: CustomerOrderStatus) {
  switch (status) {
    case "new":
      return { label: "Pesanan Baru", className: styles.badgePending ?? styles.badge };
    case "in_review":
      return { label: "Sedang Ditinjau", className: styles.badgePending ?? styles.badge };
    case "in_progress":
      return { label: "Sedang Dikerjakan", className: styles.badgeInactive ?? styles.badge };
    case "completed":
      return { label: "Selesai & Terbit", className: styles.badgeActive ?? styles.badge };
    case "cancelled":
      return { label: "Dibatalkan", className: styles.badgeInactive ?? styles.badge };
    default:
      return { label: status, className: styles.badge };
  }
}

export function AdminOrdersTable({ orders, onUpdateStatus }: AdminOrdersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerEmail.toLowerCase().includes(q) ||
        item.customerWhatsapp.toLowerCase().includes(q) ||
        item.sellerName.toLowerCase().includes(q) ||
        (item.groomBrideNames && item.groomBrideNames.toLowerCase().includes(q)) ||
        (item.templateTitle && item.templateTitle.toLowerCase().includes(q));

      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const handleStatusChange = (orderId: string, nextStatus: CustomerOrderStatus) => {
    setActionTargetId(orderId);
    startTransition(async () => {
      try {
        await onUpdateStatus(orderId, nextStatus);
      } finally {
        setActionTargetId(null);
      }
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>
            Pusat Pemrosesan Pesanan Customer
            <span className={styles.countBadge}>{filtered.length} pesanan</span>
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--dash-text-muted)" }}>
            Admin memiliki akses penuh mutlak untuk mengolah data dan membuat website undangan customer.
          </p>
        </div>

        <div className={styles.toolbar}>
          <input
            type="search"
            placeholder="Cari customer, seller, atau mempelai…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Cari pesanan"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.inputControl}
            style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            aria-label="Filter status pesanan"
          >
            <option value="all">Semua Status</option>
            <option value="new">Pesanan Baru</option>
            <option value="in_review">Sedang Ditinjau</option>
            <option value="in_progress">Sedang Dikerjakan</option>
            <option value="completed">Selesai & Terbit</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mitra Seller</th>
              <th>Customer & Mempelai</th>
              <th>Kontak WhatsApp</th>
              <th>Pilihan Desain</th>
              <th>Status Pengerjaan</th>
              <th>Tanggal Order</th>
              <th style={{ textAlign: "right" }}>Aksi Pengolahan Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div>
                      <strong>Tidak ada data pesanan</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
                        {search ? "Coba ganti kata kunci pencarian Anda." : "Belum ada pesanan masuk dari toko seller."}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const badge = getStatusBadge(item.status);
                const waDigits = item.customerWhatsapp.replace(/\D/g, "");
                const waUrl = `https://wa.me/${waDigits.startsWith("0") ? "62" + waDigits.slice(1) : waDigits}`;
                const isTargetPending = isPending && actionTargetId === item.id;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: "var(--dash-text)" }}>{item.sellerName}</strong>
                    </td>

                    <td>
                      <div>
                        <strong>{item.customerName}</strong>
                        {item.groomBrideNames ? (
                          <div style={{ fontSize: "0.82rem", color: "var(--dash-primary)", fontWeight: 500 }}>
                            💍 {item.groomBrideNames}
                          </div>
                        ) : null}
                        <div style={{ fontSize: "0.78rem", color: "var(--dash-text-muted)" }}>
                          {item.customerEmail}
                        </div>
                      </div>
                    </td>

                    <td>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.whatsappLink}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                        </svg>
                        {item.customerWhatsapp}
                      </a>
                    </td>

                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--dash-text)" }}>
                        {item.templateTitle || "Belum memilih tema"}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
                        <select
                          value={item.status}
                          disabled={isTargetPending}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as CustomerOrderStatus)}
                          style={{
                            fontSize: "0.78rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid var(--dash-border)",
                            background: "var(--dash-bg)",
                            color: "var(--dash-text)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="new">Ubah: Baru</option>
                          <option value="in_review">Ubah: Sedang Ditinjau</option>
                          <option value="in_progress">Ubah: Sedang Dikerjakan</option>
                          <option value="completed">Ubah: Selesai</option>
                          <option value="cancelled">Ubah: Dibatalkan</option>
                        </select>
                      </div>
                    </td>

                    <td style={{ color: "var(--dash-muted)", fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className={styles.actionsCell} style={{ justifyContent: "flex-end", gap: "0.35rem" }}>
                        {item.invitationSlug ? (
                          <a
                            href={`/i/${item.invitationSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.btnPrimary} ${styles.btnSm}`}
                            style={{ textDecoration: "none" }}
                          >
                            Lihat Web Undangan ↗
                          </a>
                        ) : (
                          <a
                            href="/dashboard/invitations"
                            className={`${styles.btnSecondary} ${styles.btnSm}`}
                            style={{ textDecoration: "none" }}
                            title="Buat dan edit undangan untuk pesanan ini"
                          >
                            Olah Data Undangan
                          </a>
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
