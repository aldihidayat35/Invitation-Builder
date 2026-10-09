"use client";

import { useState } from "react";
import type { ActionState, ResellerClientItem } from "../types";
import styles from "./reseller.module.css";

interface ResellerClientsTableProps {
  clients: ResellerClientItem[];
  createAction?: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function ResellerClientsTable({ clients }: ResellerClientsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (id: string, token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portalUrl = `${origin}/c/${token}`;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      prompt("Salin link portal klien:", portalUrl);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 mb-4 text-xs text-amber-900 leading-relaxed">
        <strong>💡 Portal Klien Mandiri:</strong> Klien / calon pengantin tidak memerlukan akun login dashboard. Bagikan link portal unik (kolom <em>Link Portal Klien</em>) kepada calon pengantin agar mereka dapat langsung me-review undangan, mengelola daftar nama tamu, dan memantau kehadiran RSVP secara aman.
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Klien & Mempelai</th>
                <th>Kontak</th>
                <th>Link Portal Klien</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <strong>Belum ada klien terdaftar</strong>
                      <span>Pesanan yang masuk dari toko seller Anda akan otomatis muncul di sini lengkap dengan link portal klien.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const portalUrl = c.clientAccessToken ? `/c/${c.clientAccessToken}` : null;
                  const cleanPhone = (c.whatsapp || "").replace(/\D/g, "");
                  const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const fullUrl = portalUrl ? `${origin}${portalUrl}` : "";
                  const waText = encodeURIComponent(
                    `Halo kak ${c.name},\n\nBerikut tautan portal mandiri untuk undangan pernikahan Anda:\n${fullUrl}\n\nSilakan buka link ini untuk review undangan dan mengelola daftar tamu. Terima kasih!`
                  );
                  const waHref = formattedPhone
                    ? `https://wa.me/${formattedPhone}?text=${waText}`
                    : `https://wa.me/?text=${waText}`;

                  return (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ fontSize: 14 }}>{c.name}</strong>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div>{c.email || "-"}</div>
                          {c.whatsapp && (
                            <div style={{ color: "var(--dash-muted)", marginTop: 2 }}>
                              📱 {c.whatsapp}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {c.clientAccessToken ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(c.id, c.clientAccessToken!)}
                              style={{
                                padding: "4px 10px",
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 8,
                                border: "1px solid #dcd3cb",
                                background: copiedId === c.id ? "#257849" : "#fff",
                                color: copiedId === c.id ? "#fff" : "#84633F",
                                cursor: "pointer",
                              }}
                            >
                              {copiedId === c.id ? "✓ Tersalin!" : "Salin Link"}
                            </button>
                            <a
                              href={portalUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                color: "#84633F",
                                textDecoration: "none",
                                fontWeight: 500,
                              }}
                            >
                              Buka ↗
                            </a>
                            {c.whatsapp && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  color: "#257849",
                                  textDecoration: "none",
                                  fontWeight: 600,
                                }}
                              >
                                WA 💬
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--dash-muted)" }}>
                            Akses akun lama
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                          {new Date(c.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
