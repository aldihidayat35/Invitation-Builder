"use client";

import React, { useState, useTransition } from "react";
import type { ClientPortalData } from "@/features/orders";
import {
  addPortalGuestAction,
  archivePortalGuestAction,
  submitPortalDecisionAction,
} from "./actions";
import styles from "./client-portal.module.css";

interface ClientPortalViewProps {
  data: ClientPortalData;
  token: string;
}

export function ClientPortalView({ data, token }: ClientPortalViewProps) {
  const [activeTab, setActiveTab] = useState<"review" | "guests" | "rsvp" | "wishes">("review");
  const [guestSearch, setGuestSearch] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPax, setNewGuestPax] = useState("1");
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const coupleTitle =
    data.order.groomBrideNames?.trim() ||
    `Pernikahan ${data.order.customerName}`;

  const eventDateStr = data.order.eventDate
    ? new Date(data.order.eventDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const orderProductionStatus = data.order.productionStatus;

  // Filter guests
  const filteredGuests = data.guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()),
  );

  // RSVP metrics
  const attendingRsvps = data.rsvps.filter((r) => r.response === "attending");
  const notAttendingRsvps = data.rsvps.filter((r) => r.response === "not_attending");
  const totalPaxAttending = attendingRsvps.reduce((acc, r) => acc + (r.partySize || 1), 0);

  // Wishes metrics
  const wishesList = data.rsvps.filter((r) => r.message && r.message.trim().length > 0);

  const getGuestShareUrl = (guestName: string) => {
    if (!data.shareableUrl) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${data.shareableUrl}?to=${encodeURIComponent(guestName)}`;
  };

  const handleCopyGuestLink = (guestName: string) => {
    const url = getGuestShareUrl(guestName);
    if (!url) return;
    navigator.clipboard.writeText(url);
    showToast(`Link undangan untuk "${guestName}" berhasil disalin!`);
  };

  const handleSendWa = (guestName: string) => {
    const url = getGuestShareUrl(guestName);
    if (!url) return;
    const text = `Halo ${guestName},\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk hadir di acara pernikahan kami.\n\nInformasi lengkap dan tautan undangan dapat dilihat di:\n${url}\n\nTerima kasih dan sampai jumpa! 🙏`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleApprove = () => {
    if (!confirm("Apakah Anda yakin ingin menyetujui desain dan data undangan ini?")) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("decision", "approve");
      const res = await submitPortalDecisionAction({ ok: false }, formData);
      if (res.ok) {
        showToast(res.message || "Undangan disetujui!");
      } else {
        alert(res.error || "Gagal menyetujui.");
      }
    });
  };

  const handleRequestRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      alert("Mohon isi catatan revisi spesifik.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("decision", "request_revision");
      formData.set("note", revisionNote);
      const res = await submitPortalDecisionAction({ ok: false }, formData);
      if (res.ok) {
        showToast(res.message || "Catatan revisi terkirim!");
        setShowRevisionForm(false);
      } else {
        alert(res.error || "Gagal mengirim revisi.");
      }
    });
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("name", newGuestName);
      formData.set("maxParty", newGuestPax || "1");
      const res = await addPortalGuestAction({ ok: false }, formData);
      if (res.ok) {
        showToast(res.message || "Tamu berhasil ditambahkan.");
        setNewGuestName("");
        setNewGuestPax("1");
      } else {
        alert(res.error || "Gagal menambah tamu.");
      }
    });
  };

  const handleDeleteGuest = (guestId: string, name: string) => {
    if (!confirm(`Hapus "${name}" dari daftar tamu?`)) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("guestId", guestId);
      const res = await archivePortalGuestAction({ ok: false }, formData);
      if (res.ok) {
        showToast(`Tamu "${name}" dihapus.`);
      } else {
        alert(res.error || "Gagal menghapus tamu.");
      }
    });
  };

  return (
    <div className={styles.portalContainer}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#23180d",
            color: "#faf6f0",
            padding: "0.75rem 1.25rem",
            borderRadius: "9999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Hero Header */}
      <header className={styles.heroHeader}>
        <div className={styles.heroContent}>
          <div className={styles.heroTopRow}>
            <span className={styles.portalBadge}>Portal Klien Mandiri</span>
            {orderProductionStatus === "client_review" && (
              <span className={`${styles.portalBadge} ${styles.statusReview}`}>
                ⏳ Menunggu Persetujuan Anda
              </span>
            )}
            {orderProductionStatus === "approved" && (
              <span className={`${styles.portalBadge} ${styles.statusApproved}`}>
                ✓ Disetujui
              </span>
            )}
            {orderProductionStatus === "published" && (
              <span className={`${styles.portalBadge} ${styles.statusPublished}`}>
                🌐 Undangan Terbit
              </span>
            )}
            {orderProductionStatus === "revision_requested" && (
              <span className={`${styles.portalBadge} ${styles.statusRevision}`}>
                ✏️ Dalam Proses Revisi
              </span>
            )}
          </div>

          <h1 className={styles.heroTitle}>{coupleTitle}</h1>
          <p className={styles.heroSubtitle}>
            {eventDateStr ? `Tanggal Acara: ${eventDateStr}` : "Tanggal Acara: Menyesuaikan"}
            {data.templateTitle ? ` • Tema: ${data.templateTitle}` : ""}
          </p>
        </div>
      </header>

      {/* Sticky Tab Navigation */}
      <nav className={styles.tabsWrapper}>
        <div className={styles.tabsList}>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`${styles.tabBtn} ${activeTab === "review" ? styles.tabBtnActive : ""}`}
          >
            <span>👁️</span>
            <span>Review Undangan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guests")}
            className={`${styles.tabBtn} ${activeTab === "guests" ? styles.tabBtnActive : ""}`}
          >
            <span>👥</span>
            <span>Daftar Tamu</span>
            <span className={styles.tabCount}>{data.guests.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rsvp")}
            className={`${styles.tabBtn} ${activeTab === "rsvp" ? styles.tabBtnActive : ""}`}
          >
            <span>📊</span>
            <span>Konfirmasi RSVP</span>
            <span className={styles.tabCount}>{data.rsvps.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wishes")}
            className={`${styles.tabBtn} ${activeTab === "wishes" ? styles.tabBtnActive : ""}`}
          >
            <span>💌</span>
            <span>Buku Doa / Ucapan</span>
            <span className={styles.tabCount}>{wishesList.length}</span>
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <main className={styles.mainContent}>
        {/* --- TAB 1: REVIEW UNDANGAN --- */}
        {activeTab === "review" && (
          <div>
            {orderProductionStatus === "client_review" && (
              <div className={styles.reviewNotice}>
                <strong>Mohon Periksa Undangan Anda:</strong>
                <p style={{ margin: "0.25rem 0 0" }}>
                  Periksa nama mempelai, gelar, tanggal, jam akad/resepsi, dan peta lokasi di bawah.
                  Jika sudah sempurna, klik <strong>&ldquo;Setujui Undangan&rdquo;</strong>. Jika ada yang ingin diperbaiki,
                  klik <strong>&ldquo;Ajukan Catatan Revisi&rdquo;</strong>.
                </p>
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Pratinjau Undangan Langsung</h2>
                  <p className={styles.cardDesc}>Tampilan nyata undangan Anda di layar smartphone</p>
                </div>
                {data.shareableUrl && (
                  <a
                    href={data.shareableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnSecondary}
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
                  >
                    Buka Halaman Penuh ↗
                  </a>
                )}
              </div>

              <div className={styles.previewBox}>
                <div className={styles.mockupViewport}>
                  {data.previewUrl ? (
                    <iframe
                      src={data.previewUrl}
                      title="Pratinjau Undangan"
                      className={styles.mockupIframe}
                    />
                  ) : (
                    <div className={styles.emptyBox}>
                      Pratinjau desain sedang dipersiapkan oleh tim produksi.
                    </div>
                  )}
                </div>

                {orderProductionStatus === "client_review" && (
                  <div className={styles.reviewActions}>
                    {!showRevisionForm ? (
                      <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={isPending}
                          className={`${styles.btnPrimary} ${styles.btnApprove}`}
                          style={{ flex: 1 }}
                        >
                          ✓ Setujui Undangan
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRevisionForm(true)}
                          disabled={isPending}
                          className={`${styles.btnSecondary} ${styles.btnRevision}`}
                          style={{ flex: 1 }}
                        >
                          ✏️ Ajukan Catatan Revisi
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestRevision} style={{ width: "100%" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            marginBottom: "0.5rem",
                          }}
                        >
                          Tuliskan catatan perbaikan secara spesifik:
                        </label>
                        <textarea
                          rows={3}
                          className={styles.textarea}
                          placeholder="Contoh: Tolong ejaan nama orang tua mempelai pria diperbaiki menjadi H. Sulaiman, M.Pd"
                          value={revisionNote}
                          onChange={(e) => setRevisionNote(e.target.value)}
                          required
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                          <button
                            type="submit"
                            disabled={isPending}
                            className={styles.btnPrimary}
                            style={{ flex: 1 }}
                          >
                            Kirim Catatan Revisi
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRevisionForm(false)}
                            className={styles.btnSecondary}
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: DAFTAR TAMU --- */}
        {activeTab === "guests" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Manajemen Daftar Tamu</h2>
                <p className={styles.cardDesc}>
                  Tambahkan nama tamu untuk membuat link undangan personal dan bagikan via WhatsApp
                </p>
              </div>
            </div>

            {/* Input Tambah Tamu */}
            <form onSubmit={handleAddGuest} className={styles.guestInputRow}>
              <input
                type="text"
                placeholder="Nama Tamu (misal: Bpk. Bambang & Keluarga)"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="number"
                min="1"
                max="20"
                placeholder="Pax"
                value={newGuestPax}
                onChange={(e) => setNewGuestPax(e.target.value)}
                className={styles.inputPax}
                title="Jumlah orang (pax)"
              />
              <button
                type="submit"
                disabled={isPending}
                className={styles.btnPrimary}
                style={{ padding: "0.65rem 1.25rem", fontSize: "0.85rem" }}
              >
                + Tambah Tamu
              </button>
            </form>

            {/* Filter Search */}
            {data.guests.length > 3 && (
              <div style={{ marginBottom: "1rem" }}>
                <input
                  type="search"
                  placeholder="Cari nama tamu…"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className={styles.input}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
            )}

            {/* List Tamu */}
            {filteredGuests.length === 0 ? (
              <div className={styles.emptyBox}>
                {data.guests.length === 0
                  ? "Belum ada tamu yang ditambahkan. Masukkan nama tamu di atas untuk mulai membagikan undangan."
                  : "Tidak ditemukan tamu dengan nama tersebut."}
              </div>
            ) : (
              <div className={styles.guestList}>
                {filteredGuests.map((g) => (
                  <div key={g.id} className={styles.guestItem}>
                    <div className={styles.guestInfo}>
                      <span className={styles.guestName}>{g.name}</span>
                      <span className={styles.guestSubtext}>
                        Maks. {g.maxParty} orang (pax)
                      </span>
                    </div>

                    <div className={styles.guestActions}>
                      <button
                        type="button"
                        onClick={() => handleCopyGuestLink(g.name)}
                        className={styles.btnSecondary}
                        style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
                      >
                        📋 Salin Link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWa(g.name)}
                        className={styles.btnCopyWa}
                      >
                        <span>💬</span>
                        <span>Kirim WA</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGuest(g.id, g.name)}
                        className={styles.btnDeleteGuest}
                        title="Hapus tamu"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: KONFIRMASI RSVP --- */}
        {activeTab === "rsvp" && (
          <div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{data.rsvps.length}</div>
                <div className={styles.statLabel}>Total Konfirmasi</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber} style={{ color: "#059669" }}>
                  {attendingRsvps.length}
                </div>
                <div className={styles.statLabel}>Hadir</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber} style={{ color: "#dc2626" }}>
                  {notAttendingRsvps.length}
                </div>
                <div className={styles.statLabel}>Berhalangan</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber} style={{ color: "#7c3aed" }}>
                  {totalPaxAttending}
                </div>
                <div className={styles.statLabel}>Total Orang (Pax)</div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Daftar Respon Tamu</h2>
              </div>

              {data.rsvps.length === 0 ? (
                <div className={styles.emptyBox}>
                  Belum ada tamu yang mengisi konfirmasi kehadiran (RSVP).
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {data.rsvps.map((r) => (
                    <div key={r.id} className={styles.wishCard}>
                      <div className={styles.wishHeader}>
                        <span className={styles.wishAuthor}>{r.name}</span>
                        <span
                          className={styles.portalBadge}
                          style={{
                            backgroundColor: r.response === "attending" ? "#ecfdf5" : "#fef2f2",
                            color: r.response === "attending" ? "#065f46" : "#dc2626",
                            borderColor: r.response === "attending" ? "#a7f3d0" : "#fecdd3",
                          }}
                        >
                          {r.response === "attending"
                            ? `Hadir (${r.partySize} orang)`
                            : "Berhalangan"}
                        </span>
                      </div>
                      {r.message && <p className={styles.wishMessage}>&ldquo;{r.message}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: BUKU DOA & UCAPAN --- */}
        {activeTab === "wishes" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Buku Doa & Ucapan Restu</h2>
                <p className={styles.cardDesc}>Pesan dan doa restu hangat dari para tamu undangan</p>
              </div>
            </div>

            {wishesList.length === 0 ? (
              <div className={styles.emptyBox}>
                Belum ada ucapan dan doa yang dikirimkan oleh tamu undangan.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {wishesList.map((w) => (
                  <div key={w.id} className={styles.wishCard}>
                    <div className={styles.wishHeader}>
                      <span className={styles.wishAuthor}>{w.name}</span>
                      <span className={styles.wishDate}>
                        {new Date(w.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className={styles.wishMessage}>&ldquo;{w.message}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
