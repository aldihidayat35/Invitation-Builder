"use client";

import { useMemo, useState, useTransition } from "react";
import { buildResellerActivationWhatsAppUrl } from "@/features/reseller/whatsapp";
import type { AdminResellerItem } from "../types";
import styles from "./admin.module.css";

interface ResellersTableProps {
  resellers: AdminResellerItem[];
  onToggleStatus: (profileId: string, nextStatus: boolean) => Promise<void>;
}

export function ResellersTable({
  resellers,
  onToggleStatus,
}: ResellersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [isPending, startTransition] = useTransition();
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [accModalData, setAccModalData] = useState<{
    agencyName: string;
    resellerName: string;
    waUrl: string;
  } | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const filtered = useMemo(() => {
    return resellers.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.profile.agencyName.toLowerCase().includes(q) ||
        item.profile.slug.toLowerCase().includes(q) ||
        item.user.name.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q) ||
        (item.profile.customDomain && item.profile.customDomain.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.profile.isActive) ||
        (statusFilter === "pending" && !item.profile.isActive) ||
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

  const handleAcc = (item: AdminResellerItem) => {
    setActionTargetId(item.profile.id);
    const waUrl = buildResellerActivationWhatsAppUrl({
      phone: item.profile.whatsappContact,
      resellerName: item.user.name,
      agencyName: item.profile.agencyName,
      loginUrl: `${origin}/login`,
    });

    startTransition(async () => {
      try {
        await onToggleStatus(item.profile.id, true);
        setAccModalData({
          agencyName: item.profile.agencyName,
          resellerName: item.user.name,
          waUrl,
        });
        try {
          window.open(waUrl, "_blank");
        } catch {
          // If browser popup is blocked, the modal below provides the direct button.
        }
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
          Daftar Mitra Seller & Storefront
          <span className={styles.countBadge}>{filtered.length} mitra</span>
        </h2>

        <div className={styles.toolbar}>
          <input
            type="search"
            placeholder="Cari seller, domain, atau email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Cari reseller"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "pending" | "inactive")
            }
            className={styles.inputControl}
            style={{ width: "auto", padding: "7px 12px", fontSize: 13 }}
            aria-label="Filter status"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu ACC (Pending)</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Nonaktif / Ditangguhkan</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mitra Seller / Brand</th>
              <th>Admin & Kontak</th>
              <th>Website Khusus Seller</th>
              <th>Status Akun</th>
              <th>Terdaftar</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
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
                      <strong>Tidak ada data seller ditemukan</strong>
                      <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
                        {search ? "Coba ganti kata kunci pencarian Anda." : "Belum ada mitra seller terdaftar."}
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

                const isTargetPending = isPending && actionTargetId === item.profile.id;

                const waActivationUrl = buildResellerActivationWhatsAppUrl({
                  phone: item.profile.whatsappContact,
                  resellerName: item.user.name,
                  agencyName: item.profile.agencyName,
                  loginUrl: `${origin}/login`,
                });

                return (
                  <tr key={item.profile.id}>
                    <td>
                      <div className={styles.agencyInfo}>
                        <div className={styles.agencyAvatar} aria-hidden="true">
                          {initials || "SL"}
                        </div>
                        <div className={styles.agencyDetails}>
                          <span className={styles.agencyName}>{item.profile.agencyName}</span>
                          <span className={styles.agencySlug}>ID: {item.profile.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className={styles.contactInfo}>
                        <span className={styles.ownerName}>{item.user.name}</span>
                        <span className={styles.ownerEmail}>{item.user.email}</span>
                        <a
                          href={waActivationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.whatsappLink}
                          title="Hubungi / Kirim WA Konfirmasi"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                          </svg>
                          +{item.profile.whatsappContact}
                        </a>
                      </div>
                    </td>

                    <td>
                      <div>
                        <a
                          href={`/seller/${item.profile.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontWeight: 500,
                            color: "var(--dash-primary)",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <span>/seller/{item.profile.slug}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                        {item.profile.customDomain ? (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--dash-text-muted)",
                              marginTop: "0.2rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>{item.profile.customDomain}</span>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      {item.profile.isActive ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          Aktif
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid rgba(180, 83, 9, 0.25)",
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          Menunggu ACC
                        </span>
                      )}
                    </td>

                    <td style={{ color: "var(--dash-muted)", fontSize: 12 }}>
                      {formatDate(item.profile.createdAt)}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className={styles.actionsCell} style={{ justifyContent: "flex-end" }}>
                        {!item.profile.isActive ? (
                          <>
                            <button
                              type="button"
                              className={`${styles.btnPrimary} ${styles.btnSm}`}
                              onClick={() => handleAcc(item)}
                              disabled={isTargetPending}
                              id={`btn-acc-${item.profile.slug}`}
                              style={{
                                background: "#16a34a",
                                borderColor: "#15803d",
                                color: "#ffffff",
                              }}
                              title="Setujui pendaftaran dan aktifkan akun reseller"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{isTargetPending ? "Memproses…" : "ACC Reseller"}</span>
                            </button>

                            <a
                              href={waActivationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${styles.btnSecondary} ${styles.btnSm}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                color: "#15803d",
                                borderColor: "rgba(22, 163, 74, 0.35)",
                                background: "rgba(22, 163, 74, 0.05)",
                                textDecoration: "none",
                              }}
                              title="Kirim Pesan Konfirmasi ke WhatsApp Reseller"
                              id={`btn-wa-${item.profile.slug}`}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                              </svg>
                              <span>Kirim WA</span>
                            </a>
                          </>
                        ) : (
                          <>
                            <a
                              href={`/seller/${item.profile.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${styles.btnSecondary} ${styles.btnSm}`}
                              style={{ textDecoration: "none" }}
                            >
                              Lihat Toko
                            </a>

                            <a
                              href={waActivationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${styles.btnSecondary} ${styles.btnSm}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                textDecoration: "none",
                              }}
                              title="Kirim Pesan WhatsApp"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                              </svg>
                              <span>WA</span>
                            </a>

                            <button
                              type="button"
                              className={`${styles.btnSecondary} ${styles.btnSm}`}
                              onClick={() => handleToggle(item.profile.id, item.profile.isActive)}
                              disabled={isTargetPending}
                              id={`btn-status-${item.profile.slug}`}
                              style={{
                                color: "var(--dash-danger)",
                                borderColor: "rgba(180, 35, 24, 0.3)",
                              }}
                            >
                              {isTargetPending ? "…" : "Nonaktifkan"}
                            </button>
                          </>
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

      {accModalData ? (
        <div className={styles.modalBackdrop} onClick={() => setAccModalData(null)}>
          <div
            className={styles.modalDialog}
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--dash-success-soft, #dcfce7)",
                    color: "var(--dash-success, #16a34a)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: "16px" }}>Akun Reseller Berhasil di-ACC!</h3>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setAccModalData(null)}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "20px 24px", fontSize: "14px", lineHeight: 1.6, color: "var(--dash-text)" }}>
              <p style={{ margin: "0 0 14px" }}>
                Akun mitra <strong>{accModalData.agencyName}</strong> (<em>{accModalData.resellerName}</em>) telah <strong>aktif</strong>. Reseller kini sudah dapat login ke dashboard.
              </p>
              <p style={{ margin: "0 0 20px", color: "var(--dash-muted)", fontSize: "13px" }}>
                Langkah selanjutnya: Kirimkan pesan konfirmasi aktivasi ke WhatsApp reseller agar mereka segera mengetahui akunnya sudah aktif.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setAccModalData(null)}
                >
                  Tutup
                </button>
                <a
                  href={accModalData.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnPrimary}
                  style={{
                    background: "#16a34a",
                    borderColor: "#15803d",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
                  </svg>
                  <span>Buka WhatsApp Konfirmasi</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

