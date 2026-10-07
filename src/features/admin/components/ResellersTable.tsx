"use client";

import { useMemo, useState, useTransition } from "react";
import type { AdminResellerItem } from "../types";
import styles from "./admin.module.css";

interface ResellersTableProps {
  resellers: AdminResellerItem[];
  onSelectForTopup: (item: AdminResellerItem) => void;
  onToggleStatus: (profileId: string, nextStatus: boolean) => Promise<void>;
}

export function ResellersTable({
  resellers,
  onSelectForTopup,
  onToggleStatus,
}: ResellersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isPending, startTransition] = useTransition();
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return resellers.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.profile.agencyName.toLowerCase().includes(q) ||
        item.profile.slug.toLowerCase().includes(q) ||
        item.user.name.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.profile.isActive) ||
        (statusFilter === "inactive" && !item.profile.isActive);

      return matchSearch && matchStatus;
    });
  }, [resellers, search, statusFilter]);

  const handleToggle = (profileId: string, currentStatus: boolean) => {
    setActionTargetId(profileId);
    startTransition(async () => {
      try {
        await onToggleStatus(profileId, !currentStatus);
      } finally {
        setActionTargetId(null);
      }
    });
  };

  const formatDate = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateVal));
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          Daftar Mitra Agensi Reseller
          <span className={styles.countBadge}>{filtered.length} mitra</span>
        </h2>

        <div className={styles.toolbar}>
          <input
            type="search"
            placeholder="Cari agensi, admin, atau email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Cari reseller"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className={styles.inputControl}
            style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            aria-label="Filter status"
          >
            <option value="all">Semua Status</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Nonaktif / Ditangguhkan</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Agensi / Brand</th>
              <th>Admin & Kontak</th>
              <th>Sisa Kuota</th>
              <th>Status Akun</th>
              <th>Terdaftar</th>
              <th style={{ textAlign: "right" }}>Aksi Manajemen</th>
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
                      <strong>Tidak ada data reseller ditemukan</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
                        {search ? "Coba ganti kata kunci pencarian Anda." : "Belum ada mitra reseller terdaftar."}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const initials = item.profile.agencyName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("");

                const waDigits = item.profile.whatsappContact.replace(/\D/g, "");
                const waUrl = `https://wa.me/${waDigits}`;
                const isTargetPending = isPending && actionTargetId === item.profile.id;

                return (
                  <tr key={item.profile.id}>
                    <td>
                      <div className={styles.agencyInfo}>
                        <div className={styles.agencyAvatar} aria-hidden="true">
                          {initials || "AG"}
                        </div>
                        <div className={styles.agencyDetails}>
                          <span className={styles.agencyName}>{item.profile.agencyName}</span>
                          <span className={styles.agencySlug}>/{item.profile.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className={styles.contactInfo}>
                        <span className={styles.ownerName}>{item.user.name}</span>
                        <span className={styles.ownerEmail}>{item.user.email}</span>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.whatsappLink}
                          title="Hubungi via WhatsApp"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                          </svg>
                          +{item.profile.whatsappContact}
                        </a>
                      </div>
                    </td>

                    <td>
                      <div
                        className={`${styles.quotaPill} ${
                          item.profile.creditQuota === 0 ? styles.quotaPillZero : ""
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <circle cx="8" cy="8" r="6" />
                          <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h2v4H7M14 12h2v4h-2" />
                        </svg>
                        <span>{item.profile.creditQuota} kredit</span>
                      </div>
                    </td>

                    <td>
                      {item.profile.isActive ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          Aktif
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeInactive}`}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          Ditangguhkan
                        </span>
                      )}
                    </td>

                    <td style={{ color: "var(--dash-muted)", fontSize: 12 }}>
                      {formatDate(item.profile.createdAt)}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className={styles.actionsCell} style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={`${styles.btnPrimary} ${styles.btnSm}`}
                          onClick={() => onSelectForTopup(item)}
                          id={`btn-topup-${item.profile.slug}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Top-Up
                        </button>

                        <button
                          type="button"
                          className={`${styles.btnSecondary} ${styles.btnSm}`}
                          onClick={() => handleToggle(item.profile.id, item.profile.isActive)}
                          disabled={isTargetPending}
                          id={`btn-status-${item.profile.slug}`}
                          style={{
                            color: item.profile.isActive ? "var(--dash-danger)" : "var(--dash-success)",
                            borderColor: item.profile.isActive ? "rgba(180, 35, 24, 0.3)" : "rgba(22, 163, 74, 0.3)",
                          }}
                        >
                          {isTargetPending
                            ? "…"
                            : item.profile.isActive
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                        </button>
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
